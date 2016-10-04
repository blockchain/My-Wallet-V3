'use strict';

var assert = require('assert');

module.exports = Exchange;

function Exchange (delegate, TradeClass) {
  assert(delegate, 'ExchangeDelegate required');
  assert(TradeClass, 'Trade class required');
  this._delegate = delegate;
  this._trades = [];
  this._TradeClass = TradeClass;
}

Object.defineProperties(Exchange.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (value) {
      this._debug = Boolean(value);
      this._delegate.debug = Boolean(value);
      for (var i = 0; i < this.trades.length; i++) {
        this.trades[i].debug = Boolean(value);
      }
    }
  },
  'trades': {
    configurable: false,
    get: function () {
      return this._trades;
    }
  },
  'delegate': {
    configurable: false,
    get: function () {
      return this._delegate;
    }
  }
});

Exchange.prototype.updateList = function (list, items, ListClass) {
  var item;
  for (var i = 0; i < items.length; i++) {
    item = undefined;
    for (var k = 0; k < list.length; k++) {
      if (list[k]._id === items[i].id) {
        item = list[k];
        item.debug = this.debug;
        item.set.bind(item)(items[i]);
      }
    }
    if (item === undefined) {
      item = new ListClass(items[i], this._api, this.delegate, this);
      item.debug = this.debug;
      list.push(item);
    }
  }
};

Exchange.prototype.getTrades = function () {
  var self = this;
  var save = function () {
    return this.delegate.save.bind(this.delegate)().then(function () { return self._trades; });
  };
  var update = function (trades) {
    this.updateList(this._trades, trades, this._TradeClass);
  };
  var process = function () {
    for (var i = 0; i < this._trades.length; i++) {
      var trade = this._trades[i];
      trade.process(this._trades);
    }
  };
  return this._TradeClass.fetchAll(this._api)
                     .then(update.bind(this))
                     .then(process.bind(this))
                     .then(save.bind(this));
};
