var ExchangePaymentMethod = require('../exchange/payment-method');
var Trade = require('./trade');

class PaymentMethod extends ExchangePaymentMethod {
  constructor (api, quote) {
    super(api, quote);

    this._TradeClass = Trade;

    this._inMedium = 'ach';
    this._outMedium = 'blockchain';

    this._inCurrencies = ['USD', 'BTC'];
    this._outCurrencies = ['BTC', 'USD'];

    this._inCurrency = 'USD';
    this._outCurrency = 'BTC';

    this._inFixedFee = 0;
    this._outFixedFee = 0;
    this._inPercentageFee = 0;
    this._outPercentageFee = 0;

    this._fee = 0;
    this._total = -quote.baseAmount;
  }

  static fetchAll (inCurrency, outCurrency, api, quote) {
    return Promise.resolve([new PaymentMethod(api, quote)]);
  }
}

module.exports = PaymentMethod;
