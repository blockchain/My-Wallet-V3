'use strict';

var assert  = require('assert')
  , EventEmitter  = require('events')
  , Helpers = require('./helpers')
  , API     = require('./api')
  , Tx      = require('./wallet-transaction');

var TransactionList = function (getContext, loadNumber) {
  var DEFAULT_TX_LOAD = 50;
  this._loadNumber    = loadNumber || DEFAULT_TX_LOAD;
  this._getContext    = getContext;
  this._context       = getContext();
  this._transactions  = [];
  this._txsFetched    = 0;
  this._events        = new EventEmitter();
};

Object.defineProperties(TransactionList.prototype, {
  'transactions': {
    configurable: false,
    value: function (identity) {
      return identity == null || identity === '' ?
        this._transactions :
        this._transactions.filter(function (tx) {
          return tx.belongsTo(identity);
        });
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
  }
});

TransactionList.prototype.fetchTxs = function (amount) {
  var refresh = this._getContext().join() !== this._context.join()
    , context = this._context = refresh ? this._getContext() : this._context
    , txIndex = refresh ? 0 : this._txsFetched
    , amount  = amount || this.loadNumber
    , txListP = API.getHistory(context, null, txIndex, amount);
  var processTxs = (function (data) {
    if (refresh) { this._transactions = []; this._txsFetched = 0; }
    this.pushTxs(data.txs);
    this._txsFetched += data.txs.length;
    return data.txs.length;
  }).bind(this);
  return txListP.then(processTxs);
};

TransactionList.prototype.pushTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory).filter(function (tx) {
    return !this.transaction(tx.hash);
  }.bind(this));
  this._transactions = this._transactions.concat(txs);
  this._events.emit('update');
};

TransactionList.prototype.shiftTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory).filter(function (tx) {
    return !this.transaction(tx.hash);
  }.bind(this));
  this._transactions = txs.concat(this._transactions);
  this._events.emit('update');
};

TransactionList.prototype.subscribe = function (listener) {
  if ('function' !== typeof listener) return;
  this._events.addListener('update', listener);
  return this._events.removeListener.bind(this._events, 'update', listener);
};

module.exports = TransactionList;
