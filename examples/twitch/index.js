const a = document.getElementById("login")
const claims = { "id_token": { "email": null, "email_verified": null },"userinfo": { "email": null, "email_verified": null }};

function getUrl() {
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.searchParams.append("client_id", "f0779afn8hwttvks1acwq1q2a09o5x")
    url.searchParams.append("redirect_uri", "http://localhost:8086/examples/twitch/redirect")
    url.searchParams.append("response_type", "token")
    url.searchParams.append("scope", "openid user:read:email")
    url.searchParams.append("claims", JSON.stringify(claims))
    return url.toString()
}
a.href = getUrl();
