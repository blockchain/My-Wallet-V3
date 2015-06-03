'use strict';

module.exports = HDAccount;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');

////////////////////////////////////////////////////////////////////////////////
// HDAccount Raw Constructor

function HDAccount(object){

  var obj = object || {};
  obj.cache = obj.cache || {};

  // serializable data
  this._label    = obj.label;
  this._archived = obj.archived || false;
  this._xpriv    = obj.xpriv;
  this._xpub     = obj.xpub;
    // Cache for ChainCode to improve init speed
  this._cache    = obj.cache;
  // this._address_labels  // this is on the json too
  this._network  = obj.network || Bitcoin.networks.bitcoin;

  // computed properties
  this._receiveChain  = null;
  this._changeChain   = null;
  this._receiveIndex  = 0;
  this._changeIndex   = 0;
  this._n_tx          = 0;
  this._numTxFetched  = 0;
  this._balance       = null;

  // In-memory cache for generated keys
  this.receiveKeyCache = [];
  this.changeKeyCache = [];
}

////////////////////////////////////////////////////////////////////////////////
// PUBLIC PROPERTIES

Object.defineProperties(HDAccount.prototype, {

  "label": {
    configurable: false,
    get: function() { return this._label;},
    set: function(str) {
      if (Helpers.isString(str) && Helpers.isAlphaNum(str)){this._label = str;};
    }
  },
  "archived": {
    configurable: false,
    get: function() { return this._archived;},
    set: function(value) {
      if (typeof(value) === "boolean") {this._archived = value;};
    }
  },
  // "extendedPublicKey": {
  //   configurable: false,
  //   get: function() { return this._xpub;},
  // },
  "extendedPrivateKey": {
    configurable: false,
    get: function() { return this._xpriv;},
  }
});

////////////////////////////////////////////////////////////////////////////////
// CONSTRUCTORS

HDAccount.example = function(){

  return HDAccount.fromExtKey("xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVtirpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g", "Example account");
};

/* BIP 44 defines the following 5 levels in BIP32 path:
 * m / purpose' / coin_type' / account' / change / address_index
 * Apostrophe in the path indicates that BIP32 hardened derivation is used.
 *
 * Purpose is a constant set to 44' following the BIP43 recommendation
 * Registered coin types: 0' for Bitcoin
 */
HDAccount.fromAccountMasterKey = function(accountZero, label){

  assert(accountZero, "Account MasterKey must be given to create an account.");
  var receive = accountZero.derive(0);
  var change = accountZero.derive(1);
  var account    = new HDAccount();
  account.label  = label;
  account._xpriv = accountZero.toBase58();
  account._xpub  = accountZero.neutered().toBase58();
  account._receiveChain = receive;
  account._changeChain  = change;
  account.generateCache();
  return account;
};

HDAccount.fromWalletMasterKey = function(masterkey, index, label) {

  assert(masterkey, "Wallet MasterKey must be given to create an account.");
  assert(Helpers.isNumber(index), "Derivation index must be an integer.");
  var accountZero = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(index);
  return HDAccount.fromAccountMasterKey(accountZero, label);
};

HDAccount.fromExtKey = function(extKey, label){

  assert(extKey, "Extended private key must be given to create an account.");
  var accountZero = Bitcoin.HDNode.fromBase58(extKey);
  return HDAccount.fromAccountMasterKey(accountZero, label);
};

////////////////////////////////////////////////////////////////////////////////
// JSON DESERIALIZER
HDAccount.reviver = function(k,v){

  switch(k) {
    case '':
      return new HDAccount(v);
      break;
    case 'label':
      return Helpers.isString(v) && Helpers.isAlphaNum(v) ? v : undefined;
      break;
    case 'archived':
      return typeof(v) === "boolean" ? v : false;
      break;
    // add more checks over the keys
    default:
      return v;
  }
};

HDAccount.fromJSON = function(text){

  var account = JSON.parse(text, HDAccount.reviver);
  // check for missing fields
    // account.drama ? console.log("tenim drama") : console.log("no tenim drama");

  account.restoreChains();
  // probably we should backup after making sanity checks when loading if something changed


  return account;
};

////////////////////////////////////////////////////////////////////////////////
// JSON SERIALIZER

HDAccount.prototype.toJSON = function(){

  // should we add checks on the serializer too?
  var hdaccount = {
    label    : this._label,
    archived : this._archived,
    xpriv    : this._xpriv,
    xpub     : this._xpub,
    cache    : this._cache
  };

  return hdaccount;
};


// address_labels":[
//   {
//   "index":0,
//   "label":"first payment received",
//   "address":"1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"}
//   ,
//   {"index":1,"label":"second address","address":"14m58GqSxSKPH2cVx3o8vB26gAuoKqiwej"}]
////////////////////////////////////////////////////////////////////////////////
// METHODS
HDAccount.prototype.isCached = function(){

  var x = (this._cache && this._cache.receiveAccount && this._cache.changeAccount);
  return (x !== null) && (x !== undefined);
};

HDAccount.prototype.restoreChains = function(){

  if (this.isCached()) {
    this._receiveChain = Bitcoin.HDNode.fromBase58(cache.receiveAccount);
    this._changeChain = Bitcoin.HDNode.fromBase58(cache.changeAccount);
  }
  else {
    var accountZero = Bitcoin.HDNode.fromBase58(this._xpriv);
    this._receiveChain = accountZero.derive(0);
    this._changeChain = accountZero.derive(1);
    this.generateCache();
  };
  return this;
};

HDAccount.prototype.generateCache = function() {

  assert(this._receiveChain, "External Account not set");
  assert(this._changeChain, "Internal Account not set");
  this._cache = {};
  this._cache.receiveAccount = this._receiveChain.neutered().toBase58();
  this._cache.changeAccount = this._changeChain.neutered().toBase58();
  return this;
};

// var x = Blockchain.HDAccount.example();
// delete x._cache
// var j = JSON.stringify(x, null, 2);
// var xx = Blockchain.HDAccount.fromJSON(j);
