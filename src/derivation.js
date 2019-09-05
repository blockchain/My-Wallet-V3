module.exports = Derivation

function Derivation (obj) {
  this._type = obj.type;
  this._purpose = obj.purpose;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._cache = obj.cache || {};
  this._address_labels = obj.address_labels || [];
}

Object.defineProperties(Derivation.prototype, {
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