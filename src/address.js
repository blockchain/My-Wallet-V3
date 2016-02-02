'use strict';

module.exports = Address;
////////////////////////////////////////////////////////////////////////////////
var Base58   = require('bs58');
var RNG      = require('./rng');
var Bitcoin  = require('bitcoinjs-lib');
var Bip38    = require('bip38');
var Helpers  = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var shared   = require('./shared');
////////////////////////////////////////////////////////////////////////////////
// Address class
function Address(object){
  // private members
  var obj = object || {};
  this._addr  = obj.addr;
  this._priv  = obj.priv;
  this._label = obj.label;
  this._tag   = obj.tag || 0;  //default is non-archived
  this._created_time            = obj.created_time;
  this._created_device_name     = obj.created_device_name;
  this._created_device_version  = obj.created_device_version;
  // non saved properties
  this._balance                 = null; // updated from the server
  this._totalSent               = null;
  this._totalReceived           = null;
}

// public members
Object.defineProperties(Address.prototype, {
  "address": {
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
      if(Helpers.isValidLabel(str) || str == null) {
        this._label = str === ""? undefined : str;
        MyWallet.syncWallet();
      }
      else
        { throw 'Error: address.label must be an alphanumeric string'; }
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
  "balance": {
    configurable: false,
    get: function() { return this._balance;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._balance = num;
      else
        throw 'Error: address.balance must be a number';
    }
  },
  "totalSent": {
    configurable: false,
    get: function() { return this._totalSent;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._totalSent = num;
      else
        throw 'Error: address.totalSent must be a number';
    }
  },
  "totalReceived": {
    configurable: false,
    get: function() { return this._totalReceived;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._totalReceived = num;
      else
        throw 'Error: address.totalReceived must be a number';
    }
  },
  "isWatchOnly": {
    configurable: false,
    get: function() { return this._priv == null;}
  },
  "isEncrypted": {
    configurable: false,
    get: function() { return Helpers.isBase64(this._priv) && !Helpers.isBase58Key(this._priv);}
  },
  "isUnEncrypted": {
    configurable: false,
    get: function() { return Helpers.isBase58Key(this._priv);}
  },
  "archived": {
    configurable: false,
    get: function() { return this._tag === 2;},
    set: function(value) {
      if(Helpers.isBoolean(value)) {
        if (value) { // Archive:
          this._tag = 2;
        } else { // Unarchive:
          this._tag = 0;
          MyWallet.wallet.getHistory();
        }
        MyWallet.syncWallet();
      }
      else
        { throw 'Error: address.archived must be a boolean';};
    }
  },
  "active": {
    configurable: false,
    get: function() { return !this.archived;},
    set: function(value) { this.archived = !value; }
  }
});

Address.factory = function(o,a){
  if (a instanceof Object && !(a instanceof Address)) {
    o[a.addr] = new Address(a);
  }
  else {
    o[a.addr] = a;
  };
  return o;
};

Address.import = function(key, label){
  var object = {
    addr                   : null,
    priv                   : null,
    created_time           : Date.now(),
    created_device_name    : shared.APP_NAME,
    created_device_version : shared.APP_VERSION
  };

  switch (true){
    case Helpers.isBitcoinAddress(key):
      object.addr = key;
      object.priv = null;
      break;
    case Helpers.isKey(key):
      object.addr = key.pub.getAddress().toString();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    case Helpers.isBitcoinPrivateKey(key):
      key = Bitcoin.ECKey.fromWIF(key)
      object.addr = key.pub.getAddress().toString();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    default:
      throw 'Error: address import format not supported';
  };

  //initialization
  var address = new Address(object);
  address._label = label;
  address._tag   = 0; // non-archived
  return address;
};

Address.new = function(label){
  var key = Bitcoin.ECKey.makeRandom(true, RNG.run.bind(RNG));
  return Address.import(key, label);
};

Address.reviver = function(k,v){
  if (k === '') return new Address(v);
  return v;
}

Address.decryptBip38 = function (key, passphrase) {
  try       { var decryptedWIF = new Bip38().decrypt(key, passphrase);  }
  catch (e) { throw 'Invalid private key format';                       }

  var bs58Addr  = Bitcoin.ECKey.fromWIF(decryptedWIF).pub.getAddress().toBase58Check()
    , checksum  = Bitcoin.crypto.hash256(bs58Addr)
    , keyHex    = new Buffer(Base58.decode(key));

  if (checksum[0] != keyHex[3] ||
      checksum[1] != keyHex[4] ||
      checksum[2] != keyHex[5] ||
      checksum[3] != keyHex[6]) {
    throw 'Incorrect password';
  }

  return decryptedWIF;
};

Address.prototype.toJSON = function(){
  var address = {
    addr   : this.address,
    priv   : this.priv,
    tag    : this.tag,
    label  : this.label,
    created_time           : this.created_time,
    created_device_name    : this.created_device_name,
    created_device_version : this.created_device_version
  };
  return address;
};

Address.prototype.encrypt = function(cipher){
  if (!this._priv) return this;
  var priv = cipher ? cipher(this._priv) : this._priv;
  if (!priv) { throw 'Error Encoding key'; };
  this._temporal_priv = priv;
  return this;
};

Address.prototype.decrypt = function(cipher){
  if (!this._priv) return this;
  var priv = cipher ? cipher(this._priv) : this._priv;
  if (!priv) { throw 'Error Decoding key'; };
  this._temporal_priv = priv;
  return this;
};

Address.prototype.persist = function(){
  if (!this._temporal_priv) return this;
  this._priv = this._temporal_priv;
  delete this._temporal_priv;
  return this;
};
