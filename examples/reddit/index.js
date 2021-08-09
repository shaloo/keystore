const a = document.getElementById("login")


function getUrl() {
    const url = new URL("https://www.reddit.com/api/v1/authorize");
    url.searchParams.append("client_id", "XqDPdItJRX6DEA")
    url.searchParams.append("redirect_uri", "http://localhost:8086/examples/reddit/redirect")
    url.searchParams.append("state", "asdasd")
    url.searchParams.append("response_type", "token")
    url.searchParams.append("scope", "identity")
    return url.toString()
}
a.href = getUrl();
