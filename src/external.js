'use strict';

var MyWallet = require('./wallet');
var Coinify = require('./coinify');

var assert = require('assert');

module.exports = External;

function External (object) {
  var obj = object || {};

  this._coinify = obj.coinify ? new Coinify(obj.coinify) : undefined;
}

Object.defineProperties(External.prototype, {
  'coinify': {
    configurable: false,
    get: function () { return this._coinify; }
  }
});

External.factory = function (o) {
  if (o instanceof Object && !(o instanceof External)) {
    return new External(o);
  } else { return o; }
};

External.prototype.toJSON = function () {
  var external = {
    coinify: this._coinify
  };

  return external;
};

External.prototype.addCoinify = function () {
  assert(!this._coinify, 'Already added');
  this._coinify = Coinify.new();
  MyWallet.syncWallet();
};

External.reviver = function (k, v) {
  if (k === '') return new External(v);
  return v;
};
