var ExchangePaymentMedium = require('../exchange/payment-medium');
var PaymentAccount = require('./payment-account');
var Trade = require('./trade');

class PaymentMedium extends ExchangePaymentMedium {
  constructor (obj, api, quote) {
    super(api, quote, Trade);

    this._TradeClass = Trade;

    this._inMedium = obj.inMedium;
    this._outMedium = obj.outMedium;

    if (this._inMedium === 'card' || this._outMedium === 'card') {
      this._fiatMedium = 'card';
    } else if (this._inMedium === 'bank' || this._outMedium === 'bank') {
      this._fiatMedium = 'bank';
    } else {
      console.warn('Unknown fiat medium', this._inMedium, this._outMedium);
    }

    this._name = obj.name;

    this._inCurrencies = obj.inCurrencies;
    this._outCurrencies = obj.outCurrencies;

    this._inCurrency = obj.inCurrency;
    this._outCurrency = obj.outCurrency;

    if (this._inCurrency === 'BTC') {
      this._inFixedFee = Math.round(obj.inFixedFee * 100000000);
      this._outFixedFee = Math.round(obj.outFixedFee * 100);
    } else {
      this._inFixedFee = Math.round(obj.inFixedFee * 100);
      this._outFixedFee = Math.round(obj.outFixedFee * 100000000);
    }
    this._inPercentageFee = obj.inPercentageFee;
    this._outPercentageFee = obj.outPercentageFee;

    if (quote) {
      let amt = quote.baseCurrency === 'BTC' ? quote.quoteAmount : quote.baseAmount;
      this._fee = Math.round(this.inFixedFee + -amt * (this.inPercentageFee / 100));
      this._total = -amt + this._fee;
    }
  }

  getAccounts () {
    return Promise.resolve([new PaymentAccount(this._api, this.fiatMedium, this._quote)]);
  }

  static getAll (inCurrency, outCurrency, api, quote) {
    var params = {};
    if (inCurrency) { params.inCurrency = inCurrency; }
    if (outCurrency) { params.outCurrency = outCurrency; }

    var output = [];
    return api.authGET('trades/payment-methods', params).then(function (res) {
      output = {};
      for (var i = 0; i < res.length; i++) {
        let medium = new PaymentMedium(res[i], api, quote);
        if (inCurrency !== 'BTC') { // Buy
          output[medium.inMedium] = medium;
        } else { // Sell
          output[medium.outMedium] = medium;
        }
      }
      return Promise.resolve(output);
    });
  }
}

module.exports = PaymentMedium;
