import BN from 'bn.js';

const sampleShareResponse = {
  result: {
    keys: [
      {
        index: '1',
        pub_key: {
          pub_x: 'x',
          pub_y: 'y',
        },
        verifiers: 'google',
        share: '339',
        metadata: {
          mac: 'mac',
          mode: 'mode',
          iv: 'iv',
          ephemPublicKey: 'ephemPublicKey',
        },
      },
    ],
  },
};

export const getSampleShareResponse = (withMeta: boolean = true) => {
  if (withMeta) {
    return sampleShareResponse;
  } else {
    let updatedShareResponse = { ...sampleShareResponse };
    delete updatedShareResponse.result.keys[0].metadata;
    return updatedShareResponse;
  }
};

export const getSampleDecryptedShareParams = (index: number) => {
  const decryptedShareParams = {
    index: new BN(1),
    value: new BN(Math.random() * 1000),
  };
  return decryptedShareParams;
};

const nodes = ['node1', 'node2', 'node3', 'node4', 'node5', 'node6'];
const indexes = [1, 2, 3, 4, 5, 6];
export const getNodeAndIndexes = () => {
  return { nodes, indexes };
};

const encryptedKeys = [
  {
    encryptedItem: {
      index: '0',
      pub_key: {
        pub_x:
          '23152960663419995888297196674861910857044576468435365288612927395837041871191',
        pub_y:
          '1650275583380291118396353226446610241430460723474528432821369668117163016960',
      },
      verifiers: { google: ['user@example.com'] },
      share:
        'NzkzOTZmYjBkNDgzNDA4MTZjY2ViNDNmYmU3NGM0NzBlYzRlMzQxMjcwYzEzMmUxNmMzZWQzNDE5Y2YyMmM1YTlmZDk4OWMwNWZhZDI2NmQ5MjM1NzYyMTZiYjk3ZmQy',
      metadata: {
        iv: 'b613b7e8b4d960b2054021ca5be5644a',
        ephemPublicKey:
          '040c799c4c9f4589b0e1ee6cf34e6b6b8f4c178d28f2c6710f89df3db3d78928e732ad4ebefabef88b4f1de3aaa20e7c3fcaad7acacd72bc591dd16d53bad40d0d',
        mac: 'dcffd2875a2d74e75dc110d549a2e334429efe6618249866ddd4223f23bf61c8',
        mode: 'AES256',
      },
    },
    decryptedItem:
      '39070a55d329f237cebc3e643bdfca519e03301589259342684b336c1fafd799',
    key: '21cdae82c0b69e072e50f2545fbdc838d00db7349104b73f57ee11087e3928ee',
  },
  {
    encryptedItem: {
      index: '0',
      pub_key: {
        pub_x:
          '23152960663419995888297196674861910857044576468435365288612927395837041871191',
        pub_y:
          '1650275583380291118396353226446610241430460723474528432821369668117163016960',
      },
      verifiers: { google: ['user@example.com'] },
      share:
        'YmJiMTMyMTQxNTRlYWQyMWQ0NzM5NGI2ZjJiZDg0Nzc1MDEwNTRiNGVmYmQyZmY2YzYzOGQ3N2FiOTIwZGJmYjg2NjhlMWEyNWU3ODk5ZDk1NzA3YTdhY2RmYzUxOWQ4',
      metadata: {
        iv: '04223f1e91fc67b66697ac198cf3f5db',
        ephemPublicKey:
          '04cb83e7cbeb202b5c8e5954c3a68d196edda2f925a4d2a7b59fdad576bc1cb5211f49e1f12df769af18cac02255aced5b9753a2cd7151675409ce2f3a7cb7ae87',
        mac: '74516658408c3327471e9291d7e69b72c2b7fa595f5fb230c08594d0dba05c29',
        mode: 'AES256',
      },
    },
    decryptedItem:
      '4d5a94c27eb832b156e316db3c11af26b40c3b9b50ef9889a05d371944bc6e49',
    key: '21cdae82c0b69e072e50f2545fbdc838d00db7349104b73f57ee11087e3928ee',
  },
];

export const getTestEncryptedKeys = () => {
  return encryptedKeys;
};

const decryptedKeys = [
  {
    index: '1',
    share: 'testShare',
    pub_key: {
      pub_x: 'string',
      pub_y: 'string',
    },
  },
];
export const getTestUnEncryptedKeys = () => {
  return decryptedKeys;
};
