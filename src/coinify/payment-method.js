'use strict';

module.exports = PaymentMethod;

function PaymentMethod (obj, coinify) {
  this._coinify = coinify;
  this._inMedium = obj.inMedium;
  this._outMedium = obj.outMedium;
  this._name = obj.name;
  this._inCurrencies = obj.inCurrencies;
  this._outCurrencies = obj.outCurrencies;
  this._fixedFee = obj.fixedFee;
  this._fixedFeeCurrency = obj.fixedFeeCurrency;
  this._percentageFee = obj.percentageFee;
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
  'fixedFee': {
    configurable: false,
    get: function () {
      return this._fixedFee;
    }
  },
  'fixedFeeCurrency': {
    configurable: false,
    get: function () {
      return this._fixedFeeCurrency;
    }
  },
  'percentageFee': {
    configurable: false,
    get: function () {
      return this._percentageFee;
    }
  }
});

PaymentMethod.fetchAll = function (coinify, currency) {
  var getPaymentMethods = function () {
    var params = null;
    if (currency) {
      params = {fixedFeeCurrency: currency};
    }
    return coinify.GET('trades/payment-methods', params).then(function (res) {
      var output = [];
      for (var i = 0; i < res.length; i++) {
        output.push(new PaymentMethod(res[i], coinify));
      }
      return Promise.resolve(output);
    });
  };

  if (coinify._access_token) {
    return getPaymentMethods();
  } else {
    return coinify.login().then(getPaymentMethods);
  }
};
