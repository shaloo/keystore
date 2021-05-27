import { generateJsonRPCObject, post, thresholdSame, afterThreshold } from "./helper"
import { BigNumber, kCombinations, lagrangeInterpolation } from './ssrHelper'
import { decrypt, generatePrivate, getPublic } from "eccrypto";
import { keccak256, toChecksumAddress } from "web3-utils"
import { ec as EC } from 'elliptic'
const { BN } = require("bn.js");

const ips = ["13.233.115.178", "13.232.119.133", "13.233.115.10", "65.2.153.188", "65.0.87.110", "15.206.194.32"]
const nodes: string[] = ips.map(ip => `http://${ip}:8000/rpc`);
const indexes = [1, 2, 3, 4, 5, 6,]

const ec = new EC('secp256k1')

interface PublicKey {
  X: string;
  Y: string;
}

const assignKey = async (verifier: string, id: string) => {
  try {
    const requestObj = generateJsonRPCObject("KeyAssign", {
      verifier,
      verifier_id: id,
    })
    const assignKeyResult = await post(nodes[0], requestObj)
    return assignKeyResult
  } catch (e) {
    console.log({ e })
    return Promise.reject("Error during key assignment")
  }
}

const getPublicKey = async (verifier: string, id: string) => {
  try {
    const requestObj = generateJsonRPCObject("VerifierLookupRequest", {
      verifier,
      verifier_id: id,
    });
    const data = await post(nodes[0], requestObj)
    console.log({ data });
    if (data.ok) {
      if (data.response.error) {
        await assignKey(verifier, id)
        return getPublicKey(verifier, id);
      } else {
        const { pub_key_X: X, pub_key_Y: Y } = data.response.result.keys[0];
        return { X, Y };
      }
    }
  } catch (error) {
    console.log({ error })
    return Promise.reject("Error during key assignment")
  }
}

const getPrivateKey = async ({ id, verifier, idToken }: { id: string, idToken: string, verifier: string }) => {
  try {
    if (!idToken || !id || !verifier) {
      throw new Error("Missing parameters!")
    }
    await getPublicKey(verifier, id);
    const key = generatePrivate();
    const [publicKey, tokenCommitment] = [getPublicKeyFromPrivateKey(key), keccak256(idToken)];
    const commitments = await createShareCommitments({ verifier, publicKey, tokenCommitment });
    const derivedPk = await getPrivateKeyFromShares({ id, key, idToken, commitments })
    return derivedPk;
  } catch (e) {
    console.log({ e })
    return Promise.reject(e.message)
  }
}


const createShareCommitmentRequest = async (node: string, body: any): Promise<CommitmentResponse> => {
  const { response }: { response: CommitmentResponse } = await post(
    node,
    body
  )
  if (response.error) {
    throw new Error(response.error.data)
  } else {
    return response;
  }
}
interface ShareCommitmentsParams {
  verifier: string;
  publicKey: PublicKey;
  tokenCommitment: string;
}

const createShareCommitments = async ({ verifier, publicKey, tokenCommitment }: ShareCommitmentsParams) => {
  try {
    const body = generateJsonRPCObject('CommitmentRequest', {
      messageprefix: 'mug00',
      tokencommitment: tokenCommitment.slice(2),
      temppubx: publicKey.X,
      temppuby: publicKey.Y,
      verifieridentifier: verifier,
    });
    const promises = [];
    for (let i = 0; i < nodes.length; i++) {
      const requestPromise = createShareCommitmentRequest(nodes[i], body)
      promises.push(requestPromise)
    }
    const responsesArr = await Promise.all(promises);
    if (responsesArr.length >= ~~(nodes.length / 4) * 3 + 1) {
      return Promise.resolve(responsesArr)
    } else {
      console.log("Did not receive correct shares?")
    }
  } catch (e) {
    console.log({ e })
    return Promise.reject(e)
  }
}

interface CreateShareRequestParams {
  commitments: any;
  idToken: string;
  key: Buffer;
  id: string;
}

const createShareRequest = async ({ node, id, idToken, nodeSigs }): Promise<ShareResponse> => {
  const { response }: { response: ShareResponse } = await post(
    node,
    generateJsonRPCObject('ShareRequest', {
      encrypted: 'yes',
      item: [{ verifier_id: id, idtoken: idToken, nodesignatures: nodeSigs, verifieridentifier: "google" }],
    })
  )
  if (response.error) {
    console.log({ response })
    throw new Error(response.error.data)
  } else {
    return response;
  }
}

interface ShareResponse {
  result: {
    keys: Array<KeyItem>
  };
  error?: ResponseError;
}

interface ResponseError {
  code: number;
  message: string;
  data: string;

}

interface CommitmentResponse {
  result: {
    signature: string;
    data: string;
    nodepubx: string;
    nodepuby: string;
  };
  error?: ResponseError;
}
interface KeyItem {
  index: string;
  pub_key: ThresholdPublicKey;
  verifiers: any;
  share: string;
  metadata: EncryptionMetadata
}

interface EncryptionMetadata {
  mac: string;
  mode: string;
  iv: string;
  ephemPublicKey: string;
}

const decryptShare = (shareResponse: ShareResponse, key: Buffer) => {
  if (shareResponse.result.keys[0].metadata) {
    const { iv, mac, mode, ephemPublicKey } = shareResponse.result.keys[0].metadata;
    const { share } = shareResponse.result.keys[0];
    const metadata = {
      ephemPublicKey: Buffer.from(ephemPublicKey, 'hex'),
      iv: Buffer.from(iv, 'hex'),
      mac: Buffer.from(mac, 'hex'),
      mode: Buffer.from(mode, 'hex'),
      ciphertext: Buffer.from(atob(share).padStart(64, '0'), 'hex')
    };
    return decrypt(key, metadata).catch((err) => console.debug('share decryption', err))
  } else {
    return Promise.resolve(Buffer.from(shareResponse.result.keys[0].share.padStart(64, '0'), 'hex'))
  }
}

interface GetPrivateKeyResponse {
  address: string;
  privateKey: string;
}
const getPrivateKeyFromShares = async ({ id, key, idToken, commitments }: CreateShareRequestParams) => {
  try {
    const nodeSigs = [];
    const promises = []
    for (const c of commitments) {
      nodeSigs.push(c.result)
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const p = createShareRequest({ node, idToken, id, nodeSigs });
      promises.push(p)
    }
    const thresholdCount = ~~(nodes.length / 2) + 1
    return afterThreshold<GetPrivateKeyResponse, ShareResponse>(promises, thresholdCount, async (shareResponses: Array<ShareResponse>) => {
      const completedRequests = shareResponses.filter((x) => x)
      console.log({ shareResponses })
      const thresholdPublicKey = thresholdSame<ThresholdPublicKey>(
        shareResponses.map((x) => x && x.result && x.result.keys[0].pub_key),
        ~~(nodes.length / 2) + 1
      )
      console.log({ thresholdPublicKey });
      if (completedRequests.length >= ~~(nodes.length / 2) + 1 && thresholdPublicKey) {
        const sharePromises = []
        const nodeIndex = []
        for (let i = 0; i < shareResponses.length; i += 1) {
          if (shareResponses[i] && shareResponses[i].result && shareResponses[i].result.keys && shareResponses[i].result.keys.length > 0) {
            shareResponses[i].result.keys.sort((a, b) => new BN(a.index, 16).cmp(new BN(b.index, 16)))
            sharePromises.push(decryptShare(shareResponses[i], key))
          } else {
            sharePromises.push(Promise.resolve(undefined))
          }
          nodeIndex.push(new BN(indexes[i], 16))
        }
        const sharesResolved = await Promise.all(sharePromises)

        const decryptedShares = sharesResolved.reduce((acc, curr, index) => {
          if (curr) acc.push({ index: nodeIndex[index], value: new BN(curr) })
          return acc
        }, [])

        const allCombis = kCombinations(decryptedShares.length, ~~(nodes.length / 2) + 1)
        let privateKey
        for (let j = 0; j < allCombis.length; j += 1) {
          const currentCombi = allCombis[j]
          const currentCombiShares = decryptedShares.filter((v, index) => currentCombi.includes(index))
          const shares = currentCombiShares.map((x) => x.value)
          const indices = currentCombiShares.map((x) => x.index)
          const derivedPrivateKey = lagrangeInterpolation(shares, indices)
          const publicKey = getPublicKeyFromPrivateKey(derivedPrivateKey);
          const isVerified = verifyPubKeyAgainstThresholdPubKey(publicKey, thresholdPublicKey)
          if (isVerified) {
            privateKey = derivedPrivateKey
            break
          }
        }
        if (privateKey === undefined) {
          throw new Error('could not derive private key')
        }

        privateKey = privateKey.umod(ec.curve.n);
        const address = generateAddressFromPrivateKey(privateKey);
        console.log({ pk: privateKey.toString('hex', 64) })

        return {
          address,
          privateKey: privateKey.toString('hex', 64),
        }
      }
      throw new Error('Not yet!')
    })
  } catch (error) {
    console.log({ error })
  }
}

interface ThresholdPublicKey {
  pub_x: string;
  pub_y: string;
}

const verifyPubKeyAgainstThresholdPubKey = (publicKey: PublicKey, thresholdPublicKey: ThresholdPublicKey): boolean => {
  const thresholdX = new BN(thresholdPublicKey.pub_x, 10)
  const thresholdY = new BN(thresholdPublicKey.pub_y, 10)
  return new BN(publicKey.X, 16).cmp(thresholdX) === 0 &&
    new BN(publicKey.Y, 16).cmp(thresholdY) === 0
}

const getPublicKeyFromPrivateKey = (privateKey: BigNumber | Buffer): PublicKey => {
  let buffer = privateKey;
  if (!(buffer instanceof Buffer)) {
    buffer = Buffer.from(privateKey.toString(16, 64), 'hex')
  }
  const decryptedPubKey = getPublic(buffer).toString('hex')
  const X = decryptedPubKey.slice(2, 66)
  const Y = decryptedPubKey.slice(66)
  return {
    X,
    Y
  }

}

function generateAddressFromPrivateKey(pk: string) {
  const key = ec.keyFromPrivate(pk, 'hex')
  const publicKey = key.getPublic().encode('hex').slice(2)
  const ethAddressLower = `0x${keccak256(publicKey).slice(64 - 38)}`
  return toChecksumAddress(ethAddressLower)
}

export default {
  assignKey,
  getPrivateKey,
  getPublicKey
}



