## Introduction

Base Library to make calls to Arcana DKG network.

The network assumes that n/4 of nodes may be malicious, and n/2 + 1 of the nodes are required for key reconstruction. With these assumption, all fetch share calls are checked for consistency while enabling early exit on best case scenario where first n/2 + 1 responses are from honest nodes.

**Exposed API:**
- getPublicKey
- getPrivateKey


## Usage

Add arcana_dkg.js to your project

```html
<script src="../../dist_bundle/arcana_dkg.js"></script>
```

```js
const { getPublicKey, getPrivateKey } = window.arcana_dkg;
```

**Google**
```js
const verifier = "google"
const id = "abc@google.com"
const publicKey = await getPublicKey(verifier, id)

// Get ID token from google, see examples/google

const privateKey = await getPrivateKey({
	id,
	verifier,
	idToken
});
```

**Reddit**
```js
const verifier = "reddit"
const id = "/u/username"
const publicKey = await getPublicKey(verifier, id)

// Get token from reddit, see examples/reddit

const privateKey = await getPrivateKey({
	id,
	verifier,
	idToken
});
```

**Twitch**
```js
const verifier = "twitch"
const id = "abc@google.com"
const publicKey = await getPublicKey(verifier, id)

// Get token from twitch, see examples/twitch

const privateKey = await getPrivateKey({
	id,
	verifier,
	idToken
});
```

**Discord**
```js
const verifier = "discord"
const id = "1123532531311"
const publicKey = await getPublicKey(verifier, id)

// Get ID token from discord, see examples/discord

const privateKey = await getPrivateKey({
	id,
	verifier,
	idToken
});
```
