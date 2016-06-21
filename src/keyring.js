'use strict';

module.exports = KeyRing;

var assert = require('assert');
var KeyChain = require('./keychain');

// keyring: A collection of keychains

function KeyRing (extendedKey, cache) {
  this._receiveChain = null;
  this._changeChain = null;
  this.init(extendedKey, cache);
}

Object.defineProperties(KeyRing.prototype, {
  'receive': {
    configurable: false,
    get: function () { return this._receiveChain; }
  },
  'change': {
    configurable: false,
    get: function () { return this._changeChain; }
  }
});

KeyRing.prototype.init = function (extendedKey, cache) {
  cache = cache || {};
  if (this._receiveChain && this._changeChain) return this;
  if (extendedKey || cache.receiveAccount && cache.changeAccount) {
    this._receiveChain = cache.receiveAccount
      ? new KeyChain(null, null, cache.receiveAccount) : new KeyChain(extendedKey, 0);
    this._changeChain = cache.changeAccount
      ? new KeyChain(null, null, cache.changeAccount) : new KeyChain(extendedKey, 1);
  }
  return this;
};

// "M/0/0" -> HDNode
KeyRing.prototype.privateKeyFromPath = function (path) {
  var components = path.split('/');
  assert(components[0] === 'M', 'Invalid Path prefix');
  assert(components[1] === '0' || components[1] === '1'
    , 'Invalid Path: change/receive index out of bounds');
  assert(components.length === 3, 'Invalid Path length');
  if (this._receiveChain.isNeutered) return null;
  var receiveOrChange = parseInt(components[1], 10);
  var index = parseInt(components[2], 10);
  return receiveOrChange === 0
      ? this._receiveChain.getPrivateKey(index)
      : this._changeChain.getPrivateKey(index);
};

KeyRing.prototype.toJSON = function () {
  var cacheJSON = {
    receiveAccount: this._receiveChain.xpub,
    changeAccount: this._changeChain.xpub
  };
  return cacheJSON;
};
