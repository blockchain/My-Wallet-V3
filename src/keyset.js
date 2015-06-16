'use strict';

module.exports = KeySet;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
var KeyChain = require('./keychain');

////////////////////////////////////////////////////////////////////////////////
// keyset: A collection of keychains

function KeySet(extendedKey, cache) {
  this._receiveChain = null;
  this._changeChain  = null;
  this.init(extendedKey, cache);
};

Object.defineProperties(KeySet.prototype, {
  "receive": {
    configurable: false,
    get: function() {return this._receiveChain;}
  },
  "change": {
    configurable: false,
    get: function() {return this._changeChain;}
  }
});

KeySet.prototype.init = function (extendedKey, cache){
  if (this._receiveChain && this._changeChain) return this;
  cache = cache || {};
  this._receiveChain = cache.receiveAccount
    ? new KeyChain(null,null,cache.receiveAccount ) : new KeyChain(extendedKey,0);
  this._changeChain  = cache.changeAccount
    ? new KeyChain(null,null,cache.changeAccount ) : new KeyChain(extendedKey,1);
  return this;
};

KeySet.prototype.privateKeyFromPath = function (path) {
  var components = path.split("/");
  assert(components[0] === 'M', 'Invalid Path prefix');
  assert(components[1] === '0' || components[1] === '1'
    ,'Invalid Path: change/receive index out of bounds');
  assert(components.length === 3, 'Invalid Path length');
  var receiveOrChange = parseInt(components[1]);
  var index = parseInt(components[2]);
  var key = receiveOrChange === 0 ?
    _receiveChain.getPrivateKey(index) :
    _changeChain.getPrivateKey(index) ;
  return key;
};

KeySet.prototype.toJSON = function (){
  var cacheJSON = {
    receiveAccount : this._receiveChain.xpub,
    changeAccount  : this._changeChain.xpub
  }
  return cacheJSON;
};
