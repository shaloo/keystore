const url = window.location;

const params = new URLSearchParams(url.hash.substr(1));
const accessToken = params.get('access_token');
const idToken = params.get('id_token');

console.log({ idToken, accessToken });

const tokenElement = document.getElementById('token');
const { KeyReconstructor } = window.arcana.keystore;
tokenElement.innerText = accessToken;

const getId = async () => {
  try {
    const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.status < 400) {
      const { email, name, id, picture: profileImage } = await res.json();
      return { email, name, id, profileImage };
    }
  } catch (error) {
    console.log({ error });
  }
};

const getKey = async () => {
  try {
    const userData = await getId();
    const nodeListFetcher = {
      getNodes: async () => {
        return {
          nodes: [8080, 8081, 8082, 8083, 8084, 8085].map(
            (p) => `http://localhost:${p}/rpc`
          ),
          indexes: [6, 2, 4, 1, 3, 5],
        };
      },
    };
    const kms = new KeyReconstructor({
      appID: '0x73A15a259d1bB5ACC23319CCE876a976a278bE82',
      network: 'test',
    });
    const privateKey = await kms.getPrivateKey({
      id: 'makyl@newfang.io',
      verifier: 'google',
      idToken,
    });
    console.log({ privateKey });
  } catch (error) {
    console.log({ error });
  }
};

getKey();
