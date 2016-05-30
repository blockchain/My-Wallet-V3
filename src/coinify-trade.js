'use strict';

var assert  = require('assert');

module.exports = CoinifyTrade;

function CoinifyTrade (obj, coinify) {
  this._coinify = coinify;

  this._id = obj.id;
  this._baseCurrency = obj.baseCurrency;
  this._quoteCurrency = obj.quoteCurrency;
  this._baseAmount = obj.baseAmount;
  this._receiveAddress = obj.transferOut.details.account;
  this._state = obj.state;
  this._createdAt = new Date(obj.createTime);
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
      return 'cb561519-6627-45fe-9372-79942ec141c4';
    }
  },
  'createdAt' :{
    configurable: false,
    get: function () {
      return this._createdAt;
    }
  },
  'baseCurrency' :{
    configurable: false,
    get: function () {
      return this._baseCurrency;
    }
  },
  'quoteCurrency' :{
    configurable: false,
    get: function () {
      return this._quoteCurrency;
    }
  },
  'baseAmount' :{
    configurable: false,
    get: function () {
      return this._baseAmount;
    }
  }
});
