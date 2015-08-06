'use strict';

var assert        = require('assert');
var Bitcoin       = require('bitcoinjs-lib');
var RSVP          = require('rsvp');
var Base58        = require('bs58');
var MyWallet      = require('./wallet');
var WalletStore   = require('./wallet-store');
var WalletCrypto  = require('./wallet-crypto');
var HDAccount     = require('./hd-account');
var Transaction   = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

////////////////////////////////////////////////////////////////////////////////
//// Spender Class
////////////////////////////////////////////////////////////////////////////////

var NewSpender = function(secondPassword, note, listener) {

  var self = this;
  var MAX_SATOSHI       = 2100000000000000;
  var note              = note;
  var secondPassword    = secondPassword;
  var sharedKey         = MyWallet.wallet.sharedKey;
  var pbkdf2_iterations = MyWallet.wallet.pbkdf2_iterations;
  var isSweep           = false;
  var coins             = null;  // promise of unspentCoins
  var toAddresses       = null;  // array of addresses to pay
  var amounts           = null;  // array of amounts   to pay
  var changeAddress     = null;  // change address
  var forcedFee         = null;
  var getPrivateKeys    = null;  // function :: tx -> [keys]
  this.tx               = null;  // tx proposal promise

  if(typeof(listener) == "undefined" || listener == null) { listener = {}; };

  //////////////////////////////////////////////////////////////////////////////
  // prublic methods:
  this.publish = function(){
    return this.tx.then(signTransaction).then(publishTransaction);
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // FROM
  var prepareFrom = {
    ////////////////////////////////////////////////////////////////////////////
    fromAddress: function(fromAddress) {

      assert(fromAddress, "fromAddress required");
      if (!Array.isArray(fromAddress)) {fromAddress = [fromAddress];}

      coins         = getUnspentCoins(fromAddress);
      changeAddress = fromAddress[0] || MyWallet.wallet.activeAddresses[0];

      getPrivateKeys = function (tx) {
        var getKeyForAddress = function (neededPrivateKeyAddress) {
          var k = MyWallet.wallet.key(neededPrivateKeyAddress).priv;
          var privateKeyBase58 = secondPassword == null ? k : WalletCrypto
            .decryptSecretWithSecondPassword(k, secondPassword, sharedKey, pbkdf2_iterations);
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

      return prepareTo;
    },
    // ////////////////////////////////////////////////////////////////////////////
    addressSweep: function(fromAddress) {
      isSweep = true;
      return prepareFrom.fromAddress(fromAddress);
    },
    ////////////////////////////////////////////////////////////////////////////
    fromPrivateKey: function(privateKey) {
      console.log("redeem key");
      // transform privateKey -> [comp address, uncom addr]
      // if address is not in wallet, import and archive as compressed
      // move to sweep(address)
      return prepareTo;
    },
    ////////////////////////////////////////////////////////////////////////////
    fromAccount: function(fromIndex){
      console.log("fromAccount");
      // check parameteres
      // obtain account
      // - obtain change address
      // obtain coins Promise
      // set getPrivateKeys function tx -> [keys]
      // return spend
      return prepareTo;
    }
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // TO
  var prepareTo = {
    ////////////////////////////////////////////////////////////////////////////
    // toaddress and amount can be arrays or not
    // if fee is ignored, it is computed per kb
    toAddress: function(toAddress, amount, fee) {

      assert(toAddress, "toAddress required");
      assert(amount   , "amounts required");
      if (!Array.isArray(toAddress)) {toAddress = [toAddress];}
      if (!Array.isArray(amount)) {amount = [amount];}
      assert(amount.reduce(Helpers.add,0) <= MAX_SATOSHI, "max bitcoin amount of 21 Million");
      amounts     = amount;
      toAddresses = toAddress;
      forcedFee   = fee;
      self.tx = coins.then(buildTransaction);
      return self;
    },
    ////////////////////////////////////////////////////////////////////////////
    toAccount: function(toIndex) {
      console.log("toAccount");
    },
    ////////////////////////////////////////////////////////////////////////////
    toEmail: function(email) {
      console.log("toEmail");
    },
    ////////////////////////////////////////////////////////////////////////////
    toMobile: function(mobile) {
      console.log("toMobile");
    }
  };

  return prepareFrom;

  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // private methods:
  //////////////////////////////////////////////////////////////////////////////
  // getUnspentCoins :: [address] -> Promise [coins]
  function getUnspentCoins(addressList) {
    var defer = RSVP.defer();
    var processCoins = function (obj) {
      var processCoin = function(utxo) {
        var txBuffer = new Buffer(utxo.tx_hash, "hex");
        Array.prototype.reverse.call(txBuffer);
        utxo.hash = txBuffer.toString("hex");
        utxo.index = utxo.tx_output_n;
      };
      obj.unspent_outputs.forEach(processCoin);
      console.log("obtained coins: " + obj.unspent_outputs);
      defer.resolve(obj.unspent_outputs);
    }
    var errorCoins = function(e) {
      defer.reject(e.message || e.responseText);
    }
    BlockchainAPI.get_unspent(addressList, processCoins, errorCoins, 0, true);
    return defer.promise;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // buildTransaction :: [coins] -> Transaction
  function buildTransaction(coins){
    var tx = new Transaction(coins, toAddresses, amounts, forcedFee, changeAddress, listener);
    return tx;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // publishTransaction :: Transaction -> Transaction
  function signTransaction(transaction) {
    var keys = getPrivateKeys(transaction);
    transaction.addPrivateKeys(keys);
    transaction.randomizeOutputs();
    var signedTransaction = transaction.sign();
    return signedTransaction;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // publishTransaction :: String -> Transaction -> Promise ()
  function publishTransaction(signedTransaction) {
    var defer = RSVP.defer();
    var success = function(tx_hash) { defer.resolve(signedTransaction.getId());  };
    var error   = function(e)       { defer.reject (e.message || e.responseText);};
    BlockchainAPI.push_tx(signedTransaction, note, success, error);
    return defer.promise;
  };
////////////////////////////////////////////////////////////////////////////////
};

module.exports = NewSpender;

// xpub6DHN1xpggNEUfaV926XgSfRSgRtDx9nE3gEpndGZPwaAjiJzDqQfGGf5vDNZzvQe2ycq5EiUdhcJGzQ3xKL2W6eGCzs8Z2prKqoqxtu1rZC
// var a = new Blockchain.Test("hola", undefined, undefined);
// var b = a.fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX");
// var c = b.toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF", 10000);
// var p = c.publish();
// var algo = new Blockchain.Test("hola", undefined, undefined).fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX").toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF", 10000).publish();
// see suggested fee
// c.tx.then(function(t){console.log(t.fee)});
