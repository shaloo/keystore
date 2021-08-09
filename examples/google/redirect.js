const url = window.location;

const params = new URLSearchParams(url.hash.substr(1));
const accessToken = params.get('access_token');
const idToken = params.get('id_token');

console.log({ idToken, accessToken });

const tokenElement = document.getElementById("token");
const { getPrivateKey } = window.arcana_dkg.default;

tokenElement.innerText = accessToken;

const getId = async () => {
    try {
        const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if(res.status < 400) {
            const { email, name, id, picture: profileImage} = await res.json();
            return { email, name, id, profileImage };
        }
    } catch (error) {
        console.log({ error })
    }
}

const getKey = async () => {
    try {
        const userData = await getId();
        const privateKey = await getPrivateKey({
            id: userData.email,
            verifier: "google",
            idToken,
        });
        console.log({ privateKey })
    } catch (error) {
        console.log({ error });
    }
}

getKey();