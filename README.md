## Introduction

Base Library to make calls to Arcana DKG network.

The network assumes that n/4 of nodes may be malicious, and n/2 + 1 of the nodes are required for key reconstruction. With these assumption, all fetch share calls are checked for consistency while enabling early exit on best case scenario where first n/2 + 1 responses are from honest nodes.

## Installation

### Using npm/yarn


```shell
npm install -S @arcana-tech/arcana_keystore
```
  
```js 
import { KeyReconstructor } from '@arcana-tech/arcana_keystore';
```

### Building using source

```sh 
node helpers/build.js
```

Add `arcana_keystore.js` to your project

```html
<script src="/path/to/arcana_keystore.js"></script>
```

```js
const { KeyReconstructor } = window.arcana_keystore;
```

## Usage

### Initialization
```js
const appID = "0x..." // Get this from arcana dashboard

const keystore = new KeyReconstructor({ appID, network: 'testnet' })
```

### Methods

```js
const verifier = "google" // twitter, github, twitch, discord, reddit
const id = "abc@google.com" // See examples how to get user id for each verifier
const idToken = "..."

const publicKey = keystore.getPublicKey({ verifier, id });
const privateKey = keystore.getPrivateKey({ verifier, id, idToken })
```
