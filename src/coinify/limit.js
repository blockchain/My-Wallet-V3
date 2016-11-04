'use strict';

var Helpers = require('bitcoin-exchange-client').Helpers;

module.exports = Limit;

function Limit (obj) {
  // Is this the amount remaining at this moment, or the daily/weekly limit?
  if ((obj.in && Helpers.isPositiveNumber(obj.in.daily)) || (obj.out && Helpers.isPositiveNumber(obj.out.daily))) {
    if (obj.in) {
      this._inDaily = obj.in.daily;
    }
    if (obj.out) {
      this._outDaily = obj.in.daily;
    }
  } else {
    this._inRemaining = obj.in;
    this._outRemaining = obj.out;
  }
}

Object.defineProperties(Limit.prototype, {
  'inRemaining': {
    configurable: false,
    get: function () {
      return this._inRemaining;
    }
  },
  'outRemaining': {
    configurable: false,
    get: function () {
      return this._inRemaining;
    }
  },
  'inDaily': {
    configurable: false,
    get: function () {
      return this._inDaily;
    }
  },
  'outDaily': {
    configurable: false,
    get: function () {
      return this._outDaily;
    }
  }
});
