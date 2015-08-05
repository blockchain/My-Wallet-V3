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

////////////////////////////////////////////////////////////////////////////////
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
// publishTransaction :: String -> Transaction -> Promise ()

function publishTransaction(note, signedTransaction) {
  var defer = RSVP.defer();
  var success = function(tx_hash) { defer.resolve(signedTransaction.getId());  };
  var error   = function(e)       { defer.reject (e.message || e.responseText);};
  BlockchainAPI.push_tx(signedTransaction, note, success, error);
  return defer.promise;
};

var NewSpender = function(secondPassword, note, listener) {

  var self = this;
  this.p1 = null;
  this.p2 = null;
  this.p3 = null;

  if(typeof(listener) == "undefined" || listener == null) { listener = {}; };

  var prepareFrom = {
    fromAddress: function(fromAddress, amount, feeAmount) {
      console.log("fromAddress");
      self.p2 = fromAddress;
      // check parameters
      // obtain from address if empty
      // obtain change address
      // obtain coins promise
      // set getPrivateKeys function
      return prepareTo;
    },
    addressSweep: function(fromAddress) {
      console.log("sweep");
      // set isSweep true
      // obtain fee
      // move to from Address
      return prepareTo;
    },
    fromPrivateKey: function(privateKey) {
      console.log("redeem key");
      // transform privateKey -> [comp address, uncom addr]
      // if address is not in wallet, import and archive as compressed
      // move to sweep(address)
      return prepareTo;
    },
    fromAccount: function(fromIndex, amount, feeAmount){
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

  var prepareTo = {
    toAddress: function(toAddress) {
      console.log("toAddress");
      self.p3 = toAddress;
      return self;
    },
    toAddresses: function(toAddresses, amounts){
      console.log("toAddresses");
    },
    toAccount: function(toIndex) {
      console.log("toAccount");
    },
    toEmail: function(email) {
      console.log("toEmail");
    },
    toMobile: function(mobile) {
      console.log("toMobile");
    }
  };

  self.p1 = secondPassword;
  //////////////////////////////////////////////////////////////////////////////
  return prepareFrom;
};


NewSpender.prototype.send = function(){
  // finally push the tx with the revewied fee
};

NewSpender.prototype.getSuggestedFee = function(){
  // I need to obtain the fee before deciding if I send the tx or not
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
module.exports = {
  getUnspentCoins: getUnspentCoins,
  publishTransaction: publishTransaction,
  NewSpender: NewSpender
};
