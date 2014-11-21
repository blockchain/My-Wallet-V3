MyWallet
===========

Javascript Model for blockchain wallet.


MyWallet API
===========


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


#### `MyWallet.unArchiveAddr(addr);`

##### Parameters:

{string} - bitcoin address

##### Description:

unarchives address, backups wallet and refreshes balances


#### `MyWallet.archiveAddr(addr);`

##### Parameters:

{string} - bitcoin address

##### Description:

archives address, backups wallet and refreshes balances


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


#### `MyWallet.fetchWalletJson(user_guid, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, other_error);`

##### Parameters:

{string} - guid

{bool} - resend code

{string} - main password

{string} - 2FA code

{function} - success callback, called after wallet fetched and decrypted

{function} - callback function that will invoke with the 2FA Type, if 2FA code is needed

{function} - callback function that will invoke if 2FA code is incorrect

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


#### `MyWallet.isSynchronizedWithServer();`

##### Returns:

{bool}  - is wallet payload synchronized with server


#### `MyWallet.addWatchOnlyAddress(address);`

##### Parameters:

{string} - bitcoin address

##### Description:

add watch only address, backups wallet and refreshes balances


#### `MyWallet.isWatchOnly(address);`

##### Parameters:

{string}  - bitcoin address

##### Returns:

{bool}  - whether address is watch only


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


#### `MyWallet.sendFromLegacyAddressToAccount(fromAddresses, toIdx, amount, feeAmount);`

##### Parameters:

{array} - from Addresses

{int} - index of to account

{int} - send amount in satoshis

{int} - fee amount in satoshis, base fee will be use if null



HDWallet API
===========


#### `MyWallet.initializeHDWallet(passphrase, bip39Password);`

##### Parameters:

{string} - passphrase seed

{string} - optional bip39 Password

##### Description:

This method should be called if the event `hd_wallets_does_not_exist` is fired. Method will create the HD wallet and create the first account with the name `Spending`.


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


#### `MyWallet.generatePaymentRequestForAccount(accountIdx, amount);`

##### Parameters:

{int} - index of HD wallet account

{int} - Payment Request amount in satoshis

##### Returns:

{Object}  - Payment Request object

##### Description:

generates and returns a Payment Request object and backups wallet


#### `MyWallet.updatePaymentRequestForAccount(accountIdx, address, amount);`

##### Parameters:

{int} - index of HD wallet account

{string} - address to update

{int} - Payment Request amount in satoshis

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


#### `MyWallet.sendToAccount(fromIdx, toIdx, amount, feeAmount, note, successCallback, errorCallback);`

##### Parameters:

{int} - index of from account

{int} - index of to account

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function


#### `MyWallet.sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successcallback, errorcallback);`

##### Parameters:

{int} - index of account

{string} - address to send to

{int} - send amount in satoshis

{int} - fee amount in satoshis

{string} - optional tx note

{function} - success callback function

{function} - error callback function


#### `MyWallet.getAccountsCount();`

##### Returns:

{int}  - number of accounts


#### `MyWallet.createAccount(label);`

##### Parameters:

{string} - label name

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


#### `MyWallet.sendToEmail(accountIdx, value, fixedFee, email, successCallback, errorCallback);`

##### Parameters:

{int}  - send from Account Index

{int}  - send amount

{int}  - fee amount

{string} - to email

{function} - success callback function

{function} - error callback function

#### `MyWallet.redeemFromEmailOrMobile(accountIdx, privatekey);`

##### Parameters:

{int} - index of HD wallet account

{string} - private key to redeem

##### Description:

redeem bitcoins sent from email or mobile

Tests
=====
You'll need [Karma and Jasmine](https://github.com/karma-runner/karma-jasmine) and PhantomJS:
```sh
npm install -g karma-jasmine@2_0
brew install phantomjs
karma start
```