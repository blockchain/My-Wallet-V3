'use strict';

module.exports = KeyChainV4;

var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');
var Helpers = require('./helpers');
var constants = require('./constants');

// keychain
function KeyChainV4 (extendedKey, index, cache, bitcoinjs, type) {
  this._Bitcoin = bitcoinjs || Bitcoin;
  this._chainRoot = null;
  this._type = type;
  this.init(extendedKey, index, cache);

  // this function should be part of the instance because it is memoized
  this._getKey = Helpers.memoize(function (index) {
    assert(Helpers.isPositiveInteger(index), 'Key index must be integer >= 0');
    assert(this._chainRoot, 'KeyChainV4 is not initialized.');
    return this._chainRoot.derive(index);
  });
}

Object.defineProperties(KeyChainV4.prototype, {
  'xpub': {
    configurable: false,
    get: function () {
      return this._chainRoot ? this._chainRoot.neutered().toBase58() : null;
    }
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

KeyChainV4.prototype.init = function (extendedKey, index, cache) {
  // don't override the chain once initialized
  if (this._chainRoot) return this;
  // if cache is defined we use it to recreate the chain
  // otherwise we generate it using extendedKey and index
  if (cache) {
    this._chainRoot = this._Bitcoin.HDNode.fromBase58(cache, constants.getNetwork(this._Bitcoin));
  } else {
    this._chainRoot = extendedKey && Helpers.isPositiveInteger(index) && index >= 0
      ? this._Bitcoin.HDNode.fromBase58(extendedKey, constants.getNetwork(this._Bitcoin)).derive(index) : undefined;
  }
  return this;
};

KeyChainV4.prototype.getAddress = function (index) {
  assert(Helpers.isPositiveInteger(index), 'Address index must be integer >= 0');
  var hdNode = this._getKey(index);
  if (this._type === 'bech32') {
    var keyhash = this._Bitcoin.crypto.hash160(hdNode.getPublicKeyBuffer())
    var scriptPubKey = this._Bitcoin.script.witnessPubKeyHash.output.encode(keyhash);
    return this._Bitcoin.address.fromOutputScript(scriptPubKey, constants.getNetwork(this._Bitcoin));
  } else if (this._type === 'legacy') {
    return hdNode.getAddress();
  } else {
    return null
  }
};

KeyChainV4.prototype.getPrivateKey = function (index) {
  assert(Helpers.isPositiveInteger(index), 'private key index must be integer >= 0');
  var key = this._getKey(index);
  return key || null;
};
