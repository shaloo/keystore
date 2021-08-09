
const url = window.location;

const code = new URLSearchParams(url.hash.substr(1)).get('access_token');

console.log({ code  })
const tokenElement = document.getElementById("token");
const { getPrivateKey } = window.arcana_dkg.default;

tokenElement.innerText = code;

const getId = async () => {
    try {
        const res = await fetch("https://discordapp.com/api/oauth2/@me", {
            headers: {
                Authorization: `Bearer ${code}`
            }
        });
        if(res.status < 400) {
            const data = await res.json();
            console.log({ data })
            return { id: data.user.id };
        }
    } catch (error) {
        console.log({ error })
    }
}

const getKey = async () => {
    try {
        const { id } = await getId();
        const privateKey = await getPrivateKey({
            id,
            verifier: "discord",
            idToken: code,
        });
        console.log({ privateKey })
    } catch (error) {
        console.log({ error });
    }
}

getKey();
// doFetch()
//Do login, register here