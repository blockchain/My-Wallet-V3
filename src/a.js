'use strict';

module.exports = Address;
////////////////////////////////////////////////////////////////////////////////
var Base58       = require('bs58');
var Bitcoin      = require('bitcoinjs-lib');
var WalletCrypto = require('./wallet-crypto');
var Helpers      = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// Address class
function Address(object){
  // private members
  var obj = object || {};
  this._addr  = obj.addr;
  this._priv  = obj.priv;
  this._label = obj.label;
  this._tag   = obj.tag || 0;  //default is non-archived
  this._created_time           = obj.created_time;
  this._created_device_name    = obj.created_device_name;
  this._created_device_version = obj.created_device_version;
}

// public members
Object.defineProperties(Address.prototype, {
  "addr": {
    configurable: false,
    get: function() { return this._addr;}
  },
  "priv": {
    configurable: false,
    get: function() { return this._priv;}
  },
  "tag": {
    configurable: false,
    get: function() { return this._tag;}
  },
  "label": {
    configurable: false,
    get: function() { return this._label;},
    set: function(str) {
      if (Helpers.isString(str) && Helpers.isAlphaNum(str)){this._label = str;};
    }
  },
  "created_time": {
    configurable: false,
    get: function() {return this._created_time;}
  },
  "created_device_name": {
    configurable: false,
    get: function() {return this._created_device_name;}
  },
  "created_device_version": {
    configurable: false,
    get: function() {return this._created_device_version;}
  },
  "archived": {
    configurable: false,
    get: function() { return this._tag === 2;},
    set: function(value) {
      if (typeof(value) === "boolean") {
        if (value) {this._tag = 2;} else {this._tag = 0;}
      };
    }
  }
});

Address.import = function(key, label){
  var object = {
    addr                   : key.pub.getAddress().toString(),
    priv                   : Base58.encode(key.d.toBuffer(32)),
    created_time           : Date.now(),
    created_device_name    : APP_NAME,
    created_device_version : APP_VERSION
  };
  //initialization
  var address = new Address(object);
  address.label    = label;
  address.archived = false;
  return address;
};

Address.new = function(label){
  var key = Bitcoin.ECKey.makeRandom(true);
  return Address.import(key, label);
};

Address.reviver = function(k,v){
  if (k === '') return new Address(v);
  return v;
}

Address.prototype.toJSON = function(){
  var address = {
    addr: this.addr,
    priv: this.priv,
    tag: this.tag,
    label: this.label,
    created_time: this.created_time,
    created_device_name: this.created_device_name,
    created_device_version: this.created_device_version
  };
  return address;
};

Address.prototype.encrypt = function(password, sharedKey, pbkdf2Iterations){
  var priv = !password || !sharedKey || !pbkdf2Iterations
    ? this._priv
    : WalletCrypto.encryptSecretWithSecondPassword(this._priv, password, sharedKey, pbkdf2Iterations);
  if (!priv) { throw 'Error Encoding key'; };
  this._priv = priv;
  return this;
};

Address.prototype.decrypt = function(password, sharedKey, pbkdf2Iterations){
  var priv = !password || !sharedKey || !pbkdf2Iterations
    ? this._priv
    : WalletCrypto.decryptSecretWithSecondPassword(this._priv, password, sharedKey, pbkdf2Iterations);
  if (!priv) { throw 'Error Decoding key'; };
  this._priv = priv;
  return this;
};

// JSON serialization
// var a = Address.new();
// var json = JSON.stringify(a);
// var parsed = JSON.parse(json, Address.revive);
