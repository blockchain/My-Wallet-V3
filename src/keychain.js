'use strict';

module.exports = KeyChain;

var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');
var Helpers = require('./helpers');
var constants = require('./constants');

// keychain
function KeyChain (extendedKey, index, cache) {
  this._chainRoot = null;
  this.init(extendedKey, index, cache);

  // this function should be part of the instance because it is memoized
  this._getKey = Helpers.memoize(function (index) {
    assert(Helpers.isPositiveInteger(index), 'Key index must be integer >= 0');
    assert(this._chainRoot, 'KeyChain is not initialized.');
    return this._chainRoot.derive(index);
  });
}

Object.defineProperties(KeyChain.prototype, {
  'xpub': {
    configurable: false,
    get: function () { return this._chainRoot ? this._chainRoot.neutered().toBase58() : null; }
  },
  'isNeutered': {
    configurable: false,
    get: function () {
      // isNeutered() is not yet in 2.1.4
      // return this._chainRoot ? this._chainRoot.isNeutered() : null;
      return this._chainRoot ? !this._chainRoot.keyPair.d : null;
    }
  }
});

KeyChain.prototype.init = function (extendedKey, index, cache) {
  // don't override the chain once initialized
  if (this._chainRoot) return this;
  // if cache is defined we use it to recreate the chain
  // otherwise we generate it using extendedKey and index
  if (cache) {
    this._chainRoot = Bitcoin.HDNode.fromBase58(cache, constants.getNetwork());
  } else {
    this._chainRoot = extendedKey && Helpers.isPositiveInteger(index) && index >= 0
      ? Bitcoin.HDNode.fromBase58(extendedKey, constants.getNetwork()).derive(index) : undefined;
  }
  return this;
};

KeyChain.prototype.getAddress = function (index) {
  assert(Helpers.isPositiveInteger(index), 'Address index must be integer >= 0');
  return this._getKey(index).getAddress();
};

KeyChain.prototype.getPrivateKey = function (index) {
  assert(Helpers.isPositiveInteger(index), 'private key index must be integer >= 0');
  var key = this._getKey(index);
  return key || null;
};
