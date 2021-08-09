
const url = window.location;

const accessToken = new URLSearchParams(url.hash.substr(1)).get('access_token');
const state = new URLSearchParams(url.hash.substr(1)).get('state');

console.log({ accessToken, state  })
const tokenElement = document.getElementById("token");
const { getPrivateKey } = window.arcana_dkg.default;

tokenElement.innerText = accessToken;

let id;

const getId = async() => {
    try {
        const res = await fetch("https://oauth.reddit.com/api/v1/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log({ res })
        if(res.status < 400) {
            const data = await res.json();
            console.log({ data });
            id = data.name
        }
    } catch (error) {
        console.log({ error })
    }
}

const getKey = async () => {
    try {
        await getId();
        const privateKey = await getPrivateKey({
            id,
            verifier: "reddit",
            idToken: accessToken,
        });
        console.log({ privateKey })
    } catch (error) {
        console.log({ error });
    }
}

getKey()
//Do login, register here