'use strict';

module.exports = Wallet;

////////////////////////////////////////////////////////////////////////////////
// dependencies
var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var ECKey = Bitcoin.ECKey;
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDWallet = require('./hdw');
var HDAccount = require('./hda');
var Address = require('./a');
var Helpers = require('./helpers');

////////////////////////////////////////////////////////////////////////////////
// Wallet

function Wallet(object) {

  var obj        = object || {};
  obj.options    = obj.options || {};
  obj.keys       = obj.keys || [];
  obj.hd_wallets = obj.hd_wallets || [];

  this._guid              = obj.guid;
  this._sharedKey         = obj.sharedKey;
  this._double_encryption = obj.double_encryption || false;
  this._dpasswordhash     = obj.dpasswordhash;
  //options
  this._pbkdf2_iterations        = obj.options.pbkdf2_iterations;
  this._fee_policy               = obj.options.fee_policy;
  this._enable_multiple_accounts = obj.options.enable_multiple_accounts;
  this._html5_notifications      = obj.options.html5_notifications;
  this._logout_time              = obj.options.logout_time;

  // legacy addresses list
  this._addresses = obj.keys ? obj.keys.reduce(Address.factory, {}) : undefined;
  // hdwallets list
  this._hd_wallets = obj.hd_wallets ? obj.hd_wallets.map(HDWallet.factory) : undefined;

  // paidTo dictionary
  this._paidTo = obj.paidTo || {};
  Helpers.merge(this._paidTo, this.hdwallet._paidTo); // move paidTo from the wrong place
  delete this.hdwallet._paidTo;

  // address book list
  this._address_book = obj.address_book || [];

  // tx_notes dictionary
  this._tx_notes = obj.tx_notes || {};

  // tx_tags list (not sure if list or object)
  // this._tx_tags = obj.tx_tags || [];

  // tag_names list (check how is represented each tag-name)
  this._tx_names = obj.tx_names || [];
}

Object.defineProperties(Wallet.prototype, {
  "guid": {
    configurable: false,
    get: function() { return this._guid;}
  },
  "sharedKey": {
    configurable: false,
    get: function() { return this._sharedKey;}
  },
  "isDoubleEncrypted": {
    configurable: false,
    get: function() { return this._double_encryption;}
  },
  "dpasswordhash": {
    configurable: false,
    get: function() { return this._dpasswordhash;}
  },
  "fee_policy": {
    configurable: false,
    get: function() { return this._fee_policy;}
  },
  "pbkdf2_iterations": {
    configurable: false,
    get: function() { return this._pbkdf2_iterations;},
    set: function(value) {
      if(Helpers.isNumber(value))
        // this needs to reencrypt the wallets probably
        this._pbkdf2_iterations = value;
      else
        throw 'Error: wallet.pbkdf2_iterations must be a number';
    }
  },
  "addresses": {
    configurable: false,
    get: function(){return Object.keys(this._addresses);}
  },
  "key": {
    configurable: false,
    value: function(addr) {return this._addresses[addr];}
  },
  "keys": {
    configurable: false,
    get: function() {
      var that = this;
      return that.addresses.map(function(a){return that.key(a)});
    }
  },
  "hdwallet": {
    configurable: false,
    get: function() {return this._hd_wallets[0];}
  },
  "isUpgradedToHD":{
    configurable: false,
    get: function() {return !(this._hd_wallets === undefined || this._hd_wallets === null);}
  },
  "isMultipleAccount":{
    configurable: false,
    get: function() {return this._enable_multiple_accounts;}
  }
});

Wallet.prototype.toJSON = function(){
  var wallet = {
    guid              : this.guid,
    sharedKey         : this.sharedKey,
    double_encryption : this.double_encryption,
    dpasswordhash     : this.dpasswordhash,
    options           : {
      pbkdf2_iterations        : this.pbkdf2_iterations,
      fee_policy               : this.fee_policy,
      enable_multiple_accounts : this.isMultipleAccount,
      html5_notifications      : this._html5_notifications,
      logout_time              : this._logout_time
    },
    address_book      : this._address_book,
    tx_notes          : this._tx_notes,
    // tx_tags           : this._tx_tags,
    tx_names          : this._tx_names,
    keys              : this.keys,
    hd_wallets        : this._hd_wallets,
    paidTo            : this._paidTo
  };
  return wallet;
};

Wallet.prototype.importLegacyAddress = function(key, label, secPass){
  var ad = Address.import(key, label);
  if (this.double_encryption) {
    assert(secPass, "Error: second password needed");
    ad.encrypt(secPass, this.sharedKey, this.pbkdf2_iterations);
  };
  this._addresses[ad.addr] = ad;
  return this;
};

Wallet.prototype.newLegacyAddress = function(label, pw){
  var ad = Address.new(label);
  if (this.double_encryption) {
    assert(pw, "Error: second password needed");
    ad.encrypt(pw, this.sharedKey, this.pbkdf2_iterations);
  };
  this._addresses[ad.addr] = ad;
  return this;
};

Wallet.prototype.setDefaultPbkdf2Iterations = function(){
  this.pbkdf2_iterations = 5000;
  return this;
};

Wallet.prototype.validateSecondPassword = function(inputString) {

  // old wallets default_iterations is 10
  var it = !this._pbkdf2_iterations ? 10 : this._pbkdf2_iterations;
  var password_hash = WalletCrypto.hashNTimes(this._sharedKey + inputString, it);
  return password_hash === this._dpasswordhash;
};

Wallet.prototype.encrypt = function(pw){
  if (!this._double_encryption) {
    var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
    var f = function(element) {element.encrypt(g);};
    this.keys.forEach(f);
    this._hd_wallets.forEach(f);
    this._dpasswordhash = WalletCrypto.hashNTimes(this._sharedKey + pw, this._pbkdf2_iterations);
    this._double_encryption = true;
  };
  return this;
};

Wallet.prototype.decrypt = function(pw){
  if (this._double_encryption) {
    var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "dec");
    var f = function(element) {element.decrypt(g);};
    this.keys.forEach(f);
    this._hd_wallets.forEach(f);
    this._dpasswordhash = undefined;
    this._double_encryption = false;
  };
  return this;
};

// example wallet. This should be the new constructor (ask server data)
Wallet.example = function(){
  var object = {
    guid              : "37f008fe-4456-43b8-8862-d2ac67053f52",
    sharedKey         : "f5c0e85d-b379-4588-ad2b-052360b6e6ec",
    double_encryption : true,
    dpasswordhash     : "9f334a27ba54e317ae351177c5cdb1ec5d1463e7a03ee0da6fb7ae6aada72682",
    options: {
      fee_policy        :  0,
      pbkdf2_iterations : 5000
    }
  };
  return new Wallet(object);
};

Wallet.reviver = function(k,v){

  function reviveHDAccount(o) { return new HDAccount(o);};
  function reviveHDWallet(o)  { return new HDWallet(o);};
  function reviveAddress(o,a) { o[a.addr] = new Address(a); return o;};

  if (k === '')
    return new Wallet(v);
  if (k === 'keys')
    return v.reduce(reviveAddress, {})
  if (k === 'hd_wallets')
    return v.map(reviveHDWallet);
  if (k === 'accounts')
    return v.map(reviveHDAccount);

  // default
  return v;
};

Wallet.prototype.newAccount = function(label, pw){
  var cipher = undefined;
  if (this._double_encryption) {
    cipher = WalletCrypto.cipherFunction.bind(undefined, pw, this._sharedKey, this._pbkdf2_iterations);
  };
  this.hdwallet.newAccount(label, cipher);
  return this;
};

// example of serialization
// var x = Blockchain.Wallet.new();
// x.newLegacyAddress();
// x.newLegacyAddress();
// x.newLegacyAddress();
// var j = JSON.stringify(x,null,2);
// var t = JSON.parse(j,Blockchain.Wallet.reviver);

// loading old wallet to new model
// var o = Blockchain.MyWallet.makeWalletJSON();
// var n = JSON.parse(o,Blockchain.Wallet.reviver);
