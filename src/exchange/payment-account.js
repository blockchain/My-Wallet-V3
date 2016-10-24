var assert = require('assert');

class PaymentAccount {
  constructor (api, fiatMedium, quote, TradeClass) {
    assert(api, 'API required');
    assert(TradeClass, 'Trade class required');
    this._api = api;
    this._quote = quote;
    this._TradeClass = TradeClass;
    this._fiatMedium = fiatMedium;
  }

  get id () { return this._id; }

  get fiatMedium () { return this._fiatMedium; }

  get name () { return this._name; }

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
      this.fiatMedium,
      this._id
    ).then(addTrade);
  }
}

module.exports = PaymentAccount;
