'use strict';

var assert = require('assert');

function Trade (api, delegate) {
  assert(api, 'API missing');
  assert(delegate, 'delegate missing');
  assert(typeof delegate.getReceiveAddress === 'function', 'delegate requires getReceiveAddress()');
  this._delegate = delegate;
  this._api = api;
}

Object.defineProperties(Trade.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (value) {
      this._debug = Boolean(value);
    }
  },
  'id': {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'createdAt': {
    configurable: false,
    get: function () {
      return this._createdAt;
    }
  },
  'inCurrency': {
    configurable: false,
    get: function () {
      return this._inCurrency;
    }
  },
  'outCurrency': {
    configurable: false,
    get: function () {
      return this._outCurrency;
    }
  },
  'inAmount': {
    configurable: false,
    get: function () {
      return this._inAmount;
    }
  },
  'medium': {
    configurable: false,
    get: function () {
      return this._medium;
    }
  },
  'state': {
    configurable: false,
    get: function () {
      return this._state;
    }
  },
  'sendAmount': {
    configurable: false,
    get: function () {
      return this._sendAmount;
    }
  },
  'outAmount': {
    configurable: false,
    get: function () {
      return this._outAmount;
    }
  },
  'outAmountExpected': {
    configurable: false,
    get: function () {
      return this._outAmountExpected;
    }
  },
  'receiveAddress': {
    configurable: false,
    get: function () {
      return this._receiveAddress;
    }
  },
  'accountIndex': {
    configurable: false,
    get: function () {
      return this._account_index;
    }
  },
  'bitcoinReceived': {
    configurable: false,
    get: function () {
      return Boolean(this._txHash);
    }
  },
  'confirmed': {
    configurable: false,
    get: function () {
      return this._confirmed || this._confirmations >= 3;
    }
  },
  'txHash': {
    configurable: false,
    get: function () { return this._txHash || null; }
  }
});

module.exports = Trade;
