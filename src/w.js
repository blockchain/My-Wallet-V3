'use strict';

module.exports = Wallet;

////////////////////////////////////////////////////////////////////////////////
// dependencies

var assert = require('assert');
var xregexp = require('xregexp');
var Bitcoin = require('bitcoinjs-lib');
var ECKey = Bitcoin.ECKey;
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var WalletSignup = require('./wallet-signup');
var ImportExport = require('./import-export');
var HDWallet = require('./hd-wallet');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Address = require('./a');

////////////////////////////////////////////////////////////////////////////////
// Address class


// function Address(obj, parent){

//   function isString(str) {return typeof str == 'string' || str instanceof String;}
//   function isAlphaNum(str) {return /^[\-+,._\w\d\s]+$/.test(str);}

//   // members
//   var addr                   = obj.addr;
//   var priv                   = obj.priv;
//   var tag                    = obj.tag;
//   var label                  = obj.label;
//   var created_time           = obj.created_time;
//   var created_device_name    = obj.created_device_name;
//   var created_device_version = obj.created_device_version;
//   var wallet   = parent;
//   var archived = undefined;

//   if(tag === 0){archived = false;}
//   if(tag === 2){archived = true;}

//   // getters and setters
//   Object.defineProperties(this, {
//     "addr": {
//       enumerable: true,
//       get: function() { return addr;}
//     },
//     "priv": {
//       enumerable: true,
//       get: function() { return priv;}
//     },
//     "label": {
//       enumerable: true,
//       get: function() { return label;},
//       set: function(str) {
//         if (isString(str) && isAlphaNum(str)){label = str;};
//       }
//     },
//     "tag": {
//       enumerable: true,
//       get: function() { return tag;},
//     },
//     "created_time": {
//       enumerable: true,
//       get: function() {return created_time;}
//     },
//     "created_device_name": {
//       enumerable: true,
//       get: function() {return created_device_name;}
//     },
//     "created_device_version": {
//       enumerable: true,
//       get: function() {return created_device_version;}
//     },
//     ////////////////////////////////////////////////////////////////////////////
//     // computed properties
//     "archived": {
//       enumerable: false,
//       get: function() { return archived;},
//       set: function(value) {
//         if (typeof(value) === "boolean") {
//           archived = value
//           if (archived) {tag = 2;} else {tag = 0;}
//         };
//       }
//     }
//   });
//   //////////////////////////////////////////////////////////////////////////////
//   // public methods
//   // this.archive = function(){
//   //   tag = 2;
//   //   archived = true;
//   // };
//   // this.unArchive = function(){
//   //   tag = 0;
//   //   archived = false;
//   // };
//   this.encrypt = function(pw) {
//     priv = priv === null || pw === null || pw === undefined
//       ? priv
//       : WalletCrypto.encryptSecretWithSecondPassword(priv, pw, wallet.sharedKey, wallet.pbkdf2_iterations);
//     if (priv === null) { throw 'Error Encoding key'; };
//   };
//   this.decrypt = function(pw) {
//     priv = priv === null || pw === null || pw === undefined
//       ? priv
//       : WalletCrypto.decryptSecretWithSecondPassword(priv, pw, wallet.sharedKey, wallet.pbkdf2_iterations);
//     if (priv === null) { throw 'Error Decoding key'; };
//   };
//   this.fromKey = function(_key, _pw, _label){
//     addr     = _key.pub.getAddress().toString();
//     priv     = Base58.encode(_key.d.toBuffer(32));
//     created_time           = Date.now();
//     created_device_name    = APP_NAME;
//     created_device_version = APP_VERSION;
//     // this.unArchive();
//     this.archived = false;
//     this.label = _label;
//     this.encrypt(_pw);
//   };
// }






////////////////////////////////////////////////////////////////////////////////
// constructor

function Wallet(g, sk) {
  // members
  var guid = g;
  var sharedKey = sk;
  var pbkdf2_iterations = 5000;

  var keys = {};
  var hdWallet  = {};

  Object.defineProperties(this, {

    "guid": {
      enumerable: true,
      get: function() { return guid;}
    },
    "sharedKey": {
      enumerable: true,
      get: function() { return sharedKey;}
    },
    "pbkdf2_iterations": {
      enumerable: true,
      get: function() { return pbkdf2_iterations;}
    }
  });

  this.toJSON = function() {
    var newWallet = new Wallet();
    newWallet["keys"] = this.keys();
    return newWallet;
  };
  this.addKey = function(_key, _password, _label) {
    var addr = _key.pub.getAddress().toString();
    var a = new Address({}, this);
    keys[addr] = a.fromKey(_key, _password, _label);
  };
  this.addKeyFromWIF = function(wif, password, label) {
    var k = Bitcoin.ECKey.fromWIF(wif);
    this.addKey(k, password, label);
  };
  this.key = function(addr) {return keys[addr];};
  this.keys = function() {return this.addresses().map(this.key);};
  this.addresses = function() {return Object.keys(keys)};
  this.encrypt = function(pw) {
    function f(k) {k.encrypt(pw);};
    this.keys().map(f);
  };
  this.decrypt = function(pw) {
    function f(k) {k.decrypt(pw);};
    this.keys().map(f);
  };
}
