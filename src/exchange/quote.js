var Helpers = require('../exchange/helpers');
var assert = require('assert');

class Quote {
  constructor (api, delegate, TradeClass, debug) {
    assert(api, 'API required');
    assert(delegate, 'ExchangeDelegate required');
    assert(TradeClass, 'Trade class required');
    assert(TradeClass.buy, 'Trade.buy() missing');

    this._api = api;
    this._delegate = delegate;
    this._TradeClass = TradeClass;
    this._debug = debug;
  }

  get id () { return this._id; }

  get debug () { return this._debug; }

  get baseCurrency () { return this._baseCurrency; }

  get quoteCurrency () { return this._quoteCurrency; }

  get baseAmount () { return this._baseAmount; }

  get quoteAmount () { return this._quoteAmount; }

  get expiresAt () { return this._expiresAt; }

  static getQuote (amount, baseCurrency, quoteCurrency, supportedCurrencies, debug) {
    assert(Helpers.isInteger(amount), 'amount must be in cents or satoshi');

    if (supportedCurrencies.indexOf(baseCurrency) === -1) {
      return Promise.reject('base_currency_not_supported');
    }

    if (supportedCurrencies.indexOf(quoteCurrency) === -1) {
      return Promise.reject('quote_currency_not_supported');
    }

    if (baseCurrency === 'CNY' || quoteCurrency === 'CNY') {
      console.warn('CNY has only 1 decimal place');
    }

    var baseAmount;
    if (baseCurrency === 'BTC') {
      baseAmount = (amount / 100000000).toFixed(8);
    } else {
      baseAmount = (amount / 100).toFixed(2);
    }

    return Promise.resolve(baseAmount);
  }

  buy (medium) {
    assert(this._expiresAt > new Date(), 'QUOTE_EXPIRED');

    var addTrade = (trade) => {
      trade.debug = this._debug;
      this._delegate.trades.push(trade);
      return this._delegate.save.bind(this._delegate)().then(() => trade);
    };

    return this._TradeClass.buy(
      this,
      medium,
      this._api,
      this._delegate,
      this._debug
    ).then(addTrade);
  }
}

module.exports = Quote;
