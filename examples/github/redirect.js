const url = window.location;

const params = new URLSearchParams(url.hash.substr(1));
const accessToken = params.get('access_token');
const idToken = params.get('id_token');

console.log({ idToken, accessToken });

const tokenElement = document.getElementById('token');
const KMS = window.arcana_kms.default;
console.log({ KMS });
tokenElement.innerText = accessToken;

const getId = async () => {
  try {
    const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.status < 400) {
      const profileData = await res.json();
      console.log({ profileData });
      return profileData;
    }
  } catch (error) {
    console.log({ error });
  }
};

const getKey = async () => {
  try {
    const userData = await getId();
    // const nodeListFetcher = {
    //   getNodesList: async () => {
    //     return {
    //       nodes: [8085, 8080, 8082, 8081, 8084, 8083].map(
    //         (p) => `http://localhost:${p}/rpc`
    //       ),
    //       indexes: [1, 2, 3, 4, 5, 6],
    //     };
    //   },
    // };
    // const kms = new KMS(
    //   '0xaAC5477207d650500B6a76a11b643398dFf607E5',
    //   nodeListFetcher
    // );
    // const privateKey = await kms.getPrivateKey({
    //   id: userData.email,
    //   verifier: 'google',
    //   idToken,
    // });
    // console.log({ privateKey });
  } catch (error) {
    console.log({ error });
  }
};

getKey();
