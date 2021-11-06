import { Buffer } from 'buffer';
import {
  generateJsonRPCObject,
  post,
  thresholdSame,
  afterThreshold,
  ResultInterface,
  getSentryErrorReporter,
} from './helper';
import {
  BigNumber,
  getAllCombinations,
  lagrangeInterpolation,
} from './ssrHelper';
import { network } from './nodes';
import { decrypt, generatePrivate, getPublic } from 'eccrypto';
import { keccak256, toChecksumAddress } from 'web3-utils';
import { ec as EC } from 'elliptic';
import NodeList from './nodes';
import BN from 'bn.js';
import {
  Logger,
  getLogger,
  LOG_LEVEL,
  setLogLevel,
  setExceptionReporter,
} from './logger';
const ec = new EC('secp256k1');

interface NodeListFetcherResponse {
  nodes: string[];
  indexes: number[];
}

interface NodeListFetcher {
  getNodes: () => Promise<NodeListFetcherResponse>;
}

interface PublicKey {
  X: string;
  Y: string;
}

interface config {
  appID: string;
  network?: network;
}

export class KeyReconstructor {
  private nodeList: NodeListFetcher;
  private appID: string;
  private network: network;
  private logger: Logger;
  constructor(config: config, dkg?: NodeListFetcher) {
    this.appID = config.appID;
    this.network = config.network ? config.network : 'test';
    if (this.network === 'test') {
      setLogLevel(LOG_LEVEL.DEBUG);
      setExceptionReporter(getSentryErrorReporter());
    } else {
      setLogLevel(LOG_LEVEL.ERROR);
    }
    this.nodeList = dkg ? dkg : new NodeList(this.network);
    this.logger = getLogger('KeyReconstructor');
  }
  getPublicKey = async ({
    id,
    verifier,
  }: {
    verifier: string;
    id: string;
  }): Promise<PublicKey> => {
    try {
      const requestObj = generateJsonRPCObject('VerifierLookupRequest', {
        verifier,
        verifier_id: id,
        app_id: this.appID,
      });
      const { nodes } = await this.nodeList.getNodes();
      const data = await post(nodes[0], requestObj);
      this.logger.info('get_public_key', { data });
      if (data.ok) {
        if (data.response.error) {
          await this.assignKey(verifier, id);
          return this.getPublicKey({ verifier, id });
        } else {
          const { pub_key_X: X, pub_key_Y: Y } = data.response?.result?.keys[0];
          return { X, Y };
        }
      } else {
        return Promise.reject('Error during getting public key');
      }
    } catch (error) {
      this.logger.error('get_public_key', { error: error.toString() });
      return Promise.reject('Error during getting public key');
    }
  };

  getPrivateKey = async ({
    id,
    verifier,
    idToken,
  }: {
    id: string;
    idToken: string;
    verifier: string;
  }) => {
    try {
      if (!idToken || !id || !verifier) {
        throw new Error('Missing parameters!');
      }
      await this.getPublicKey({ verifier, id });
      const key = generatePrivate();
      const [publicKey, tokenCommitment] = [
        getPublicKeyFromPrivateKey(key),
        keccak256(idToken),
      ];
      this.logger.debug(`TempCreds`, {
        key: key.toString('hex'),
        publicKey,
      });
      const { nodes, indexes } = await this.nodeList.getNodes();
      const commitments = await createShareCommitments(
        {
          verifier,
          publicKey,
          tokenCommitment,
        },
        nodes
      );
      const derivedPk = await getPrivateKeyFromShares(
        {
          verifier,
          id,
          key,
          idToken,
          commitments,
          appID: this.appID,
        },
        { nodes, indexes }
      );
      return derivedPk;
    } catch (e) {
      this.logger.error('get_private_key', { e });
      return Promise.reject(e.message);
    }
  };

  private assignKey = async (verifier: string, id: string) => {
    try {
      const requestObj = generateJsonRPCObject('KeyAssign', {
        verifier,
        verifier_id: id,
        app_id: this.appID,
      });
      const { nodes } = await this.nodeList.getNodes();
      const assignKeyResult = await post(nodes[0], requestObj);
      if (!assignKeyResult?.ok) {
        this.logger.error('assign_key_result_error', {
          error: assignKeyResult.response,
        });
        return Promise.reject('Error during key assignment');
      }
      return assignKeyResult;
    } catch (e) {
      this.logger.error('assign_key_result_error', { e });
      return Promise.reject('Error during key assignment');
    }
  };
}

export const createShareCommitmentRequest = async (
  node: string,
  body: any,
  p: (url: string, body: any) => Promise<ResultInterface> = post
): Promise<CommitmentResponse> => {
  const { response }: { response: CommitmentResponse } = await post(node, body);
  if (response.error) {
    throw new Error(response.error.data);
  } else {
    return response;
  }
};
interface ShareCommitmentsParams {
  verifier: string;
  publicKey: PublicKey;
  tokenCommitment: string;
}

export const createShareCommitments = async (
  { verifier, publicKey, tokenCommitment }: ShareCommitmentsParams,
  nodes: string[]
) => {
  const logger = getLogger('CreateShareCommitments');
  try {
    const body = generateJsonRPCObject('CommitmentRequest', {
      messageprefix: 'arc00',
      tokencommitment: tokenCommitment.slice(2),
      temppubx: publicKey.X,
      temppuby: publicKey.Y,
      verifieridentifier: verifier,
    });
    const promises = [];
    for (let i = 0; i < nodes.length; i++) {
      const requestPromise = createShareCommitmentRequest(nodes[i], body);
      promises.push(requestPromise);
    }
    const responsesArr = await Promise.all(promises);
    if (responsesArr.length >= ~~(nodes.length / 4) * 3 + 1) {
      return Promise.resolve(responsesArr);
    } else {
      logger.error('did_not_receive_length_shares', {
        responses: responsesArr,
      });
      return Promise.reject(`did not receive correct shares`);
    }
  } catch (e) {
    logger.error('createShareCommitments', { e: e.message });
    return Promise.reject(e);
  }
};

interface KeyParam {
  key: Buffer;
}
interface CreateShareRequestParams {
  commitments: any;
  idToken: string;
  id: string;
  verifier: string;
  appID: string;
}

export const createShareRequest = async ({
  verifier,
  node,
  id,
  idToken,
  nodeSigs,
  appID,
}: {
  verifier: string;
  node: string;
  id: string;
  idToken: string;
  nodeSigs: string[];
  appID: string;
}): Promise<ShareResponse> => {
  const { response }: { response: ShareResponse } = await post(
    node,
    generateJsonRPCObject('ShareRequest', {
      encrypted: 'yes',
      item: [
        {
          verifier_id: id,
          idtoken: idToken,
          nodesignatures: nodeSigs,
          verifieridentifier: verifier,
          app_id: appID,
        },
      ],
    })
  );
  if (response.error) {
    const logger = getLogger('CreateShareRequest');
    logger.error('dkg_error', { response });
    return Promise.reject(response.error?.data || response.error?.message);
  } else {
    return response;
  }
};

interface ShareResponse {
  result: {
    keys?: Array<KeyItem>;
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
  verifiers?: any;
  share: string;
  metadata?: EncryptionMetadata;
}

interface EncryptionMetadata {
  mac: string;
  mode: string;
  iv: string;
  ephemPublicKey: string;
}

export const decryptShare = (
  keyItem: KeyItem,
  key: Buffer
): Promise<Buffer> => {
  if (keyItem.metadata) {
    const { iv, mac, mode, ephemPublicKey } = keyItem.metadata;
    const { share } = keyItem;
    const fromHex = (h: string) => Buffer.from(h, 'hex');
    const metadata = {
      ephemPublicKey: fromHex(ephemPublicKey),
      iv: fromHex(iv),
      mac: fromHex(mac),
      mode: fromHex(mode),
      ciphertext: fromHex(atob(share).padStart(64, '0')),
    };
    return decrypt(key, metadata);
  } else {
    return Promise.resolve(Buffer.from(keyItem.share.padStart(64, '0'), 'hex'));
  }
};

interface GetPrivateKeyResponse {
  address: string;
  privateKey: string;
  publicKey?: string;
}

interface HandleThresholdResponseParams {
  thresholdCount: number;
  key: Buffer;
  indexes: number[];
}

interface DecryptedShareParams {
  index: BN;
  value: BN;
}

const getPrivateKeyFromShares = async (
  params: CreateShareRequestParams & KeyParam,
  nodeInfo: NodeListFetcherResponse
) => {
  try {
    const { nodes, indexes } = nodeInfo;
    const thresholdCount = ~~(nodes.length / 2) + 1;
    const promises = createMultipleShareRequests(nodes, params);
    return handleThresholdResponse(promises, {
      key: params.key,
      thresholdCount,
      indexes,
    });
  } catch (error) {
    const logger = getLogger('GetPrivateKeyFromShares');
    logger.error('get_private_key_from_shares', { error });
    return null;
  }
};

export const createMultipleShareRequests = (
  nodes: string[],
  createShareRequestParams: CreateShareRequestParams
): Promise<ShareResponse>[] => {
  const { commitments, ...params } = createShareRequestParams;
  const nodeSigs = [];
  const promises: Promise<ShareResponse>[] = [];
  for (const c of commitments) {
    nodeSigs.push(c.result);
  }
  for (const node of nodes) {
    const p = createShareRequest({
      ...params,
      node,
      nodeSigs,
    });
    promises.push(p);
  }
  return promises;
};

const handleThresholdResponse = (
  promises: Promise<ShareResponse>[],
  params: HandleThresholdResponseParams
) => {
  const { thresholdCount, indexes, key } = params;
  return afterThreshold<GetPrivateKeyResponse, ShareResponse>(
    promises,
    thresholdCount,
    async (shareResponses: Array<ShareResponse>) => {
      const logger = getLogger('HandleThresholdResponse');
      logger.info('Share responses', shareResponses);
      const completedRequests = shareResponses.filter((x) => x);
      const thresholdPublicKey = thresholdSame<ThresholdPublicKey>(
        shareResponses.map((x) => x?.result?.keys[0]?.pub_key),
        thresholdCount
      );
      if (completedRequests.length >= thresholdCount && thresholdPublicKey) {
        const decryptedShares = await getDecryptedShareFromResponse(
          shareResponses,
          key,
          indexes
        );
        const combinations = getAllCombinations(
          decryptedShares.length,
          thresholdCount
        );
        let privateKey: BigNumber;
        for (let j = 0; j < combinations.length; j += 1) {
          const selectedShares = getCurrentCombinationShares(
            decryptedShares,
            combinations[j]
          );
          const {
            privateKey: derivedPrivateKey,
            publicKey,
          } = deriveKeyForCurrentCombination(selectedShares);

          const isVerified = verifyPubKeyAgainstThresholdPubKey(
            publicKey,
            thresholdPublicKey
          );
          logger.info('Compare pub key to derived', { isVerified });
          if (isVerified) {
            privateKey = derivedPrivateKey;
            break;
          }
        }

        if (privateKey === undefined) {
          throw new Error('could not derive private key');
        }
        const publicKey = getPublicKeyFromPrivateKey(privateKey);
        return {
          address: getAddressFromPrivateKey(privateKey.toString('hex')),
          privateKey: privateKey.toString('hex', 64),
          publicKey: publicKey.X + publicKey.Y,
        };
      }
      throw new Error('Not yet!');
    }
  );
};

export const getDecryptedShareFromResponse = async (
  shareResponses: ShareResponse[],
  key: Buffer,
  indexes: number[]
): Promise<DecryptedShareParams[]> => {
  const sharePromises = [];
  const nodeIndex: BigNumber[] = [];
  for (let i = 0; i < shareResponses.length; i += 1) {
    if (shareResponses[i]?.result?.keys?.length > 0) {
      shareResponses[i].result.keys.sort((a, b) =>
        new BN(a.index, 16).cmp(new BN(b.index, 16))
      );
      sharePromises.push(decryptShare(shareResponses[i].result.keys[0], key));
    } else {
      sharePromises.push(Promise.resolve(undefined));
    }
    nodeIndex.push(new BN(indexes[i], 16));
  }
  const sharesResolved: Buffer[] = await Promise.all(sharePromises);
  const logger = getLogger('getDecryptedShareFromResponse');
  logger.info('Share responses', sharesResolved);
  const decryptedShares: DecryptedShareParams[] = sharesResolved.reduce(
    (acc, curr, index) => {
      if (curr) acc.push({ index: nodeIndex[index], value: new BN(curr) });
      return acc;
    },
    []
  );
  return decryptedShares;
};

export const getCurrentCombinationShares = (
  decryptedShares: DecryptedShareParams[],
  currentCombi: number[]
) => {
  const currentCombiShares = decryptedShares.filter((v, index) =>
    currentCombi.includes(index)
  );
  return currentCombiShares;
};

export const deriveKeyForCurrentCombination = (
  currentCombiShares: Array<DecryptedShareParams>
) => {
  const logger = getLogger('deriveKeyForCurrentCombination');
  const { shares, indices } = getSharesAndIndices(currentCombiShares);
  // logger.info('privateKey', { privateKey: privateKey.toString('hex') });
  const privateKey = lagrangeInterpolation(shares, indices);
  logger.debug('privateKey', { privateKey: privateKey.toString('hex') });
  const publicKey = getPublicKeyFromPrivateKey(privateKey);
  return { privateKey, publicKey };
};

const getSharesAndIndices = (
  s: DecryptedShareParams[]
): { shares: BN[]; indices: BN[] } => {
  const shares: BN[] = s.map((x) => x.value);
  const indices = s.map((x) => x.index);

  return { shares, indices };
};

interface ThresholdPublicKey {
  pub_x: string;
  pub_y: string;
}

export const verifyPubKeyAgainstThresholdPubKey = (
  publicKey: PublicKey,
  thresholdPublicKey: ThresholdPublicKey
): boolean => {
  const thresholdX = new BN(thresholdPublicKey.pub_x, 10);
  const thresholdY = new BN(thresholdPublicKey.pub_y, 10);
  return (
    new BN(publicKey.X, 16).cmp(thresholdX) === 0 &&
    new BN(publicKey.Y, 16).cmp(thresholdY) === 0
  );
};

export const getPublicKeyFromPrivateKey = (
  privateKey: BigNumber | Buffer
): PublicKey => {
  const logger = getLogger('getPublicKeyFromPrivateKey');
  logger.debug('privateKey', { privateKey: privateKey.toString('hex') });
  let buffer = privateKey;
  if (!(buffer instanceof Buffer)) {
    buffer = Buffer.from(privateKey.toString('hex'), 'hex');
  }
  const decryptedPubKey = getPublic(buffer).toString('hex');
  const X = decryptedPubKey.slice(2, 66);
  const Y = decryptedPubKey.slice(66);
  return {
    X,
    Y,
  };
};

export const getAddressFromPrivateKey = (pk: string) => {
  const key = ec.keyFromPrivate(pk, 'hex');
  const publicKey = key
    .getPublic()
    .encode('hex')
    .slice(2);
  const ethAddressLower = `0x${keccak256(publicKey).slice(64 - 38)}`;
  return toChecksumAddress(ethAddressLower);
};

export default KeyReconstructor;
