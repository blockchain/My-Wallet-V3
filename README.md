# MyWallet

Javascript Model for blockchain wallet.

## Install

```sh
npm install
```

## Tests

```sh
npm test
```

## Getting Started

Include the following files:

* `shared.js`
* `blockchainapi.js`
* `bower_components/jquery/dist/jquery.js`
* `bitcoinjs.js`
* `bip38.js`
* `bip39.js`
* `sjcl.js`
* `xregexp-all.js`
* `hdwallet.js`
* `HDWalletAccount.js`
* `bower_components/cryptojslib/rollups/sha256.js`
* `bower_components/cryptojslib/rollups/aes.js`
* `bower_components/cryptojslib/rollups/pbkdf2.js`
* `bower_components/cryptojslib/components/cipher-core.js`
* `bower_components/cryptojslib/components/pad-iso10126.js`
* `crypto-util-legacy.js`
* `wallet.js`


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



## HDWallet API

#### `MyWallet.isValidateBIP39Mnemonic(mnemonic);`

##### Parameters:

{string} - mnemonic

##### Returns:

{bool}  - is valid mnemonic


#### `MyWallet.initializeHDWallet(passphrase, bip39Password, getPassword, success, error);`

##### Parameters:

{string} - passphrase seed

{string} - optional bip39 Password

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

##### Description:

This method should be called if the event `hd_wallets_does_not_exist` is fired. Method will create the HD wallet and create the first account with the name `Spending`.


#### `MyWallet.didUpgradeToHd();`

##### Returns:

{bool}  - returns whether an hd wallet exist in json or null if unknown


#### `MyWallet.getHDWalletPassphraseString(getPassword, success, error);`

##### Parameters:

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

{function(passphrase)} - the passphrase

{function(reason)} - reason for failure

##### Returns:

Nothing


#### `MyWallet.getAccount(idx);`

##### Returns:

{int}  - idx of account


#### `MyWallet.getLabelForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{string}  - account label

#### `MyWallet.setLabelForAccount(accountIdx, label)`

##### Parameters:

{int} - index of HD wallet account

{string}  - account label

##### Returns:

{bool}  - success or not

##### Description:

Sets label for account and backups wallet


#### `MyWallet.isArchivedForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{bool}  - is account archived


#### `MyWallet.setIsArchivedForAccount(accountIdx, isArchived);`

##### Parameters:

{int} - index of HD wallet account

{bool}  - is archived

##### Description:

sets account to `isArchived` and backups wallet


#### `MyWallet.getAddressesForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - addresses for account


#### `MyWallet.getChangeAddressesForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - change addresses for account


#### `MyWallet.getBalanceForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{int}  - balance of account in satoshis


#### `MyWallet.getNumberOfTransactionsForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{int}  - number of transactions for account


#### `MyWallet.getTransactionsForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - array of transaction objects


#### `MyWallet.sendToAccount(fromIdx, toIdx, amount, feeAmount, note, successCallback, errorCallback, getPassword);`

##### Parameters:

{int} - index of from account

{int} - index of to account

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password


#### `MyWallet.sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successcallback, errorcallback, getPassword);`

##### Parameters:

{int} - index of account

{string} - address to send to

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password


#### `MyWallet.getAccountsCount();`

##### Returns:

{int}  - number of accounts


#### `MyWallet.getAccount(idx);`

##### Returns:

{int}  - idx of account


#### `MyWallet.createAccount(label, getPassword,success,error);`

##### Parameters:

{string} - label name

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

{function} - called when account creation was successful

{function} - called when account creation failed

##### Description:

creates new account and backups wallet


#### `MyWallet.recoverMyWalletHDWalletFromSeedHex(seedHex, bip39Password, getPassword, successCallback, errorCallback);`

##### Parameters:

{string} - passphrase seed in hex

{string} - optional bip39 Password

{function} - getPassword function

{function} - success callback function

{function} - error callback function

##### Description:

recovers HD wallet from passphrases by recreating all accounts and queries all balances of accounts and addresses


#### `MyWallet.recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, getPassword, successCallback, errorCallback);`

##### Parameters:

{string} - passphrase seed in words

{string} - optional bip39 Password

{function} - getPassword function

{function} - success callback function

{function} - error callback function

##### Description:

recovers HD wallet from passphrases by recreating all accounts and queries all balances of accounts and addresses


#### `MyWallet.sendToEmail(accountIdx, value, fixedFee, email, successCallback, errorCallback, getPassword);`

##### Parameters:

{int}  - send from Account Index

{int}  - send amount

{int}  - fee amount

{string} - to email

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password


#### `MyWallet.sendToMobile(accountIdx, value, fixedFee, mobile, successCallback, errorCallback);`

##### Parameters:

{int}  - send from Account Index

{int}  - send amount

{int}  - fee amount

{string} - to mobile number

{function} - success callback function

{function} - error callback function


#### `MyWallet.redeemFromEmailOrMobile(accountIdx, privatekey, successCallback, errorCallback);`

##### Parameters:

{int} - index of HD wallet account

{string} - private key to redeem

{function} - success callback function

{function} - error callback function

##### Description:

redeem bitcoins sent from email or mobile


#### `MyWallet.getBalanceForRedeemCode(accountIdx, privatekey, successCallback, errorCallback);`

##### Parameters:

{string} - private key to redeem

{function} - success callback function with balance in satoshis

{function} - error callback function


#### `MyWallet.getReceivingAddressForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{string}  - next unused address


#### `MyWallet.getAddressAtIdxForAccount(accountIdx, addressIdx);`

##### Parameters:

{int} - index of HD wallet account

{int} - index of address of HD wallet account 

##### Returns:

{string}  - address from account idx and address idx


#### `MyWallet.setLabelForAccountAddress(accountIdx, addressIdx, label);`

##### Parameters:

{int} - index of HD wallet account

{int} - index of address of HD wallet account 

{string}  - label

##### Returns:

{string}  - success or not


#### `MyWallet.unsetLabelForAccountAddress(accountIdx, addressIdx);`

##### Parameters:

{int} - index of HD wallet account

{int} - index of address of HD wallet account

##### Returns:

{string}  - success or not


#### `MyWallet.fetchMoreTransactionsForAccount(accountIdx, successCallback, errorCallback, didFetchOldestTransaction);`

##### Parameters:

{int}  - idx of account

{function} - success callback function with transaction array

{function} - error callback function

{function} - callback is called when all transanctions for the specified account has been fetched
