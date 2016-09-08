'use strict';

var Limit = require('./limit');

module.exports = Limits;

function Limits (obj) {
  this._card = new Limit(obj.card);
  this._bank = new Limit(obj.bank);
}

Object.defineProperties(Limits.prototype, {
  'card': {
    configurable: false,
    get: function () {
      return this._card;
    }
  },
  'bank': {
    configurable: false,
    get: function () {
      return this._bank;
    }
  }
});
