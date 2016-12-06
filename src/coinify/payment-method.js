'use strict';

module.exports = PaymentMethod;

function PaymentMethod (obj, api) {
  this._api = api;
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
}

Object.defineProperties(PaymentMethod.prototype, {
  'inMedium': {
    configurable: false,
    get: function () {
      return this._inMedium;
    }
  },
  'outMedium': {
    configurable: false,
    get: function () {
      return this._outMedium;
    }
  },
  'name': {
    configurable: false,
    get: function () {
      return this._name;
    }
  },
  'inCurrencies': {
    configurable: false,
    get: function () {
      return this._inCurrencies;
    }
  },
  'outCurrencies': {
    configurable: false,
    get: function () {
      return this._outCurrencies;
    }
  },
  'inCurrency': {
    configurable: false,
    get: function () {
      return this._inCurrency;
    }
  },
  'outCurrency': {
    configurable: false,
    get: function () {
      return this._outCurrency;
    }
  },
  'inFixedFee': {
    configurable: false,
    get: function () {
      return this._inFixedFee;
    }
  },
  'outFixedFee': {
    configurable: false,
    get: function () {
      return this._outFixedFee;
    }
  },
  'inPercentageFee': {
    configurable: false,
    get: function () {
      return this._inPercentageFee;
    }
  },
  'outPercentageFee': {
    configurable: false,
    get: function () {
      return this._outPercentageFee;
    }
  },
  'fee': {
    configurable: false,
    get: function () {
      return this._fee;
    }
  },
  'total': {
    configurable: false,
    get: function () {
      return this._total;
    }
  }
});

PaymentMethod.fetchAll = function (inCurrency, outCurrency, api) {
  var params = {};
  if (inCurrency) { params.inCurrency = inCurrency; }
  if (outCurrency) { params.outCurrency = outCurrency; }
  if (inCurrency === 'BTC') {
    params.inCurrency = outCurrency;
    params.outCurrency = inCurrency;
  }

  var output = [];
  return api.authGET('trades/payment-methods', params).then(function (res) {
    output.length = 0;
    for (var i = 0; i < res.length; i++) {
      output.push(new PaymentMethod(res[i], api));
    }
    return Promise.resolve(output);
  });
};

PaymentMethod.prototype.calculateFee = function (quote) {
  let amt = quote.baseCurrency === 'BTC' ? quote.quoteAmount : quote.baseAmount;
  this._fee = Math.round(this.inFixedFee + -amt * (this.inPercentageFee / 100));
  this._total = -amt + this._fee;
};
