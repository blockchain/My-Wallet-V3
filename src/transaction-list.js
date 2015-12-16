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
    var transactions    = refresh ? [] : this._transactions
      , fetchedTxs      = data.txs.map(Tx.factory);
    this._transactions  = transactions.concat(fetchedTxs);
    if (refresh) { this._txsFetched = 0; }
    return this._txsFetched += fetchedTxs.length;
  }).bind(this);
  return txListP.then(processTxs);
};

TransactionList.prototype.shiftTxs = function (txs) {
  txs = Helpers.toArrayFormat(txs).map(Tx.factory);
  this._transactions = txs.concat(this._transactions);
};

module.exports = TransactionList;
