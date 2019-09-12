'use strict';

module.exports = KeyRingV4;

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var KeyChainV4 = require('./keychain-v4');

// keyring: A collection of keychains

function KeyRingV4 (extendedKey, cache, bitcoinjs, type) {
  this._bitcoinjs = bitcoinjs || Bitcoin;
  this._receiveChain = null;
  this._changeChain = null;
  this._type = type;
  this.init(extendedKey, cache, type);
}

Object.defineProperties(KeyRingV4.prototype, {
  'receive': {
    configurable: false,
    get: function () { return this._receiveChain; }
  },
  'change': {
    configurable: false,
    get: function () { return this._changeChain; }
  },
  'type': {
    configurable: false,
    get: function () { return this._type; }
  }
});

KeyRingV4.prototype.init = function (extendedKey, cache, type) {
  cache = cache || {};
  if (this._receiveChain && this._changeChain) return this;
  if (extendedKey || cache.receiveAccount && cache.changeAccount) {
    this._receiveChain = cache.receiveAccount
      ? new KeyChainV4(null, null, cache.receiveAccount, this._bitcoinjs, type) : new KeyChainV4(extendedKey, 0, undefined, this._bitcoinjs, type);
    this._changeChain = cache.changeAccount
      ? new KeyChainV4(null, null, cache.changeAccount, this._bitcoinjs, type) : new KeyChainV4(extendedKey, 1, undefined, this._bitcoinjs, type);
  }
  return this;
};

// "M/0/0" -> HDNode
KeyRingV4.prototype.privateKeyFromPath = function (path) {
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

KeyRingV4.prototype.toJSON = function () {
  var cacheJSON = {
    receiveAccount: this._receiveChain && this._receiveChain.xpub,
    changeAccount: this._changeChain && this._changeChain.xpub
  };
  return cacheJSON;
};
