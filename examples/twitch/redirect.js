
const url = window.location;
const id_token = new URLSearchParams(url.hash.substr(1)).get('access_token');

console.log({ id_token, window })
const tokenElement = document.getElementById("token");

tokenElement.innerText = id_token;

const { getPrivateKey } = window.arcana_dkg.default;

const getUserInfo = async (accessToken) => {
    try {
        const res = await fetch("https://api.twitch.tv/helix/users", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Client-ID": "f0779afn8hwttvks1acwq1q2a09o5x",
            }
        });
        if(res.status < 400) {
            const { data } = await res.json();
            const { id, email, profile_image_url, display_name } = data[0];
            return { 
                id,
                email,
                profileImage: profile_image_url,
                name: display_name
            }
        } else {
            const text = await res.text();
            console.log({ text });
        }
    } catch (error) {
        console.log({ error })
    }
}

// getUserInfo(id_token)
const getKey = async () => {
    try {
        const userInfo = await getUserInfo(id_token);
        console.log({ userInfo })
        const { id, email } = userInfo;
        const privateKey = await getPrivateKey({
            id: email,
            verifier: "twitch",
            idToken: id_token,
        });
        console.log({ privateKey })
    } catch (error) {
        console.log({ error });
    }
}

getKey();
//Do login, register here