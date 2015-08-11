'use strict';

var assert        = require('assert');
var Bitcoin       = require('bitcoinjs-lib');
var RSVP          = require('rsvp');
var MyWallet      = require('./wallet');
var WalletCrypto  = require('./wallet-crypto');
var HDAccount     = require('./hd-account');
var Transaction   = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

////////////////////////////////////////////////////////////////////////////////
//// Spender Class
////////////////////////////////////////////////////////////////////////////////

var Spender = function(listener) {

  var self = this;
  var MAX_SATOSHI       = 2100000000000000;
  var note              = null;
  var secondPassword    = null;
  var sharedKey         = MyWallet.wallet.sharedKey;
  var pbkdf2_iterations = MyWallet.wallet.pbkdf2_iterations;
  var isSweep           = false;
  var addressPair       = {};    // uncompressed Addr -> compressed Addr
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
  this.publish = function(secPass, publicNote){
    secondPassword = secPass;
    note           = publicNote;
    return this.tx.then(signTransaction).then(publishTransaction);
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // FROM
  var prepareFrom = {
    ////////////////////////////////////////////////////////////////////////////
    fromAddress: function(fromAddress) {

      fromAddress = fromAddress === null || fromAddress == undefined ?
        MyWallet.wallet.activeAddresses[0] : fromAddress;
      if (!Array.isArray(fromAddress)) {fromAddress = [fromAddress];}
      coins          = getUnspentCoins(fromAddress);
      changeAddress  = fromAddress[0] || MyWallet.wallet.activeAddresses[0];
      getPrivateKeys = function (tx) {
        var getKeyForAddress = function (addr) {
          var searchAddr = addressPair[addr] === undefined ? addr : addressPair[addr];
          var k = MyWallet.wallet.key(searchAddr).priv;
          var privateKeyBase58 = secondPassword == null ? k : WalletCrypto
            .decryptSecretWithSecondPassword(k, secondPassword, sharedKey, pbkdf2_iterations);
          var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
          var key = MyWallet.privateKeyStringToKey(privateKeyBase58, format);
          if (MyWallet.getCompressedAddressString(key) === addr) {
            key = new Bitcoin.ECKey(key.d, true);
          }
          else if (MyWallet.getUnCompressedAddressString(key) === addr) {
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
      assert(privateKey, "privateKey required");
      var format = MyWallet.detectPrivateKeyFormat(privateKey);
      var key    = MyWallet.privateKeyStringToKey(privateKey, format);

      key.pub.compressed = false;
      var extraAddress = key.pub.getAddress().toString();
      key.pub.compressed = true;
      var addr = key.pub.getAddress().toString();
      var cWIF = key.toWIF();

      if(MyWallet.wallet.addresses.some(function(a){return a !== addr})){
        var addrPromise = MyWallet.wallet.importLegacyAddress(cWIF, "Redeemed code.", secondPassword);
        addrPromise.then(function(A){A.archived = true;})
      }
      addressPair[extraAddress] = addr;
      return prepareFrom.addressSweep([addr, extraAddress]);
    },
    ////////////////////////////////////////////////////////////////////////////
    fromAccount: function(fromIndex){
      assert(fromIndex !== undefined || fromIndex !== null, "from account index required");
      var fromAccount = MyWallet.wallet.hdwallet.accounts[fromIndex];
      changeAddress   = fromAccount.changeAddress;
      coins           = getUnspentCoins([fromAccount.extendedPublicKey]);
      getPrivateKeys  = function (tx) {
        var extendedPrivateKey = fromAccount.extendedPrivateKey === null || secondPassword === null
          ? fromAccount.extendedPrivateKey
          : WalletCrypto.decryptSecretWithSecondPassword( fromAccount.extendedPrivateKey
                                                        , secondPassword
                                                        , sharedKey
                                                        , pbkdf2_iterations);
        var getKeyForPath = function (neededPrivateKeyPath) {
          var keyring = new KeyRing(extendedPrivateKey);
          return keyring.privateKeyFromPath(neededPrivateKeyPath);
        };
        return tx.pathsOfNeededPrivateKeys.map(getKeyForPath);
      };
      return prepareTo;
    }
  };
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // TO
  var prepareTo = {
    ////////////////////////////////////////////////////////////////////////////
    toAddress: function(toAddress, amount, fee) {

      assert(toAddress, "toAddress required");
      assert(amount || isSweep, "amounts required");
      if (!Array.isArray(toAddress)) {toAddress = [toAddress];}
      if (!Array.isArray(amount)) {amount = [amount];}
      if (!isSweep) {
        assert(amount.reduce(Helpers.add,0) <= MAX_SATOSHI, "max bitcoin amount of 21 Million");
        amounts     = amount;
      };
      toAddresses = toAddress;
      forcedFee   = fee;
      self.tx = coins.then(buildTransaction);
      return self;
    },
    ////////////////////////////////////////////////////////////////////////////
    toAccount: function(toIndex, amount, fee) {
      assert(toIndex !== undefined || toIndex !== null, "to account index required");
      var account = MyWallet.wallet.hdwallet.accounts[toIndex];
      return prepareTo.toAddress(account.receiveAddress, amount, fee);
    },
    ////////////////////////////////////////////////////////////////////////////
    toEmail: function(email) {
      // TODO
    },
    ////////////////////////////////////////////////////////////////////////////
    toMobile: function(mobile) {
      // TODO
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
    var getValue = function(coin) {return coin.value;};
    if (isSweep) {
      var estimatedFee = Helpers.isNumber(forcedFee) ?
        forcedFee : Helpers.guessFee(coins.length, 2, MyWallet.wallet.fee_per_kb);
      amounts = coins.map(getValue).reduce(Helpers.add,0) - estimatedFee;
    };
    var tx = new Transaction(coins, toAddresses, amounts, forcedFee, changeAddress, listener);
    return tx;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // publishTransaction :: Transaction -> Transaction
  function signTransaction(transaction) {
    var getValue = function(coin) {return coin.value;};
    var isSmall = function(value) {return value < 500000;};
    var anySmall = transaction.transaction.outs.map(getValue).some(isSmall);
    if(anySmall && note !== undefined && note !== null)
      {throw "There is an output too small to publish a note";}
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

module.exports = Spender;
