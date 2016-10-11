var ExchangePaymentMethod = require('../exchange/payment-method');
var Trade = require('./trade');

class PaymentMethod extends ExchangePaymentMethod {
  constructor (obj, api, quote) {
    super(api, quote);

    this._TradeClass = Trade;

    this._inMedium = obj.inMedium;
    this._outMedium = obj.outMedium;
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

  buy () {
    return super.buy().then((trade) => {
      trade._getQuote = this._quote.constructor.getQuote; // Prevents circular dependency
      return trade;
    });
  }

  static fetchAll (inCurrency, outCurrency, api, quote) {
    var params = {};
    if (inCurrency) { params.inCurrency = inCurrency; }
    if (outCurrency) { params.outCurrency = outCurrency; }

    var output = [];
    return api.authGET('trades/payment-methods', params).then(function (res) {
      output.length = 0;
      for (var i = 0; i < res.length; i++) {
        output.push(new PaymentMethod(res[i], api, quote));
      }
      return Promise.resolve(output);
    });
  }
}

module.exports = PaymentMethod;
