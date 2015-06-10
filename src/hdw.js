'use strict';

module.exports = HDWallet;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
var HDAccount = require('./hda');
////////////////////////////////////////////////////////////////////////////////
// Address class
function HDWallet(object){
  // private members
  var obj      = object || {};
  obj.accounts = obj.accounts || [];

  this._seedHex             = obj.seed_hex;
  this._bip39Password       = obj.passphrase;
  this._mnemonic_verified   = obj.mnemonic_verified;
  this._default_account_idx = obj.default_account_idx;
  this._accounts            = obj.accounts;

  // missing paid to dictionary

  //computed properties
  this._numTxFetched = 0;
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

HDWallet.example = function(){
  var object = {
    seedHex : "f56bf734c9bb4e8d08dd645e9d6adc68",
    bip39Password : ""
  };
  return new HDWallet(object);
};

HDWallet.prototype.toJSON = function(){

  var hdwallet = {
    seed_hex            : this._seedHex,
    passphrase          : this._bip39Password,
    mnemonic_verified   : this._mnemonic_verified,
    default_account_idx : this._default_account_idx,
    accounts            : this._accounts
  };
  return hdwallet;
};
