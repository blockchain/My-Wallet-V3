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
  },
  "mnemonic_verified": {
    configurable: false,
    get: function() { return this._mnemonic_verified;}
  },
  "default_account_idx": {
    configurable: false,
    get: function() { return this._default_account_idx;},
    set: function(value) {
      if(this.isValidAccountIndex(value))
        this._default_account_idx = value;
      else
        throw 'Error: unvalid default index account';
    }
  }
});
////////////////////////////////////////////////////////////////////////////////
// Constructors

HDWallet.example = function(){

  var object = {
    seedHex : "f56bf734c9bb4e8d08dd645e9d6adc68",
    bip39Password : ""
  };
  return new HDWallet(object);
};

// we need 3 actions
// new hdwallet
// load hdwallet
// restore hdwallet

HDWallet.new = function(seedHex, bip39Password){

  assert(Helpers.isString(seedHex), 'hdwallet.seedHex must exist');
  if (!Helpers.isString(bip39Password)) bip39Password = "";
  var hdwallet = {
    seed_hex            : seedHex,
    passphrase          : bip39Password,
    mnemonic_verified   : false,
    default_account_idx : 0,
    accounts            : []
  };
  return new HDWallet(hdwallet);
};

////////////////////////////////////////////////////////////////////////////////
// JSON serializer

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
////////////////////////////////////////////////////////////////////////////////
// methods

HDWallet.prototype.verifyMnemonic = function(){

  this._mnemonic_verified = true;
  return this;
};
////////////////////////////////////////////////////////////////////////////////
// account managment

HDWallet.prototype.newAccount = function(label){

// ESTIC AQUI, de moment no implemento second password.
  return this;
};


////////////////////////////////////////////////////////////////////////////////
// checkers
HDWallet.prototype.isValidAccountIndex = function(index){

  return Helpers.isNumber(index) && index >= 0 && index < this._accounts.length;
};
