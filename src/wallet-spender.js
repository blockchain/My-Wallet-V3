'use strict';

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var RSVP = require('rsvp');
var Base58 = require('bs58');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers = require('./helpers');
var KeyRing  = require('./keyring');

  /**
   * @param {?string} note transaction note
   * @param {function()} successCallback success callback function
   * @param {function()} errorCallback error callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
var Spender = function(note, successCallback, errorCallback, listener, secondPassword) {

  assert(successCallback, "success callback required");
  assert(errorCallback, "error callback required");

  if(typeof(listener) == "undefined" || listener == null) {
    listener = {};
  }

  var maxSatoshi = 2100000000000000;
  var payment = {
    note:              note,
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
    getPrivateKeys:    null,
    isSweep:           false,
    extraAddress:      null
  };

  var promises = {
    coins: null
  };

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
  var sortUnspentOutputs = function(unspentOutputs) {
    var unspent = [];
    for (var key in unspentOutputs) {
      var output = unspentOutputs[key];
      if (!output.pending) {
        unspent.push(output);
      }
    }
    unspent.sort(function(o1, o2){
      return o2.value - o1.value;
    });
    return unspent;
  };

  var estimatedInputs = function(unspentCoins, amounts){
    if (!Array.isArray(amounts)) {amounts = [amounts];}
    var amount = amounts.reduce(Helpers.add,0);
    var sortedCoins = sortUnspentOutputs(unspentOutputs);
    var accum = 0;
    for (var i = 0; i < sortedCoins.length; i++) {
      var coin = sortedCoins[i];
      accum += coin.value;
      if (accum >= amount) {
        return i + 1;
      }else{
        throw "not enough coins";
      };
    };
  };

  var estimatedSize = function(nInpunts, nOutputs) {
    return (nOutputs*148 + nInputs *34 + 10);
  };

  var estimatedFee = function(unspentCoins, amounts, toAddresses) {
    if (!Array.isArray(toAddresses)) {toAddresses = [toAddresses];}
    if (!Array.isArray(amounts)) {amounts = [amounts];}
    var network  = Bitcoin.networks.bitcoin;
    var feePerKb = network.feePerKb;
    var nouts = toAddress.length + 1; // assumed 1 change output (not accurate)
    var nins  = estimatedInputs(unspentCoins, amounts);
    var size  = estimatedSize(nins, nouts);
    var thousands = size / 1000;
    var remainder = size % 1000;
    var fee = feePerKb * thousands;
    if(remainder > 0)   { fee += feePerKb;};
    return fee;
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  var getUnspentOutputs = function(addressList, success, error) {
    var processCoins = function (obj) {
      var processCoin = function(utxo) {
        var txBuffer = new Buffer(utxo.tx_hash, "hex");
        Array.prototype.reverse.call(txBuffer);
        utxo.hash = txBuffer.toString("hex");
        utxo.index = utxo.tx_output_n;
      };
      obj.unspent_outputs.forEach(processCoin);
      success && success(obj.unspent_outputs);
    }
    var errorCoins = function(e) {
      error && error(e.message || e.responseText);
    }
    BlockchainAPI.get_unspent(addressList, processCoins, errorCoins, 0, true);
  };
  //////////////////////////////////////////////////////////////////////////////
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
    var getValue = function(coin) {return coin.value;};
    var isSmall = function(value) {return value < 500000;};

    if (payment.isSweep) {
      payment.amount = payment.coins.map(getValue).reduce(Helpers.add,0) - payment.feeAmount;
    };
    // console.log(estimatedFee(payment.coins, payment.amounts, payment.toAddress));
    // create the transaction (the coins are choosen here)
    var tx = new Transaction( payment.coins, payment.toAddress, payment.amount,
                              payment.feeAmount, payment.changeAddress, listener);
    // obtain the private keys for the coins we are going to spend
    var keys = payment.getPrivateKeys(tx);
    tx.addPrivateKeys(keys);
    tx.randomizeOutputs();
    // sign the transaction
    var signedTransaction = tx.sign();

    // cancel the transaction if public note and small output
    var anySmall = tx.transaction.outs.map(getValue).some(isSmall);
    if(anySmall && payment.note !== undefined && payment.note !== null)
      {throw "There is an output too small to publish a note";}

    // push the transaction to the network
    publishTransaction(signedTransaction);
  };
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
  var spend = {
    /**
     * @param {string} address to pay
     * @param {function} if present will replace success callback
     */
    toAddress: function(toAddress) {

      assert(toAddress, "to address required");
      payment.toAddress = toAddress;
      RSVP.hash(promises).then(function(result) {
        payment.coins = result.coins;
        spendCoins();
      }).catch(errorCallback);
    },
    /**
     * @param {string} address to pay
     * @param {function} if present will replace success callback
     */
    toAddresses: function(toAddresses, amounts) {

      assert(toAddresses, "to address required");
      assert(amounts, "amounts required");
      assert(amounts.reduce(Helpers.add,0) <= maxSatoshi, "max bitcoin number 21 Million");
      // we must assert amount = sum (amounts)
      payment.toAddress = toAddresses;
      payment.amount = amounts;

      RSVP.hash(promises).then(function(result) {
        payment.coins = result.coins;
        spendCoins();
      }).catch(errorCallback);
    },
    /**
     * @param {number} index of the account to pay
     */
    toAccount: function(toIndex) {

      assert(toIndex !== undefined || toIndex !== null, "to account index required");
      var toAccount = MyWallet.wallet.hdwallet.accounts[toIndex]
      var toAddress = toAccount.receiveAddress;
      spend.toAddress(toAddress);
    },
    /**
     * @param {string} email address
     */
    toEmail: function(email) {
      // this needs to be refactored for the new model
      assert(email, "to Email required");
      var key = MyWallet.generateNewKey();
      var address = key.pub.getAddress().toString();
      var privateKey = key.toWIF();
      WalletStore.setLegacyAddressTag(address, 2);

      // this is going to be executed after publish transaction
      payment.postSendCB = function(tx){
        var postProcess = function (data) {
          if(payment.secondPassword){
            WalletStore.encryptPrivateKey( payment.toAddress
                                         , payment.secondPassword
                                         , payment.sharedKey
                                         , payment.pbkdf2_iterations);
          }
          WalletStore.setPaidToElement(tx.getId()
            , {email:email, mobile: null, redeemedAt: null, address: address});
          MyWallet.backupWallet('update', function() {successCallback(tx.getId());});
        };
        BlockchainAPI.sendViaEmail(email, tx, privateKey, postProcess, errorCallback);
      };

      var saveAndSpend = function() {
        MyWallet.backupWallet('update', function() {spend.toAddress(address);});
      };
      var err = function() { console.log('Unexpected error toEmail'); };

      WalletStore.setLegacyAddressLabel(address, email + ' Sent Via Email', saveAndSpend, err);
    },
    /**
     * @param {string} mobile number in int. format, e.g. "+1123555123"
     */
    toMobile: function(mobile) {
      // this needs to be refactored for the new model
      assert(mobile, "to mobile required");
      if (mobile.charAt(0) == '0') { mobile = mobile.substring(1);}
      if (mobile.charAt(0) != '+') { mobile = '+' + mobile;}
      //mobile = '+' + child.find('select[name="sms-country-code"]').val() + mobile;
      var miniKeyAddrobj = MyWallet.generateNewMiniPrivateKey();
      var address = MyWallet.getCompressedAddressString(miniKeyAddrobj.key);
      WalletStore.setLegacyAddressTag(address, 2);

      // this is going to be executed after publish transaction
      payment.postSendCB = function(tx){
        var postProcess = function (data) {
          if(payment.secondPassword){
            WalletStore.encryptPrivateKey( payment.toAddress
                                         , payment.secondPassword
                                         , payment.sharedKey
                                         , payment.pbkdf2_iterations);
          }
          WalletStore.setPaidToElement(tx.getId()
            , {email:null, mobile: mobile, redeemedAt: null, address: address});

          MyWallet.backupWallet('update', function() {successCallback(tx.getId());});
        };
        BlockchainAPI.sendViaSMS(mobile, tx, miniKeyAddrobj.miniKey, postProcess, errorCallback);
      };

      var saveAndSpend = function() {
        MyWallet.backupWallet('update', function() {spend.toAddress(address);});
      }
      var err = function() { console.log('Unexpected error toMobile'); }

      WalletStore.setLegacyAddressLabel(address, mobile + ' Sent Via SMS', saveAndSpend, err);
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  var prepareFrom = {
    /**
     * @param {string} fromAddress address from where we are spending
     * @param {number} amount amount to spend
     * @param {number} feeAmount fee to pay
     */
    fromAddress: function(fromAddress, amount, feeAmount) {

      assert(fromAddress, "fromAddress required");
      assert(typeof(amount) === "number", "amount required");
      assert(amount <= maxSatoshi, "max bitcoin number 21 Million");
      assert(typeof(feeAmount) === "number", "fee required");
      payment.fromAddress = fromAddress ? fromAddress : MyWallet.wallet.activeAddresses;
      payment.changeAddress = fromAddress || MyWallet.wallet.activeAddresses[0];
      payment.amount = amount;
      payment.feeAmount = feeAmount;

      promises.coins = new RSVP.Promise(function(success, error) {
        var addressList = [payment.fromAddress];
        if (payment.extraAddress !== null && payment.extraAddress !== undefined) {
          addressList.push(payment.extraAddress);
        };
        getUnspentOutputs(addressList, success, error);
      });

      // set the private key obtainer function
      payment.getPrivateKeys = function (tx) {
        var getKeyForAddress = function (neededPrivateKeyAddress) {
          var k = MyWallet.wallet.key(neededPrivateKeyAddress).priv;
          var privateKeyBase58 = payment.secondPassword == null
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
          else if (MyWallet.getUnCompressedAddressString(key) === neededPrivateKeyAddress) {
            key = new Bitcoin.ECKey(key.d, false);
          }
          return key;
        }
        return tx.addressesOfNeededPrivateKeys.map(getKeyForAddress);
      };

      return spend;
    },
    /**
     * @param {string} fromAddress address from where we are spending
     */
    addressSweep: function(fromAddress) {
      assert(fromAddress, "fromAddress required");
      payment.isSweep = true;
      var feeAmount = MyWallet.getBaseFee();
      return prepareFrom.fromAddress(fromAddress, feeAmount, feeAmount);
    },
    /**
     * @param {string} private key of the coins you want to redeem
     */
    fromPrivateKey: function(privateKey) {
      assert(privateKey, "privateKey required");

      var format = MyWallet.detectPrivateKeyFormat(privateKey);
      var key    = MyWallet.privateKeyStringToKey(privateKey, format);
      // I should take care of inconsistent web addresses related to compresion from the old wallet
      key.pub.compressed = false;
      payment.extraAddress = key.pub.getAddress().toString();
      key.pub.compressed = true;
      var addr = key.pub.getAddress().toString();
      if(!(addr in MyWallet.wallet.addresses)){
        var address = MyWallet.wallet.importLegacyAddress(key, "Redeemed code.", payment.secondPassword);
        address.archived = true;
      }
      return prepareFrom.addressSweep(addr);
    },
    /**
     * @param {number} fromIndex account index
     * @param {number} amount amount to spend
     * @param {number} feeAmount fee to pay
     */
    fromAccount: function(fromIndex, amount, feeAmount) {

      assert(fromIndex !== undefined || fromIndex !== null, "from account index required");
      assert(typeof(amount) === "number", "amount required");
      assert(amount <= maxSatoshi, "max bitcoin number 21 Million");
      assert(typeof(feeAmount) === "number", "fee required");
      payment.fromAccountIndex = fromIndex;
      payment.fromAccount = MyWallet.wallet.hdwallet.accounts[fromIndex];
      payment.changeAddress = payment.fromAccount.changeAddress;
      payment.amount = amount;
      payment.feeAmount = feeAmount;

      promises.coins = new RSVP.Promise(function(success, error) {
        getUnspentOutputs([payment.fromAccount.extendedPublicKey], success, error);
      });

      // set the private key obtainer function
      payment.getPrivateKeys = function (tx) {
        // obtain xpriv
        var extendedPrivateKey = payment.fromAccount.extendedPrivateKey === null || payment.secondPassword === null
          ? payment.fromAccount.extendedPrivateKey
          : WalletCrypto.decryptSecretWithSecondPassword( payment.fromAccount.extendedPrivateKey
                                                        , payment.secondPassword
                                                        , payment.sharedKey
                                                        , payment.pbkdf2_iterations);


        var getKeyForPath = function (neededPrivateKeyPath) {
          var keyring = new KeyRing(extendedPrivateKey);
          return keyring.privateKeyFromPath(neededPrivateKeyPath);
        }
        return tx.pathsOfNeededPrivateKeys.map(getKeyForPath);
      }
      return spend;
    }
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  payment.note              = note;
  payment.secondPassword    = secondPassword;
  payment.sharedKey         = MyWallet.wallet.sharedKey;
  payment.pbkdf2_iterations = MyWallet.wallet.pbkdf2_iterations;
  //////////////////////////////////////////////////////////////////////////////
  return prepareFrom;
};

module.exports = Spender;

// example of usage:
// var getSP = function(tryPassword){setTimeout(function() { tryPassword("jaume", function(){console.log("Correct password")}, function(){console.log("Wrong password")})}, 2500)};
// Spender("to email test", function(x){console.log("All ok: " +x);}, function(x){console.log("oh fail: " +x);}, null, getSP)
//   .fromAccount(0, 20000, 10000).toEmail("pedro@ximenez.com");
// 7dBCyQ7decFjHkbeNb6JXN1VSWe3hRdWHtDxJ4FN7khh
// Spender("nota", function(x){console.log("All ok: " +x);}, function(x){console.log("oh fail: " +x);}, null, getSP).fromPrivateKey("7dBCyQ7decFjHkbeNb6JXN1VSWe3hRdWHtDxJ4FN7khh");
// var s = new Blockchain.Spender(undefined, function(x){console.log("All ok: " +x);}, function(x){console.log("oh fail: " +x);}, null, null).fromAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF", 10000, 10000).toAddress("17YGjHkWtEVUnN5JXeLfuh5sSMVNMBh2UX", 10000);
// ask for coins: Blockchain.BlockchainAPI.get_unspent(["1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"], function(x){console.log(x);}, undefined, 0, true);
