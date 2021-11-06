const a = document.getElementById('login');

function getUrl() {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.append('client_id', '6b9678c150ab952b8172');
  url.searchParams.append(
    'redirect_uri',
    'http://localhost:8086/examples/github/redirect'
  );
  url.searchParams.append('scope', 'read:user user:email');
  url.searchParams.append('nonce', 'a');
  return url.toString();
}

a.href = getUrl();
