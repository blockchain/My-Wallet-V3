module.exports = Derivation

var KeyRingV4 = require('./keyring-v4');
var Helpers = require('./helpers');
var assert = require('assert');

function Derivation (obj) {
  this._type = obj.type;
  this._purpose = obj.purpose;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._cache = obj.cache || {};
  this._keyRing = new KeyRingV4(obj.xpub, obj.cache, null, obj.type);
  this._address_labels = obj.address_labels || [];
  this._lastUsedReceiveIndex = null;
  this._balance = 0;
}

Object.defineProperties(Derivation.prototype, {
  'balance': {
    configurable: false,
    get: function () { return this._balance; },
    set: function (num) {
      if (Helpers.isPositiveNumber(num)) {
        this._balance = num;
      } else {
        throw new Error('derivation.balance must be a positive number');
      }
    }
  },
  'keyRing': {
    configurable: false,
    get: function () { return this._keyRing; }
  },
  'n_tx': {
    get: function () { return this._n_tx; },
    set: function (num) {
      if (Helpers.isPositiveInteger(num)) {
        this._n_tx = num;
      } else {
        throw new Error('account.n_tx must be a positive integer');
      }
    }
  },
  'lastUsedReceiveIndex': {
    configurable: false,
    get: function () { return this._lastUsedReceiveIndex; },
    set: function (value) {
      assert(value === null || Helpers.isPositiveInteger(value), 'should be null or >= 0');
      this._lastUsedReceiveIndex = value;
    }
  },
  'type': {
    configurable: false,
    get: function () { return this._type }
  },
  'xpub': {
    configurable: false,
    get: function () { return this._xpub }
  }
})

Derivation.factory = function (o) {
  if (o instanceof Object && !(o instanceof Derivation)) {
    return new Derivation(o);
  } else {
    return o;
  }
};

// JSON SERIALIZER
Derivation.prototype.toJSON = function () {
  var derivation = {
    type: this._type,
    purpose: this._purpose,
    xpriv: this._xpriv,
    xpub: this._xpub,
    cache: this._keyRing,
    address_labels: this._address_labels
  };

  return derivation;
};