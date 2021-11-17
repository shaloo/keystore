import {
  decryptShare,
  createShareCommitments,
  createMultipleShareRequests,
  createShareRequest,
  getPublicKeyFromPrivateKey,
  getAddressFromPrivateKey,
  getDecryptedShareFromResponse,
  getCurrentCombinationShares,
  KeyReconstructor,
} from '../src/keyReconstructor';
import { FetchMock } from 'jest-fetch-mock';

import BN from 'bn.js';
import { Buffer } from 'buffer';

const fetchMock = fetch as FetchMock;

import { generateJsonRPCObject } from '../src/helper';
import {
  getSampleShareResponse,
  getSampleDecryptedShareParams,
  getNodeAndIndexes,
  getTestUnEncryptedKeys,
  getTestEncryptedKeys,
} from './testHelper';
import { freezeLogLevel, LOG_LEVEL, setLogLevel } from '../src/logger';
beforeEach(() => {
  fetchMock.resetMocks();
});

const pk = '360ef2f67ee762b881d9a6a764bc9fe84ff3f143394379061dba912974745ef0';
const sampleAddress = '0x4CA47C7097901C617063ad27cB2D70872652c342';
const samplePubKey = {
  X: 'e11cfa07f43121a5b4dac81e75736ebd34756b1482a2cf4016ed15e5f21f3df5',
  Y: 'c6b4fd80c47ecc236c42c6c85309a19ff35554bbf39a822f0aa768f5a61b19e2',
};
setLogLevel(LOG_LEVEL.NOLOGS);
freezeLogLevel();

describe('KMS', () => {
  const verifier = 'google';
  const verifierId = 'abc@gmail.com';
  const expectedResponse = {
    result: {
      keys: [
        {
          pub_key_Y: 'Y',
          pub_key_X: 'X',
        },
      ],
    },
  };
  const reqHeaders = {
    'Content-type': 'application/json',
  };
  it('should correctly fetch public key for an id', async () => {
    fetchMock.mockResponse(JSON.stringify(expectedResponse));

    const requestObj = generateJsonRPCObject('VerifierLookupRequest', {
      verifier,
      verifier_id: verifierId,
      app_id: 'abc',
    });
    const sampleNodesAndIndexes = getNodeAndIndexes();
    const nodeListFetcher = {
      getNodes: async () => {
        return sampleNodesAndIndexes;
      },
    };
    const kms = new KeyReconstructor({ appID: 'abc' }, nodeListFetcher);
    const r = await kms.getPublicKey({ verifier, id: verifierId });
    expect(r.X).toBe('X');
    expect(r.Y).toBe('Y');
    expect(fetch).toHaveBeenCalledWith(sampleNodesAndIndexes.nodes[0], {
      body: JSON.stringify(requestObj),
      headers: reqHeaders,
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should assign public key for an id if it doesnt exists', async () => {
    fetchMock.mockResponses(
      JSON.stringify({ error: 'Not found' }),
      JSON.stringify({ result: {} }),
      JSON.stringify(expectedResponse)
    );

    const assignRequest = generateJsonRPCObject('KeyAssign', {
      verifier,
      verifier_id: verifierId,
      app_id: 'abc',
    });
    const lookupRequest = generateJsonRPCObject('VerifierLookupRequest', {
      verifier,
      verifier_id: verifierId,
      app_id: 'abc',
    });
    const sampleNodesAndIndexes = getNodeAndIndexes();
    const nodeListFetcher = {
      getNodes: async () => {
        return sampleNodesAndIndexes;
      },
    };
    const kms = new KeyReconstructor({ appID: 'abc' }, nodeListFetcher);
    const r = await kms.getPublicKey({ verifier, id: verifierId });
    expect(fetch).toHaveBeenCalledWith(sampleNodesAndIndexes.nodes[0], {
      body: JSON.stringify(lookupRequest),
      headers: reqHeaders,
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledWith(sampleNodesAndIndexes.nodes[0], {
      body: JSON.stringify(assignRequest),
      headers: reqHeaders,
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledWith(sampleNodesAndIndexes.nodes[0], {
      body: JSON.stringify(lookupRequest),
      headers: reqHeaders,
      method: 'POST',
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(r.X).toBe('X');
    expect(r.Y).toBe('Y');
  });
});

describe('createShareRequest', () => {
  const node = 'nodeUrl';
  const id = 'abc@example.com';
  const idToken = 'some_id_token';
  const nodeSigs = ['a', 'b', 'c', 'd', 'e', 'f'];
  const verifier = 'google';
  const appID = 'sampleappID';
  const req = generateJsonRPCObject('ShareRequest', {
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
  });
  const expectedResponse = getSampleShareResponse(true);
  const reqHeaders = {
    'Content-type': 'application/json',
  };
  it('should send expected request', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(expectedResponse));

    const r = await createShareRequest({
      node,
      id,
      idToken,
      appID,
      nodeSigs,
      verifier,
    });
    expect(fetch).toHaveBeenCalledWith(node, {
      body: JSON.stringify(req),
      headers: reqHeaders,
      method: 'POST',
    });
    expect(r).toStrictEqual(expectedResponse);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe('createShareCommitments', () => {
  const tokenCommitment = '0xasanjankdjnksjandjansjkda';
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'];
  const verifier = 'google';
  const req = generateJsonRPCObject('CommitmentRequest', {
    messageprefix: 'arc00',
    tokencommitment: tokenCommitment.slice(2),
    temppubx: samplePubKey.X,
    temppuby: samplePubKey.Y,
    verifieridentifier: verifier,
  });
  const expectedResponse = {
    result: {
      signature: 'sig',
      data: 'data',
      nodepubx: 'pubx',
      nodepuby: 'puby',
    },
  };
  const reqHeaders = {
    'Content-type': 'application/json',
  };
  it('should send expected request', async () => {
    fetchMock.mockResponse(JSON.stringify(expectedResponse));

    const r = await createShareCommitments(
      {
        verifier,
        publicKey: samplePubKey,
        tokenCommitment,
      },
      nodes
    );
    nodes.forEach((n) => {
      expect(fetch).toHaveBeenCalledWith(n, {
        body: JSON.stringify(req),
        headers: reqHeaders,
        method: 'POST',
      });
    });
    expect(r).toStrictEqual(nodes.map((n) => expectedResponse));
    expect(fetch).toHaveBeenCalledTimes(nodes.length);
  });
});

describe('createMultipleShareRequests', () => {
  it('should create multiple promises for shareRequest', async () => {
    fetchMock.mockResponse(JSON.stringify({}));

    const r = createMultipleShareRequests(['a', 'b', 'c'], {
      verifier: 'google',
      id: 'abc@gmail.com',
      appID: 'sampleApp',
      idToken: '',
      commitments: [],
    });
    expect(r.length).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(r).toStrictEqual([
      Promise.resolve({}),
      Promise.resolve({}),
      Promise.resolve({}),
    ]);
  });
});

describe('decryptShare', () => {
  it('should return padded share on no encryption', async () => {
    const items = getTestUnEncryptedKeys();
    for (const item of items) {
      const nonDecryptedShare = await decryptShare(
        item,
        Buffer.from('unused_key')
      );
      expect(nonDecryptedShare).toStrictEqual(
        Buffer.from(item.share.padStart(64, '0'), 'hex')
      );
    }
  });

  it('should return decrypted share when metadata is present', async () => {
    const items = getTestEncryptedKeys();
    for (const item of items) {
      const key = Buffer.from(item.key, 'hex');
      const decryptedShare = await decryptShare(item.encryptedItem, key);
      expect(decryptedShare).toStrictEqual(
        Buffer.from(item.decryptedItem, 'hex')
      );
    }
  });
});

describe('getDecryptedShareFromResponse', () => {
  const pk = Buffer.from(
    '360ef2f67ee762b881d9a6a764bc9fe84ff3f143394379061dba912974745ef0',
    'hex'
  );
  const sampleShareResponse = getSampleShareResponse(false);
  it('should return correct non encrypted share from response', async () => {
    const decryptedShare = await getDecryptedShareFromResponse(
      [sampleShareResponse, { result: {} }],
      pk,
      [1]
    );
    expect(decryptedShare[0].index).toStrictEqual(new BN(1, 16));
    expect(decryptedShare[0].value.toString(16)).toStrictEqual('339');
  });
  it('should return correct encrypted share from response', async () => {
    // TODO: put correct values for encrypted share
    const decryptedShare = await getDecryptedShareFromResponse(
      [sampleShareResponse, { result: {} }],
      pk,
      [1]
    );
    expect(decryptedShare[0].index).toStrictEqual(new BN(1, 16));
    expect(decryptedShare[0].value.toString(16)).toStrictEqual('339');
  });
});

describe('getCurrentCombinationShares', () => {
  it('should return correct public key', () => {
    const share1 = getSampleDecryptedShareParams(1);
    const share2 = getSampleDecryptedShareParams(2);
    const sharesWith0 = getCurrentCombinationShares([share1, share2], [0]);
    expect(sharesWith0).toStrictEqual([share1]);
    const sharesWith01 = getCurrentCombinationShares([share1, share2], [0, 1]);
    expect(sharesWith01).toStrictEqual([share1, share2]);
  });
});

describe('getPublicKeyFromPrivateKey', () => {
  it('should return correct public key', () => {
    const pubKey = getPublicKeyFromPrivateKey(Buffer.from(pk, 'hex'));
    expect(pubKey).toStrictEqual(samplePubKey);
  });
});

describe('getAddressFromPrivateKey', () => {
  it('should return correct address', () => {
    const address = getAddressFromPrivateKey(pk);
    expect(address).toStrictEqual(sampleAddress);
  });
});
