var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var RSVP = require('rsvp');

  /**
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */

var Spenderr = function(note, successCallback, errorCallback, listener, getSecondPassword) {

////////////////////////////////////////////////////////////////////////////////
  if(typeof(listener) == "undefined" || listener == null) {
    listener = {};
  }

  var payment = {
    note:              null,
    fromAddress:       null,
    fromAccountIndex:  null,
    fromAccount:       null,
    amount:            null,
    feeAmount:         null,
    toAddress:         null,
    changeAddress:     null,
    coins:             null,
    secondPassword:    null,
    postSendCB:        null,
    sharedKey:         null,
    pbkdf2_iterations: null,
    getPrivateKeys:    null
  }

  var promises = {
    secondPassword: null,
    coins: null
  };
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

  var getEncryptionPassword = function(success, error) {
    if (WalletStore.getDoubleEncryption()) {
      getSecondPassword(function(pw, rightCB, wrongCB){
        if (MyWallet.validateSecondPassword(pw)) {
          rightCB();
          success(pw);
        } else {
          wrongCB();
          error("wrong password (promise)");
        }
      });
    } else {
      success(null);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // pastSendCB is post process for toEmail and toMobile actions
  var publishTransaction = function(signedTransaction) {

    var succ = function(tx_hash) {
      if(typeof(payment.postSendCB) == "undefined" || payment.postSendCB === null) {
        successCallback(signedTransaction.getId());
      } else {
        payment.postSendCB(signedTransaction);
      }
    };

    BlockchainAPI.push_tx(signedTransaction, payment.note, succ, errorCallback);
  };
  ////////////////////////////////////////////////////////////////////////////////
  var spendCoins = function() {

    var tx = new Transaction( payment.coins, payment.toAddress, payment.amount,
                              payment.feeAmount, payment.changeAddress, listener);
    var keys = payment.getPrivateKeys(tx);
    tx.addPrivateKeys(keys);
    var signedTransaction = tx.sign();
    publishTransaction(signedTransaction);

  }
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

  var spend = {
    /**
     * @param {string} address to pay
     * @param {function} if present will replace success callback
     */
    toAddress: function(toAddress) {
      console.log("toAddress executed...");
      payment.toAddress = toAddress;
      RSVP.hash(promises).then(function(result) {
        payment.secondPassword = result.secondPassword;
        payment.coins = result.coins;
        spendCoins();
      }).catch(errorCallback);
    },
    /**
     * @param {number} index of the account to pay
     */
    toAccount: function(toIndex) {
      console.log("toAccount executed...");
      var toAccount = WalletStore.getHDWallet().getAccount(toIndex);
      var toAddress = toAccount.getReceiveAddress();
      spend.toAddress(toAddress);
    },
    /**
     * @param {string} email address
     */
    toEmail: function(email) {
      console.log("toEmail executed...");
      var key = MyWallet.generateNewKey();
      var address = key.pub.getAddress().toString();
      var privateKey = key.toWIF();
      WalletStore.setLegacyAddressTag(address, 2);

      console.log("addreça: "+ address);
      console.log("privateKey: "+ privateKey);
      // this is going to be executed after publish transaction
      payment.postSendCB = function(tx){
        console.log("Ara entrem a executar la toEmail postSendCB");
        var postProcess = function (data) {
          console.log("Ara estem post procesant el sendViaEmail");
          WalletStore.setPaidToElement(tx.getId(), {email:email, mobile: null, redeemedAt: null, address: address});
          MyWallet.backupWallet('update', function() {successCallback(tx.getId());});
        }
        BlockchainAPI.sendViaEmail(email, tx, privateKey, postProcess, errorCallback);
      }

      var saveAndSpend = function() {
        MyWallet.backupWallet('update', function() {spend.toAddress(address);});
      }
      var err = function() { console.log('Unexpected error toEmail'); }

      WalletStore.setLegacyAddressLabel(address, email + ' Sent Via Email', saveAndSpend, err);

    }

  }
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  var prepareFrom = {
    prepareFromAddress: function(fromAddress, amount, feeAmount) {
      console.log("Preparing From Address!...");

      payment.fromAddress = fromAddress ? [fromAddress] : WalletStore.getLegacyActiveAddresses();
      payment.changeAddress = fromAddress || WalletStore.getPreferredLegacyAddress();
      payment.amount = amount;
      payment.feeAmount = feeAmount;

      promises.coins = new RSVP.Promise(function(success, error) {
        MyWallet.getUnspentOutputsForAddresses(payment.fromAddress, success, error);
      });

      // we set the private key obtainer function
      // to be called later once we know the coins to sign.
      payment.getPrivateKeys = function (tx) {
        var getKeyForAddress = function (neededPrivateKeyAddress) {
          var k = WalletStore.getPrivateKey(neededPrivateKeyAddress);
          var privateKeyBase58 = payment.secondPassword === null
            ? k
            : WalletCrypto.decryptSecretWithSecondPassword(
                k, payment.secondPassword, payment.sharedKey, payment.pbkdf2_iterations);
          // TODO If getPrivateKey returns null, it's a watch only address
          // - ask for private key or show error or try again without watch only addresses
          var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
          var key = MyWallet.privateKeyStringToKey(privateKeyBase58, format);

          // If the address we looked for is not the public key address of the
          // private key we found, try the compressed address
          if (MyWallet.getCompressedAddressString(key) === neededPrivateKeyAddress) {
            key = new Bitcoin.ECKey(key.d, true);
          }
          return key;
        }
        return tx.addressesOfNeededPrivateKeys.map(getKeyForAddress);
      }

      return spend;
    },
    prepareAddressSweep: function(fromAddress) {
      console.log("prepareAddressSweep executed");
      var feeAmount = MyWallet.getBaseFee();
      var amount = WalletStore.getLegacyAddressBalance(fromAddress) - feeAmount;
      return prepareFrom.prepareFromAddress(fromAddress, amount, feeAmount);
    },
    prepareFromAccount: function(fromIndex, amount, feeAmount) {
      console.log("Preparing From Account...");

      payment.fromAccountIndex = fromIndex;
      payment.fromAccount = WalletStore.getHDWallet().getAccount(fromIndex);
      payment.changeAddress = payment.fromAccount.getChangeAddress();
      payment.amount = amount;
      payment.feeAmount = feeAmount;

      promises.coins = new RSVP.Promise(function(success, error) {
        MyWallet.getUnspentOutputsForAccount(payment.fromAccountIndex, success, error)
      });

      // we set the private key obtainer function
      // to be called later once we know the coins to sign.
      payment.getPrivateKeys = function (tx) {
        // obtain xpriv
        var extendedPrivateKey = payment.fromAccount.extendedPrivateKey === null || payment.secondPassword === null
          ? payment.fromAccount.extendedPrivateKey
          : WalletCrypto.decryptSecretWithSecondPassword( payment.fromAccount.extendedPrivateKey
                                                        , payment.secondPassword
                                                        , payment.sharedKey
                                                        , payment.pbkdf2_iterations);
        // create an hd-account with xpriv decrypted
        var sendAccount = new HDAccount();
        sendAccount.newNodeFromExtKey(extendedPrivateKey);

        var getKeyForPath = function (neededPrivateKeyPath) {
          return sendAccount.generateKeyFromPath(neededPrivateKeyPath).privKey;
        }
        return tx.pathsOfNeededPrivateKeys.map(getKeyForPath);
      }
      return spend;
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  console.log("Preparing Spender!...");
  promises.secondPassword = new RSVP.Promise(getEncryptionPassword);
  payment.note = note;
  payment.sharedKey = WalletStore.getSharedKey();
  payment.pbkdf2_iterations = WalletStore.getPbkdf2Iterations();
  //////////////////////////////////////////////////////////////////////////////
  return prepareFrom;
}

module.exports = Spenderr;

// examples for the console:
// var getSP = function(tryPassword){setTimeout(function() { tryPassword("hola", function(){console.log("Correct password")}, function(){console.log("Wrong password")})}, 2500)};
// new Blockchain.Spenderr(null, null, null, null, getSP).prepareFromAddress(null, null, null).toAddress(null, null);
// new Blockchain.Spenderr(null, null, null, null, null).prepareFromAccount(0, 10000, 10000).toAddress(null, null);
// Blockchain.MyWallet.getUnspentOutputsForAccount(0, function(u){console.log(u)});
// new Blockchain.Spenderr("mi nota", null, null, null, getSP).prepareFromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 20000, 10000).toAddress(null, null);
// new Blockchain.Spenderr("mi nota", function(x){console.log("All ok: " +x);}, null, null, getSP).prepareFromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 20000, 10000).toAddress("1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN", null);
// new Blockchain.Spenderr("mi nota", function(x){console.log("All ok: " +x);}, function(x){console.log("oh shit: " +x);}, null, getSP).prepareFromAccount(0, 10000000000, 10000).toAddress("1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN", null);
// new Blockchain.Spenderr("mi nota", function(x){console.log("All ok: " +x);}, function(x){console.log("oh shit: " +x);}, null, getSP).prepareAddressSweep("1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN").toAccount(0);
