'use strict';

module.exports = PaymentMethod;

function PaymentMethod (obj, coinify) {
  this._coinify = coinify;
  this._inMedium = obj.inMedium;
  this._outMedium = obj.outMedium;
  this._name = obj.name;

  this._inCurrencies = obj.inCurrencies;
  this._outCurrencies = obj.outCurrencies;

  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;

  if (this._inCurrency === 'BTC') {
    this._inFixedFee = Math.trunc(obj.inFixedFee * 100000000);
    this._outFixedFee = Math.trunc(obj.outFixedFee * 100);
  } else {
    this._inFixedFee = Math.trunc(obj.inFixedFee * 100);
    this._outFixedFee = Math.trunc(obj.outFixedFee * 100000000);
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
  }
});

PaymentMethod.fetchAll = function (inCurrency, outCurrency, coinify) {
  var getPaymentMethods = function () {
    var params = {};
    if (inCurrency) { params.inCurrency = inCurrency; }
    if (outCurrency) { params.outCurrency = outCurrency; }

    var output = [];
    return coinify.GET('trades/payment-methods', params).then(function (res) {
      output.length = 0;
      for (var i = 0; i < res.length; i++) {
        output.push(new PaymentMethod(res[i], coinify));
      }
      return Promise.resolve(output);
    });
  };

  if (coinify.isLoggedIn) {
    return getPaymentMethods();
  } else {
    return coinify.login().then(getPaymentMethods);
  }
};
