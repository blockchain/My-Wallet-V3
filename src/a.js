'use strict';

module.exports = Address;

var Base58 = require('bs58');
var WalletCrypto = require('./wallet-crypto');
////////////////////////////////////////////////////////////////////////////////
// Address class
function Address(obj, parent){

  function isString(str) {return typeof str == 'string' || str instanceof String;}
  function isAlphaNum(str) {return /^[\-+,._\w\d\s]+$/.test(str);}

  // members
  var addr                   = obj.addr;
  var priv                   = obj.priv;
  var tag                    = obj.tag;
  var label                  = obj.label;
  var created_time           = obj.created_time;
  var created_device_name    = obj.created_device_name;
  var created_device_version = obj.created_device_version;
  var wallet   = parent;
  var archived = undefined;

  if(tag === 0){archived = false;}
  if(tag === 2){archived = true;}

  // getters and setters
  Object.defineProperties(this, {
    "addr": {
      enumerable: true,
      get: function() { return addr;}
    },
    "priv": {
      enumerable: true,
      get: function() { return priv;}
    },
    "label": {
      enumerable: true,
      get: function() { return label;},
      set: function(str) {
        if (isString(str) && isAlphaNum(str)){label = str;};
      }
    },
    "tag": {
      enumerable: true,
      get: function() { return tag;},
    },
    "created_time": {
      enumerable: true,
      get: function() {return created_time;}
    },
    "created_device_name": {
      enumerable: true,
      get: function() {return created_device_name;}
    },
    "created_device_version": {
      enumerable: true,
      get: function() {return created_device_version;}
    },
    ////////////////////////////////////////////////////////////////////////////
    // computed properties
    "archived": {
      enumerable: false,
      get: function() { return archived;},
      set: function(value) {
        if (typeof(value) === "boolean") {
          archived = value
          if (archived) {tag = 2;} else {tag = 0;}
        };
      }
    }
  });
  //////////////////////////////////////////////////////////////////////////////
  // public methods
  // this.archive = function(){
  //   tag = 2;
  //   archived = true;
  // };
  // this.unArchive = function(){
  //   tag = 0;
  //   archived = false;
  // };
  this.encrypt = function(pw) {
    priv = priv === null || pw === null || pw === undefined
      ? priv
      : WalletCrypto.encryptSecretWithSecondPassword(priv, pw, wallet.sharedKey, wallet.pbkdf2_iterations);
    if (priv === null) { throw 'Error Encoding key'; };
  };
  this.decrypt = function(pw) {
    priv = priv === null || pw === null || pw === undefined
      ? priv
      : WalletCrypto.decryptSecretWithSecondPassword(priv, pw, wallet.sharedKey, wallet.pbkdf2_iterations);
    if (priv === null) { throw 'Error Decoding key'; };
  };
  this.fromKey = function(_key, _pw, _label){
    addr     = _key.pub.getAddress().toString();
    priv     = Base58.encode(_key.d.toBuffer(32));
    created_time           = Date.now();
    created_device_name    = APP_NAME;
    created_device_version = APP_VERSION;
    // this.unArchive();
    this.archived = false;
    this.label = _label;
    this.encrypt(_pw);
  };
}
