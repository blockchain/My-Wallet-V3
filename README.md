# MyWallet

JavaScript Model for Blockchain.info wallet.

## Install

```sh
npm install
grunt build
```

## Tests

```sh
npm test
```

## Clean

Clean generated files:

```sh
grunt clean
```

Remove all installed dependencies:

```sh
rm -rf bower_components/ node_modules/
```

## Getting Started

Load `dist/my-wallet.js`.


Disable logout, if desired, for development work:
```javascript
MyWallet.disableLogout(true);

// Set an interval, since logout gets reactived by certain parts of the code
window.setInterval(function() { MyWallet.disableLogout(true); }, 60000);
```


My Wallet communicates about its state with user-defined event listeners. Setup a listener like so:
```javascript
function myListenerFun(eventName, data) {
    // Handle events
}

// Register listener function with MyWallet
MyWallet.addEventListener(myListenerFun);
```

Some events that we need to process:

| Event Name | Our Action |
| :--- | :--- |
| `did_multiaddr` | Populate wallet statistics on the UI |
| `hd_wallets_does_not_exist` | Create an HD wallet |
| `on_wallet_decrypt_finish` | Get wallet transaction history |


To build an HD wallet with an existing legacy wallet, we must initialize after receiving event notification from MyWallet.
```javascript
var passphrase = MyWallet.generateHDWalletPassphrase();

MyWallet.initializeHDWallet(passphrase, null, null, _successFun, _errorFun);
```


Load a wallet from the server, with no 2FA
```javascript
var guid = "my-wallet-guid-1234-bcde";
var pass = "wallet-password";
var twoFactorCode = null;

MyWallet.fetchWalletJSON(guid, null, null, pass, twoFactorCode, 
    successFun, need2FAfun, wrong2FAfun, otherErrorFun);

// Do stuff with the wallet
var LegacyAddresses = MyWallet.getLegacyActiveAddresses();
```

In order to fetch the wallet history, make a call to `get_history`:
```javascript
MyWallet.get_history(_successFun, _errorFun);
```

`get_history` will trigger the `did_multiaddr` event on completion, so the wallet stats and display can be updated.

## Debug / Developement

Include the following files instead of `my-wallet.js` for easier debugging:

* `src/shared.js`
* `src/blockchain-api.js`
* `src/blockchain-settings-api.js`
* `src/crypto-util-legacy.js`
* `src/wallet.js`
* `src/hd-wallet.js`
* `src/hd-account.js`
* `build/browserify.js`
* `build/bip39.js`
* `build/sjcl.js`
* `build/xregexp-all.js`
* `bower_components/jquery/dist/jquery.js`
* `bower_components/cryptojslib/rollups/sha256.js`
* `bower_components/cryptojslib/rollups/aes.js`
* `bower_components/cryptojslib/rollups/pbkdf2.js`
* `bower_components/cryptojslib/components/cipher-core.js`
* `bower_components/cryptojslib/components/pad-iso10126.js`

## Distribution

Run `GITHUB_USER=... GITHUB_PASSWORD=... grunt dist` to check all dependencies against `dependency-whitelist.json` and generate `my-wallet.min.js``.

## Adding a browserified dependency

1. npm install newpackage --save
2. Add the require in browserify-imports.js
3. npm install

### Whitelist dependencies

1. Add the tagged version and the commit hash to dependency-whitelist.json.
2. Run grunt dist

