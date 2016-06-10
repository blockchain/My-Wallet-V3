'use strict';

var assert  = require('assert');

module.exports = CoinifyTrade;

function CoinifyTrade (obj, coinify) {
  this._coinify = coinify;

  this._id = obj.id;
  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;
  this._inAmount = obj.inAmount;
  this._medium = obj.transferIn.medium;
  this._outAmountExpected = obj.outAmountExpected;
  this._receiveAddress = obj.transferOut.details.account;
  this._state = obj.state;
  this._createdAt = new Date(obj.createTime);
  this._iSignThisID = obj.transferIn.details.paymentId;
  this._receiptUrl = obj.receiptUrl;
}

Object.defineProperties(CoinifyTrade.prototype, {
  'id' : {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'iSignThisID' : {
    configurable: false,
    get: function () {
      return this._iSignThisID;
    }
  },
  'createdAt' :{
    configurable: false,
    get: function () {
      return this._createdAt;
    }
  },
  'inCurrency' :{
    configurable: false,
    get: function () {
      return this._inCurrency;
    }
  },
  'outCurrency' :{
    configurable: false,
    get: function () {
      return this._outCurrency;
    }
  },
  'inAmount' :{
    configurable: false,
    get: function () {
      return this._inAmount;
    }
  },
  'medium' :{
    configurable: false,
    get: function () {
      return this._medium;
    }
  },
  'outAmountExpected' :{
    configurable: false,
    get: function () {
      return this._outAmountExpected;
    }
  },
  'receiptUrl' :{
    configurable: false,
    get: function () {
      return this._receiptUrl;
    }
  }
});
