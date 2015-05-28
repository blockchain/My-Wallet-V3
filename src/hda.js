'use strict';

module.exports = HDAccount;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// HDAccount class
function HDAccount(object){

  var obj = object || {};
  obj.cache = obj.cache || {};

  this._label = obj.label;
  this._archived = obj.archived;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._receiveAccountCache = obj.cache.receiveAccount;
  this._changeAccountCache = obj.cache.changeAccount;
}

HDAccount.example = function(){
  var object = {
    label: "my new account",
    archived: false,
    xpriv: "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVtirpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g",
    xpub: "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ",
    // address_label: [{"index":0,"label":"first payment received","address":"1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"},{"index":1,"label":"second address","address":"14m58GqSxSKPH2cVx3o8vB26gAuoKqiwej"}],
    cache: {
      receiveAccount :"xpub6EjrVkXYSDBsnqR3yh4d7XsZVbG8ytXU7zWa8pgSmCyxSeURGHJE6mQWvdvoE1tWn2MzsCjZ7ZFEXQwBKegG3rjnoJRW6DMRNMn5Cpvh6XJ",
      changeAccount  :"xpub6EjrVkXYSDBssYWSbuWwHDvneJqYnYoNhAXtjrpoEkiHctqp9hgRMxgyspRaHhCLDuMHY2fhbNbDmL4pgfKkbyq2pZRepdjV2meeSGmcCfT"
    }
  };
  return new HDAccount(object);
};

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
  "extendedPublicKey": {
    configurable: false,
    get: function() { return this._xpub;},
  },
  "extendedPrivateKey": {
    configurable: false,
    get: function() { return this._xpriv;},
  },
  "receiveAccountCache": {
    configurable: false,
    get: function() { return this._receiveAccountCache;},
  },
  "changeAccountCache": {
    configurable: false,
    get: function() { return this._changeAccountCache;},
  }
});

HDAccount.reviver = function(k,v){
  if (k === '') return new HDAccount(v);
  return v;
};

HDAccount.prototype.toJSON = function(){
  var hdaccount = {
    label: this.label,
    archived: this.archived,
    xpriv : this.extendedPrivateKey,
    xpub : this.extendedPublicKey,
    // address_labels: this.address_labels,
  };
  if(this.receiveAccountCache || this.changeAccountCache){hdaccount.cache = {};};
  if(this.receiveAccountCache) {hdaccount.cache.receiveAccount = this.receiveAccountCache;};
  if(this.changeAccountCache) {hdaccount.cache.changeAccount = this.changeAccountCache;};

  return hdaccount;
};

// var x = Blockchain.HDAccount.example();
// var y = JSON.stringify(x, null, 2);
// JSON.parse(y, Blockchain.HDAccount.reviver);
