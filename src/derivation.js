module.exports = Derivation

var KeyRingV4 = require('./keyring-v4');

function Derivation (obj) {
  this._type = obj.type;
  this._purpose = obj.purpose;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._cache = obj.cache || {};
  this._keyRing = new KeyRingV4(obj.xpub, obj.cache, null, obj.type);
  this._address_labels = obj.address_labels || [];
}

Object.defineProperties(Derivation.prototype, {
  'keyRing': {
    configurable: false,
    get: function () { return this._keyRing; }
  },
  'type': {
    configurable: false,
    get: function () { return this._type }
  }
})

Derivation.factory = function (o) {
  if (o instanceof Object && !(o instanceof Derivation)) {
    return new Derivation(o);
  } else {
    return o;
  }
};