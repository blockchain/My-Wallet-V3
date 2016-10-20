var assert = require('assert');

class PaymentMethod {
  constructor (api, quote, TradeClass) {
    assert(api, 'API required');
    assert(TradeClass, 'Trade class required');
    this._api = api;
    this._quote = quote;
    this._TradeClass = TradeClass;
  }

  get inMedium () { return this._inMedium; }

  get outMedium () { return this._outMedium; }

  get id () { return this._id; }

  get name () { return this._name; }

  get inCurrencies () { return this._inCurrencies; }

  get outCurrencies () { return this._outCurrencies; }

  get inCurrency () { return this._inCurrency; }

  get outCurrency () { return this._outCurrency; }

  get inFixedFee () { return this._inFixedFee || 0; }

  get outFixedFee () { return this._outFixedFee || 0; }

  get inPercentageFee () { return this._inPercentageFee || 0; }

  get outPercentageFee () { return this._outPercentageFee || 0; }

  get fee () { return this._fee; }

  get total () { return this._total; }

  buy () {
    if (!this._quote) {
      return Promise.reject('QUOTE_MISSING');
    }
    var delegate = this._quote.delegate;
    var addTrade = (trade) => {
      trade.debug = this._quote.debug;
      delegate.trades.push(trade);
      return delegate.save.bind(delegate)().then(() => trade);
    };

    return this._TradeClass.buy(
      this._quote,
      this._inMedium,
      this._id
    ).then(addTrade);
  }

  static fetchAll () {
    assert(false, 'Subclass must implement this. Do not call super');
  }
}

module.exports = PaymentMethod;
