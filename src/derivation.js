module.exports = Derivation

var KeyRingV4 = require('./keyring-v4');
var Helpers = require('./helpers');

function Derivation (obj) {
  this._type = obj.type;
  this._purpose = obj.purpose;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._cache = obj.cache || {};
  this._keyRing = new KeyRingV4(obj.xpub, obj.cache, null, obj.type);
  this._address_labels = obj.address_labels || [];
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