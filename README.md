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

##Getting Started

Include the following files:

* `shared.js`
* `blockchainapi.js`
* `bower_components/jquery/dist/jquery.js`
* `bitcoinjs.js`
* `bip39.js`
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


To build an HD wallet with an existing legacy wallet, we must initialize after receiving event notification from MyWallet. Calling `initializeHDWallet` with `null` argument creates a new random wallet seed.
```javascript
MyWallet.initializeHDWallet(null);
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



## MyWallet API

#### `MyWallet.isCorrectMainPassword(_password);`

##### Parameters:

{string}  - main password

##### Returns:

{bool}  - is main password correct


#### `MyWallet.setPbkdf2Iterations(pbkdf2_iterations, success);`

##### Parameters:

{int} - number of pbkdf2 iterations

{function} - success callback function


#### `MyWallet.setSecondPassword(password, success, error);`

##### Parameters:

{string} - Second password

{function} - success callback function

{function} - error callback function


#### `MyWallet.unsetSecondPassword(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.importPrivateKey(privateKeyString);`

##### Parameters:

{string} - private Key

##### Description:

import Private Key, backups wallet and refreshes balances


#### `MyWallet.get_history(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.deleteAddressBook(addr);`

##### Parameters:

{string} - bitcoin address

##### Description:

delete address from addressBook and backups wallet


#### `MyWallet.getLatestBlock();`

##### Returns:

{Object}  - latest block object


#### `MyWallet.deleteNote(tx_hash);`

##### Parameters:

{string} - tx hash

##### Description:

delete tx note and backups wallet


#### `MyWallet.quickSendNoUI(to, value);`

##### Parameters:

{string} - bitcoin address to send to 

{string} - bitcoin amount


#### `MyWallet.fetchWalletJson(user_guid, shared_key, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, authorization_required, other_error);`

##### Parameters:

{string} - guid

{string} - shared key

{bool} - resend code

{string} - main password

{string} - 2FA code

{function} - success callback, called after wallet fetched and decrypted

{function} - callback function that will invoke with the 2FA Type, if 2FA code is needed

{function} - callback function that will invoke if 2FA code is incorrect

{function(authorization_received)} - callback that will invoke if email authorization is needed. Polling starts as soon as a callback is provided which passes a function for once authorization has been received.

{function} - other error callback function

##### Description:

Fetches and decrypts wallet json from server. If 2FA is needed, method needs to be called again.


#### `MyWallet.signmessage(address, message);`

##### Parameters:

{string} - bitcoin address

{string} - message

##### Returns:

{string}  - message signature in base64


#### `MyWallet.validateSecondPassword(input);`

##### Parameters:

{string}  - second password

##### Returns:

{bool}  - whether input matches second password


#### `MyWallet.setMainPassword(new_password);`

##### Parameters:

{string}  - main password

##### Description:

sets main password, backups wallet and logsout


#### `MyWallet.getAddressBookLabel(address);`

##### Parameters:

{string}  - bitcoin address

##### Returns:

{bool}  - label


#### `MyWallet.addAddressBookEntry(addr, label);`

##### Parameters:

{string}  - bitcoin address

{string}  - label


#### `MyWallet.get_ticker(successcallback, errorcallback);`

##### Parameters:

{function} - success callback function

{function} - error callback function

##### Description:

calls success callback with json object, or error callback with error object


#### `MyWallet.getFiatAtTime(time, value, currencyCode, successcallback, errorcallback);`

##### Parameters:

{int} - unix time

{int} - amount in satoshis

{string}  - currency code

{function} - success callback function with fiat amount

{function} - error callback function


#### `MyWallet.isSynchronizedWithServer();`

##### Returns:

{bool}  - is wallet payload synchronized with server


#### `MyWallet.isMnemonicVerified(address);`

##### Returns:

{bool}  - whether mnemonic is verified


#### `MyWallet.didVerifyMnemonic();`

##### Description:

set mnemonic to be verified and backups wallet


#### `MyWallet.setDefaultAccountIndex(accountIdx);`

##### Parameters:

{int}  - default Account Index

##### Description:

set default Account Index and backups wallet


#### `MyWallet.getDefaultAccountIndex();`

##### Returns:

{int}  -  default Account Index


#### `MyWallet.setRealAuthType(val)`

##### Parameters:

{int}  - auth type


#### `MyWallet.get2FAType();`

##### Returns:

{int}  - 2FA type


#### `MyWallet.get2FATypeString();`

##### Returns:

{string}  - 2FA type string


#### `MyWallet.sendMonitorEvent(obj);`

##### Parameters:

{Object} - object with fields `type`, `message`, and `code`

##### Description:

calls all methods registered with `MyWallet.monitor(func)`


#### `MyWallet.monitor(func);`

##### Parameters:

{function} - callback function

##### Description:

add a listener to montitor for message events


#### `MyWallet.getLocalSymbolCode();`

##### Returns:

{string}  - fiat currency code (e.g. USD)

##### Description:

gets currency code stored in memory or in local storage


#### `MyWallet.setLocalSymbolCode(code);`

##### Parameters:

{string}  - fiat currency code (e.g. USD)

##### Description:

stores currency code in memory and in local storage


#### `MyWallet.getLanguages();`

##### Returns:

{Object}  - dictionary of available languages


#### `MyWallet.getCurrencies();`

##### Returns:

{Object}  - dictionary of available currencies


#### `MyWallet.disableSaveTwoFactor(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.enableSaveTwoFactor(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.unsetTwoFactor(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.setTwoFactorSMS(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.setTwoFactorEmail(success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.setTwoFactorGoogleAuthenticator(success, error);`

##### Parameters:

{function} - success callback function with google secret url

{function} - error callback function


#### `MyWallet.confirmTwoFactorGoogleAuthenticator(code, success, error);`

##### Parameters:

{function} - success callback function

{function} - error callback function


#### `MyWallet.createNewWallet(inputedEmail, inputedPassword, languageCode, currencyCode, success, error);`

##### Parameters:

{string} - user email

{string} - user main password

{string}  - fiat currency code (e.g. USD)

{string}  - language code (e.g. en)

{function} - success callback function with guid, sharedkey and password

{function} - error callback function with error message


#### `MyWallet.getAPICode();`

##### Returns:

{string}  - api code


#### `MyWallet.setAPICode(val)`

##### Parameters:

{string}  - api code


#### `MyWallet.getTransactions();`

##### Returns:

{array}  - get all transactions


#### `MyWallet.getAllTransactions();`

##### Returns:

{array}  - get all transactions with fields to_account, from_account, from_addresses, to_addresses, etc filled


#### `MyWallet.isValidAddress(candidate);`

##### Parameters:

{string} - candidate address

##### Returns:

{bool}  - is valid address


#### `MyWallet.isValidPrivateKey(candidate);`

##### Parameters:

{string} - candidate PrivateKey

##### Returns:

{bool}  - is valid PrivateKey


#### `MyWallet.getHistoryAndParseMultiAddressJSON();`

##### Description:

Get history and parse multiaddr json. Needs to be called by client in the success callback of fetchWalletJson and after MyWallet.initializeHDWallet


Legacy API
===========


#### `MyWallet.getLegacyActiveAddresses();`

##### Returns:

{array}  - legacy active addresses


#### `MyWallet.getLegacyArchivedAddresses();`

##### Returns:

{array}  - archived addresses


#### `MyWallet.getTotalBalanceForActiveLegacyAddresses();`

##### Returns:

{int}  - total Balance For Active Legacy Addresses


#### `MyWallet.hasLegacyAddresses();`

##### Returns:

{bool}  - has legacy addresses



#### `MyWallet.legacyAddressExists(address);`

##### Returns:

{bool}  - legacy Address Exists 


#### `MyWallet.getLegacyAddressTag();`

##### Returns:

{string}  - Legacy Address Tag


#### `MyWallet.setLegacyAddressTag(address, tag)`

##### Parameters:

{string}  - bitcoin address

{string}  - tag


#### `MyWallet.getAllLegacyAddresses();`

##### Returns:

{array}  - get all legacy addresses


#### `MyWallet.getLegacyAddressLabel(address);`

##### Returns:

{array}  - get legacy address label


#### `MyWallet.setLegacyAddressLabel(address, label)`

##### Parameters:

{string}  - bitcoin address

{string}  - label


#### `MyWallet.setLegacyAddressBalance(address, balance)`

##### Parameters:

{string}  - bitcoin address

{string}  - balance


#### `MyWallet.getLegacyAddressBalance(address)`

##### Parameters:

{string}  - bitcoin address

##### Returns:

{int}  - balance


#### `MyWallet.deleteLegacyAddress(addr);`

##### Parameters:

{string} - bitcoin address


#### `MyWallet.setLegacyAddressLabel(address, label)`

##### Parameters:

{string}  - bitcoin address

{string}  - label name

##### Description:

Sets label for account and backups wallet


#### `MyWallet.getPreferredLegacyAddress();`

##### Returns:

{string}  - preferred address


#### `MyWallet.isWatchOnlyLegacyAddress(address);`

##### Parameters:

{string}  - bitcoin address

##### Returns:

{bool}  - whether address is watch only


#### `MyWallet.isActiveLegacyAddress(addr);`

##### Parameters:

{string}  - bitcoin address

##### Returns:

{bool}  - whether address is active

#### `MyWallet.addWatchOnlyLegacyAddress(address);`

##### Parameters:

{string} - bitcoin address

##### Description:

add watch only address, backups wallet and refreshes balances


#### `MyWallet.archiveLegacyAddr(addr);`

##### Parameters:

{string} - bitcoin address

##### Description:

archives address, backups wallet and refreshes balances


#### `MyWallet.unArchiveLegacyAddr(addr);`

##### Parameters:

{string} - bitcoin address

##### Description:

unarchives address, backups wallet and refreshes balances


#### `MyWallet.getLegacyTransactions();`

##### Returns:

{array}  - Legacy Transactions


#### `MyWallet.sendFromLegacyAddressToAccount(fromAddress, toIdx, amount, feeAmount, note, successCallback, errorCallback, getPassword);`

##### Parameters:

{string} - from address

{int} - index of account

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password


#### `MyWallet.sweepLegacyAddressToAccount(fromAddress, toIdx, successCallback, errorCallback, getPassword);`

##### Parameters:

{string} - from address

{int} - index of account

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password


#### `MyWallet.sendFromLegacyAddressToAddress(fromAddress, toAddress, amount, feeAmount, note, successCallback, errorCallback, getPassword);`

##### Parameters:

{string} - from address

{int} - to address

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password



HDWallet API
===========

#### `MyWallet.isValidateBIP39Mnemonic(mnemonic);`

##### Parameters:

{string} - mnemonic

##### Returns:

{bool}  - is valid mnemonic


#### `MyWallet.initializeHDWallet(passphrase, bip39Password, getPassword);`

##### Parameters:

{string} - passphrase seed

{string} - optional bip39 Password

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

##### Description:

This method should be called if the event `hd_wallets_does_not_exist` is fired. Method will create the HD wallet and create the first account with the name `Spending`.


#### `MyWallet.getHDWalletPassphraseString(getPassword);`

##### Parameters:

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

##### Returns:

{string}  - HDWallet Passphrase


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


#### `MyWallet.getPaymentRequestsForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - Payment Request objects


#### `MyWallet.generateOrReuseEmptyPaymentRequestForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account


##### Returns:

{Object}  - Payment Request object

##### Description:

generates and returns a Payment Request object and backups wallet


#### `MyWallet.updatePaymentRequestForAccount(accountIdx, address, amount, label);`

##### Parameters:

{int} - index of HD wallet account

{string} - address to update

{int} - Payment Request amount in satoshis

{string} - label

##### Returns:

{bool}  - success or not

##### Description:

updates a Payment Request object and backups wallet


#### `MyWallet.acceptPaymentRequestForAccount(accountIdx, address, amount);`

##### Parameters:

{int} - index of HD wallet account

{string} - address to accept

##### Returns:

{bool}  - success or not

##### Description:

accepts a Payment Request object and backups wallet


#### `MyWallet.cancelPaymentRequestForAccount(accountIdx, address);`

##### Parameters:

{int} - index of HD wallet account

{string} - address to cancel

##### Returns:

{bool}  - success or not

##### Description:

cancels a Payment Request object and backups wallet


#### `MyWallet.getTransactionsForAccount(accountIdx);`

##### Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - array of transaction objects


#### `MyWallet.refreshAllPaymentRequestsAndChangeAddresses(successCallback, errorCallback);`

##### Parameters:

{function} - success callback function

{function} - error callback function

##### Description:

refreshes all balances across all accounts and addresses


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


#### `MyWallet.createAccount(label, getPassword);`

##### Parameters:

{string} - label name

{function} - function with signiture getPassword(success) where success has parameter pw for user inputed password

##### Description:

creates new account and backups wallet


#### `MyWallet.recoverMyWalletHDWalletFromSeedHex(seedHex, bip39Password);`

##### Parameters:

 {string} - passphrase seed in hex

 {string} - optional bip39 Password

##### Description:

recovers HD wallet from passphrases by recreating all accounts and queries all balances of accounts and addresses


#### `MyWallet.recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password);`

##### Parameters:

{string} - passphrase seed in words

{string} - optional bip39 Password

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


#### `MyWallet.getAddressAtIdxForAccount(accountIdx, addressIdx);`

##### Parameters:

{int} - index of HD wallet account

{int} - index of address of HD wallet account 


##### Returns:

{string}  - address from account idx and address idx