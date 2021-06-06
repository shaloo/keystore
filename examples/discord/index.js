const a = document.getElementById("login")

function getUrl() {
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.append("client_id", "850208521937092618")
    url.searchParams.append("redirect_uri", "http://localhost:8086/examples/discord/redirect")
    url.searchParams.append("state", "asdasd")
    url.searchParams.append("scope", "email")
    url.searchParams.append("response_type", "token")
    return url.toString()
}
a.href = getUrl();