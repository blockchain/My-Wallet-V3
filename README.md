MyWallet
===========

Javascript Model for blockchain wallet.




Documentation
===========

    /*
     * @param {string} encrypted wallet payload
     */
    MyWallet.setEncryptedWalletData(data);

    /*
     * @param {string} bitcoin address
     * @param {string} label name
     */
    MyWallet.setLabel(address, label);

    /*
     * @param {Bitcoin.ECKey} spendKey Spend Private Key
     * @param {Object} url parameters
     * @param {function} success callback function
     * @param {function} error callback function 
     */
    MyWallet.securePost(data);

    /*
     * @param {string} inputed password
     * @returns {boolean} 
     */
    MyWallet.isCorrectMainPassword(_password);

    /*
     * @param {number} number of iterations for pbkdf2 encryption
     * @param {function} success callback function
     */
    MyWallet.setPbkdf2Iterations(pbkdf2_iterations, success);

    /*
     * @param {string} password
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.setSecondPassword(password, success, error);

    /*
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.unsetSecondPassword(success, error);

    /*
     * @param {string} bitcoin address
     */
    MyWallet.unArchiveAddr(addr);

    /*
     * @param {string} bitcoin address
     */
    MyWallet.archiveAddr(addr);

    /*
     * @param {Bitcoin.ECKey} Bitcoin ECKey
     * @returns {Boolean} success or not
     */
    MyWallet.importPrivateKey(privateKeyString);

    /*
     * @returns {Bitcoin.ECKey}
     */
    MyWallet.generateNewKey();

    /*
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.get_history(success, error);

    /*
     * @param {string} bitcoin address
     */
    MyWallet.deleteAddressBook(addr);

    /*
     * @returns {Array}
     */
    MyWallet.getAllAddresses();


    /*
     * @returns {string}
     */
    MyWallet.getPreferredAddress();

    /*
     * @param {function} success callback function with scanned data
     * @param {function} error callback function
     */
    MyWallet.scanQRCode(success, error);

    /*
     * @returns {Array}
     */
    MyWallet.getAllAddresses();

    /*
     * @returns {Array}
     */
    MyWallet.getArchivedAddresses();

    /*
     * @returns {Object}
     */
    MyWallet.getLatestBlock();

    /*
     * Delete note associate with given transaction and backs up wallet with server
     * @param {string} tx hash
     */
    MyWallet.deleteNote(tx_hash);

    /*
     * @param {string} bitcoin address to send to 
     * @param {string} bitcoin amount
     */
    MyWallet.quickSendNoUI(to, value);

    /*
     * @param {string} api method to use, use 'update'
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.backupWallet(method, successcallback, errorcallback);

    /*
     * @param {string} json string
     * @param {string} password use to encrypt
     */
    MyWallet.encryptWallet(data, password);

    /*
     * @param {string} json string
     * @param {string} password use to encrypt
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.decryptWallet(data, password, success, error);

    /*
     * @returns {string}
     */
    MyWallet.getWebWorkerLoadPrefix();

    /*
     * @param {string} json string
     * @param {string} password use to encrypt
     * @param {number} number of iterations for pbkdf2 encryption
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.decryptWebWorker(data, password, pbkdf2_iterations, success, _error);

    /*
     * @param {string} json string
     * @param {string} password use to encrypt
     * @param {number} number of iterations for pbkdf2 encryption
     * @param {function} success callback function
     * @param {function} error callback function
     */
    MyWallet.decrypt(data, password, pbkdf2_iterations, success, error);

    /*
     * @param {string} guid
     * @param {boolean} resend_code
     */
    MyWallet.setGUID(guid, resend_code);

    /*
     * @param {string} encrypted Private Key
     * @returns {string} decrypted Private Key
     */
    MyWallet.decryptPK(priv);

    /*
     * @param {string} Private Key
     * @returns {Bitcoin.Buffer} decoded Private Key
     */
    MyWallet.decodePK(priv);

    /*
     * @param {string} bitcoin address
     * @param {string} message
     * @returns {string} message signature
     */
    MyWallet.signmessage(address, message);

    /*
     * @param {string} bitcoin address
     * @returns {boolean} whethere input matches second password
     */
    MyWallet.validateSecondPassword(input);

    /*
     * @param {string} new password
     */
    MyWallet.setMainPassword(new_password);

    /*
     * @param {string} key with format of second parameter
     * @param {string} either 'base58', 'base64', 'hex', 'mini', 'sipa', 'compsipa' 
     * @returns {Bitcoin.ECKey}
     */
    MyWallet.privateKeyStringToKey(value, format);

    /*
     * @param {string} bitcoin address
     * @returns {string} label
     */
    MyWallet.getAddressBookLabel(address);

    /*
     * @param {string} bitcoin address
     * @param {string} label
     */
    MyWallet.MyWallet.addAddressBookEntry(addr, label);    

    /*
    * @param {function} success Callback function
    * @param {function} error Callback function
    */
    MyWallet.get_ticker(successCallback, errorCallback);

    /*
    * @returns {boolean} 
    */
    MyWallet.isSynchronizedWithServer();

    /*
     * @param {string} bitcoin address
     * @returns {boolean} success or not
     */
    MyWallet.addWatchOnlyAddress(address);

    /*
     * @param {string} bitcoin address
     * @returns {boolean} whether is watch only address or not
     */
    MyWallet.isWatchOnly(address);

    /*
     * @returns {boolean} whether mnemonic is verified
     */
    MyWallet.isMnemonicVerified();

    /*
     */
    MyWallet.didVerifyMnemonic();



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

This method tells whether the account is archived or not.

Parameters:

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

Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - addresses for account


#### `MyWallet.getChangeAddressesForAccount(accountIdx);`

Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - change addresses for account


#### `MyWallet.getBalanceForAccount(accountIdx);`

Parameters:

{int} - index of HD wallet account

##### Returns:

{int}  - balance of account in satoshis


#### `MyWallet.getPaymentRequestsForAccount(accountIdx);`

Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - Payment Request objects


#### `MyWallet.generatePaymentRequestForAccount(accountIdx, amount);`

Parameters:

{int} - index of HD wallet account
{int} - Payment Request amount in satoshis

##### Returns:

{Object}  - Payment Request object

##### Description:

    generates and returns a Payment Request object and backups wallet


#### `MyWallet.updatePaymentRequestForAccount(accountIdx, address, amount);`

Parameters:

{int} - index of HD wallet account
{string} - address to update
{int} - Payment Request amount in satoshis

##### Returns:

{bool}  - success or not

##### Description:

    updates a Payment Request object and backups wallet


#### `MyWallet.acceptPaymentRequestForAccount(accountIdx, address, amount);`

Parameters:

{int} - index of HD wallet account
{string} - address to accept

##### Returns:

{bool}  - success or not

##### Description:

    accepts a Payment Request object and backups wallet


#### `MyWallet.cancelPaymentRequestForAccount(accountIdx, address);`

Parameters:

{int} - index of HD wallet account
{string} - address to cancel

##### Returns:

{bool}  - success or not

##### Description:

    cancels a Payment Request object and backups wallet


#### `MyWallet.getTransactionsForAccount(accountIdx);`

Parameters:

{int} - index of HD wallet account

##### Returns:

{array}  - array of transaction objects


#### `MyWallet.refreshAllPaymentRequestsAndChangeAddresses(accountIdx);`

Parameters:

{function} - success callback function
{function} - error callback function

##### Description:

    refreshes all balances across all accounts and addresses


#### `MyWallet.sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successcallback, errorcallback);`

Parameters:

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

Parameters:

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


Tests
=====
You'll need [Karma and Jasmine](https://github.com/karma-runner/karma-jasmine) and PhantomJS:
```sh
npm install -g karma-jasmine@2_0
brew install phantomjs
karma start
```