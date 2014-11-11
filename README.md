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
    /*
    * @param {int} index of account
    * @returns {string} label
    */
    MyWallet.getLabelForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @param {string} account name
    */
    MyWallet.setLabelForAccount(accountIdx, label);

    /*
    * @param {int} index of account
    * @returns {boolean} is archived
    */
    MyWallet.isArchivedForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @param {string} account name
    */
    MyWallet.setIsArchivedForAccount(accountIdx, isArchived);

    /*
    * @param {int} index of account
    * @returns {array} address for account
    */
    MyWallet.getAddressesForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @returns {array} change address for account
    */
    MyWallet.getChangeAddressesForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @returns {int} balance of account in satoshis
    */
    MyWallet.getBalanceForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @returns {array} Payment Request object
    */
    MyWallet.getPaymentRequestsForAccount(accountIdx);

    /*
    * @param {int} index of account
    * @param {int} Payment Request amount in satoshis
    * @returns {Object} Payment Request object
    */
    MyWallet.generatePaymentRequestForAccount(accountIdx, amount);

    /*
    * @param {int} index of account
    * @param {string} address to update
    * @param {int} Payment Request amount in satoshis
    * @returns {Boolean} success or not
    */
    MyWallet.updatePaymentRequestForAccount(accountIdx, address, amount);

    /*
    * @param {int} index of account
    * @param {string} address to accept
    * @returns {Boolean} success or not
    */
    MyWallet.acceptPaymentRequestForAccount(accountIdx, address);

    /*
    * @param {int} index of account
    * @param {string} address to cancel
    * @returns {Boolean} success or not
    */
    MyWallet.cancelPaymentRequestForAccount(accountIdx, address);

    /*
    * @param {int} index of account
    * @returns {array} array of transaction objects
    */
    MyWallet.getTransactionsForAccount(accountIdx);

    /*
    * @param {function} success callback function
    * @param {function} error callback function
    */
    MyWallet.refreshAllPaymentRequestsAndChangeAddresses(successcallback, errorcallback);

    /*
    * @param {int} index of account
    * @param {string} address to send to
    * @param {int} send amount in satoshis
    * @param {int} fee amount in satoshis
    * @param {string} tx note
    * @param {function} success callback function
    * @param {function} error callback function
    */
    MyWallet.sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successcallback, errorcallback);

    /*
    * @returns {int} accounts count
    */
    MyWallet.getAccountsCount();

    /*
    * @param {string} label name
    */
    MyWallet.createAccount(label);

    /*
    * @param {string} passphrase seed in hex
    * @param {string} optional bip39 Password
    */
    MyWallet.recoverMyWalletHDWalletFromSeedHex(seedHex, bip39Password);

    /*
    * @param {string} passphrase seed
    * @param {string} optional bip39 Password
    */
    MyWallet.recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password);

    /*
    * @param {string} passphrase seed
    * @param {string} optional bip39 Password
    */
    MyWallet.initializeHDWallet(passphrase, bip39Password);



Tests
=====
You'll need [Karma and Jasmine](https://github.com/karma-runner/karma-jasmine) and PhantomJS:
```sh
npm install -g karma-jasmine@2_0
brew install phantomjs
karma start
```