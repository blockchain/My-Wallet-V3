# MyWallet [![Build Status](https://travis-ci.org/blockchain/My-Wallet-V3.png?branch=master)](https://travis-ci.org/blockchain/My-Wallet-V3) [![Coverage Status](https://coveralls.io/repos/blockchain/My-Wallet-V3/badge.svg?branch=master&service=github)](https://coveralls.io/github/blockchain/My-Wallet-V3?branch=master)

JavaScript Model for Blockchain.info wallet.

## Build

[Install Yarn](https://yarnpkg.com/en/docs/install)

```sh
yarn # recommended, can also use `npm install`
npm run build
```

## Tests

```sh
npm test
```

## Dev

Watch files and re-build

```sh
npm run build:watch
```

## Clean

Clean generated files:

```sh
make clean
```

## Getting Started

Load `dist/my-wallet.js`.

Optional: set alias for modules you use

```javascript
var MyWallet = Blockchain.MyWallet;
var WalletStore = Blockchain.WalletStore;
var Spender = Blockchain.Spender;
var API = Blockchain.API;
```

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

## Security

Security issues can be reported to us in the following venues:
 * Email: security@blockchain.info
 * Bug Bounty: https://www.crowdcurity.com/blockchain-info
