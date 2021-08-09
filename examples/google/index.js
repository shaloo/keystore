const a = document.getElementById("login")

function getUrl() {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", "513082799772-5f9djcvtjgqvlngr9hndmnm0r372qn89.apps.googleusercontent.com")
    url.searchParams.append("redirect_uri", "http://localhost:8086/examples/google/redirect")
    url.searchParams.append("response_type", "token id_token")
    url.searchParams.append("scope", "profile email openid")
    url.searchParams.append("prompt", "consent select_account")
    url.searchParams.append("nonce", "a")
    return url.toString()
}

a.href = getUrl();