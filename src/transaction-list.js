'use strict';

var assert  = require('assert')
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
  this._observers     = [];

  this._notifyObservers = function () {
    this._observers.forEach(function (obs) { obs(); });
  };
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
    return this._txsFetched += data.txs.length;
  }).bind(this);
  return txListP.then(processTxs);
};

TransactionList.prototype.pushTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory);
  this._transactions = this._transactions.concat(txs);
  this._notifyObservers();
};

TransactionList.prototype.shiftTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory);
  this._transactions = txs.concat(this._transactions);
  this._notifyObservers();
};

TransactionList.prototype.subscribe = function (callback) {
  this._observers.push(callback);
  return function () {
    this._observers.splice(this._observers.indexOf(callback), 1);
  }.bind(this);
};

module.exports = TransactionList;
