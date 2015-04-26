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
  var sharedKey = WalletStore.getSharedKey();
  var pbkdf2_iterations = WalletStore.getPbkdf2Iterations();
  if(typeof(listener) == "undefined" || listener == null) {
    listener = {};
  }

  var payment = {
    note:           null,
    fromAddress:    null,
    fromAccount:    null,
    amount:         null,
    feeAmount:      null,
    toAddress:      null,
    changeAddress:  null,
    coins:          null,
    secondPassword: null,
    postSendCB:     null
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
          error("wrong password, promise error");
        }
      });
    } else {
      success(null);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // if postSendCallback is present, this must call successCallback() itself
  var performTransaction = function(tx, keys, postSendCallback) {

    console.log("performing transaction...");
    console.log("P: TX: " + JSON.stringify(tx));
    tx.addPrivateKeys(keys);
    console.log("hem afegit claus");
    var signedTransaction = tx.sign();
    console.log("hem firmat!");
    // TODO: reuse this for all send functions
    BlockchainAPI.push_tx(
      signedTransaction,
      note,
      function(tx_hash) {
        if(typeof(postSendCallback) == "undefined" || postSendCallback === null) {
          successCallback(signedTransaction.getId());
        } else {
          postSendCallback(signedTransaction);
        }
      },
      function(e) { errorCallback(e);}
    );
  };
  ////////////////////////////////////////////////////////////////////////////////
  var spendCoinsLog = function(object) {console.log(JSON.stringify(object));}

  var spendCoins = function(payInfo) {

    var tx = new Transaction( payInfo.coins, payInfo.toAddress, payInfo.amount,
                              payInfo.feeAmount, payInfo.changeAddress, listener);

    console.log("TX: " + tx);
    var keys = tx.addressesOfNeededPrivateKeys.map(function (neededPrivateKeyAddress) {
      var k = WalletStore.getPrivateKey(neededPrivateKeyAddress);
      var privateKeyBase58 = payInfo.secondPassword === null ? k : WalletCrypto.decryptSecretWithSecondPassword(k, payInfo.secondPassword, sharedKey, pbkdf2_iterations);
      // TODO If getPrivateKey returns null, it's a watch only address - ask for private key or show error or try again without watch only addresses
      var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
      var key = MyWallet.privateKeyStringToKey(privateKeyBase58, format);

      // If the address we looked for is not the public key address of the private key we found, try the compressed address
      if (MyWallet.getCompressedAddressString(key) === neededPrivateKeyAddress) {
        key = new Bitcoin.ECKey(key.d, true);
      }
      return key;
    });
    console.log("keys: " + keys);
    performTransaction(tx, keys, payment.postSendCB);

  }
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

  var spendTo = {
    toAddress: function(toAddress, postSendCallback) {
      console.log("toAddress executed");

      payment.toAddress = toAddress;
      payment.postSendCB = postSendCallback;

      // here probably I have to call errorCallback if this fails! (not this catch)
      RSVP.hash(promises).then(function(result) {
        payment.secondPassword = result.secondPassword;
        payment.coins = result.coins;
        spendCoins(payment);
      }).catch(function(reason) {
         console.error("SpendCoins error:", reason);
      });

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

      // promises.coins.then(function(x){console.log(x);});
      return spendTo;
    },
    prepareAddressSweep: function(fromAddress) {
      console.log("prepareAddressSweep executed");
      return spendTo;
    },
    prepareFromAccount: function(fromIndex, amount, feeAmount) {
      console.log("Preparing From Account...");

      payment.fromAccount = fromIndex;
      payment.amount = amount;
      payment.feeAmount = feeAmount;

      promises.coins = new RSVP.Promise(function(success, error) {
        MyWallet.getUnspentOutputsForAccount(payment.fromAccount, success, error)
      });

      // promises.coins.then(function(x){console.log(x);});
      return spendTo;
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  console.log("Preparing Spender!...");
  promises.secondPassword = new RSVP.Promise(getEncryptionPassword);
  payment.note = note;
  // promises.secondPassword.then(function(x){console.log(x);});


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
