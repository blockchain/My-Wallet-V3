'use strict';

module.exports = HDWallet;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// Address class
function HDWallet(object){
  // private members
  var obj = object || {};
  this._seedHex = obj.seedHex;
  this._bip39Password = obj.bip39Password;
  //construct hdaccounts here
  this._accountArray = [];
  // this._numTxFetched = 0;
}

Object.defineProperties(HDWallet.prototype, {
  "seedHex": {
    configurable: false,
    get: function() { return this._seedHex;}
  },
  "bip39Password": {
    configurable: false,
    get: function() { return this._bip39Password;}
  }
});

// HDWallet.load = function(seedHexString, accounts, bip39Password, secondPassword){
//   assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");
//   var object = {}
//   object.seedHex = seedHexString;
//   object.bip39Password = bip39Password;
//   var hdwallet = new HDWallet(object);
//   // construct accounts from accounts

//   //return the new object
//   return hdwallet;
// };

HDWallet.example = function(){
  var object = {
    seedHex : "f56bf734c9bb4e8d08dd645e9d6adc68",
    bip39Password : ""
  };
  return new HDWallet(object);
};
