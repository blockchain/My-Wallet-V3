'use strict';

var EventEmitter = require('events');
var Helpers = require('./helpers');
var Tx = require('./wallet-transaction');

var TransactionList = function (loadNumber) {
  var DEFAULT_TX_LOAD = 50;
  this._loadNumber = loadNumber || DEFAULT_TX_LOAD;
  this._transactions = [];
  this._events = new EventEmitter();
};

Object.defineProperties(TransactionList.prototype, {
  'transactions': {
    configurable: false,
    value: function (identity) {
      return identity == null || identity === ''
          ? this._transactions
          : this._transactions.filter(function (tx) { return tx.belongsTo(identity); });
    }
  },
  'transactionsForIOS': {
    configurable: false,
    value: function (identity) {
      return this.transactions(identity).map(Tx.IOSfactory);
    }
  },
  'transaction': {
    configurable: false,
    value: function (hash) {
      return this._transactions.filter(function (tx) {
        return tx.hash === hash;
      })[0];
    }
  },
  'loadNumber': {
    configurable: false,
    get: function () { return this._loadNumber; }
  },
  'fetched': {
    configurable: false,
    get: function () { return this._transactions.length; }
  }
});

TransactionList.prototype.wipe = function () {
  this._transactions = [];
};

TransactionList.prototype.pushTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory).filter(function (tx) {
    return !this.transaction(tx.hash);
  }.bind(this));
  this._transactions = this._transactions.concat(txs);
  this._events.emit('update');
};

TransactionList.prototype.subscribe = function (listener) {
  if (typeof listener !== 'function') return;
  this._events.addListener('update', listener);
  return this._events.removeListener.bind(this._events, 'update', listener);
};

module.exports = TransactionList;
