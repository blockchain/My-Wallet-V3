'use strict';

module.exports = HDWallet;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
var HDAccount = require('./hda');
var WalletCrypto = require('./wallet-crypto');
////////////////////////////////////////////////////////////////////////////////
// Address class
function HDWallet(object){
  // private members
  var obj      = object || {};
  obj.accounts = obj.accounts || [];
  obj.paidTo   = obj.paidTo || {};

  this._seedHex             = obj.seed_hex;
  this._bip39Password       = obj.passphrase;
  this._mnemonic_verified   = obj.mnemonic_verified;
  this._default_account_idx = obj.default_account_idx;
  this._accounts            = obj.accounts || [];

  this._paidTo              = obj.paidTo;

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
  "mnemonicVerified": {
    configurable: false,
    get: function() { return this._mnemonic_verified;}
  },
  "defaultAccountIndex": {
    configurable: false,
    get: function() { return this._default_account_idx;},
    set: function(value) {
      if(this.isValidAccountIndex(value))
        this._default_account_idx = value;
      else
        throw 'Error: unvalid default index account';
    }
  },
  "defaultAccount": {
    configurable: false,
    get: function() {return this._accounts[this._default_account_idx];}
  },
  "accounts": {
    configurable: false,
    get: function() {
      return this._accounts.map(function(a){return (a)});
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

// HDWallet.prototype.newAccount = function(label, secondPassword){
//   // we assume second password active if there is a password
//   var account = HDAccount.new(label);
//   if (this.double_encryption) {
//     assert(pw, "Error: second password needed");
//     ad.encrypt(pw, this.sharedKey, this.pbkdf2_iterations);
//   };
//   this._addresses[ad.addr] = ad;
//   return this;
// };
////////////////////////////////////////////////////////////////////////////////
// JSON serializer

HDWallet.prototype.toJSON = function(){

  var hdwallet = {
    seed_hex            : this._seedHex,
    passphrase          : this._bip39Password,
    mnemonic_verified   : this._mnemonic_verified,
    default_account_idx : this._default_account_idx,
    paidTo              : this._paidTo,
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

HDWallet.prototype.encrypt = function(cipher){
  function f(acc) {acc.encrypt(cipher);};
  this._accounts.forEach(f);
  this._seedHex = chiper(this._seedHex);
  this._bip39Password = this._bip39Password === ""
   ? this._bip39Password
   : cipher(this._bip39Password);
  return this;
};

HDWallet.prototype.decrypt = function(cipher){
  function f(acc) {acc.decrypt(cipher);};
  this._accounts.forEach(f);
  this._seedHex = cipher(this._seedHex);
  this._bip39Password = this._bip39Password === ""
   ? this._bip39Password
   : cipher(this._bip39Password);
  return this;
};
////////////////////////////////////////////////////////////////////////////////
// paid to Dictionary
// {"txhash": {email:email, mobile: null, redeemedAt: null, address: "1x..."}}

HDWallet.prototype.addPaidToElement = function(txHash, element){
  this._paidTo[txHash] = element;
  return this;
};
HDWallet.prototype.getPaidToElement = function(txHash){
  return this._paidTo[txHash];
};
HDWallet.prototype.forEachPaidTo = function(f) {
  // f is a function taking (txHash, paidToElement)
  for (var txHash in this._paidTo) {
    f(txHash, this._paidTo[txHash]);
  };
  return this;
};
////////////////////////////////////////////////////////////////////////////////
// checkers
HDWallet.prototype.isValidAccountIndex = function(index){

  return Helpers.isNumber(index) && index >= 0 && index < this._accounts.length;
};
