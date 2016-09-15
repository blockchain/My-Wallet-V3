'use strict';

var PaymentMethod = require('./payment-method');
var Helpers = require('./helpers');
var assert = require('assert');

module.exports = Quote;

function Quote (obj, api) {
  this._api = api;

  var expiresAt = new Date(obj.expiryTime);

  // Debug, make quote expire in 15 seconds:
  // expiresAt = new Date(new Date().getTime() + 15 * 1000);

  this._id = obj.id;
  this._baseCurrency = obj.baseCurrency;
  this._quoteCurrency = obj.quoteCurrency;
  this._expiresAt = expiresAt;

  if (this._baseCurrency === 'BTC') {
    this._baseAmount = Math.round(obj.baseAmount * 100000000);
    this._quoteAmount = Math.round(obj.quoteAmount * 100);
  } else {
    this._baseAmount = Math.round(obj.baseAmount * 100);
    this._quoteAmount = Math.round(obj.quoteAmount * 100000000);
  }

  obj.baseAmount;
}

Object.defineProperties(Quote.prototype, {
  'id': {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'baseCurrency': {
    configurable: false,
    get: function () {
      return this._baseCurrency;
    }
  },
  'quoteCurrency': {
    configurable: false,
    get: function () {
      return this._quoteCurrency;
    }
  },
  'baseAmount': {
    configurable: false,
    get: function () {
      return this._baseAmount;
    }
  },
  'quoteAmount': {
    configurable: false,
    get: function () {
      return this._quoteAmount;
    }
  },
  'expiresAt': {
    configurable: false,
    get: function () {
      return this._expiresAt;
    }
  }
});

Quote.getQuote = function (api, amount, baseCurrency, quoteCurrency) {
  assert(Helpers.isInteger(amount), 'amount must be in cents or satoshi');

  var supportedCurrencies = ['BTC', 'EUR', 'GBP', 'USD', 'DKK'];

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

  var processQuote = function (quote) {
    quote = new Quote(quote, api);
    return quote;
  };

  var getAnonymousQuote = function () {
    return api.POST('trades/quote', {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      baseAmount: parseFloat(baseAmount)
    });
  };

  var getQuote = function () {
    return api.authPOST('trades/quote', {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      baseAmount: parseFloat(baseAmount)
    });
  };

  if (!api.hasAccount) {
    return getAnonymousQuote().then(processQuote);
  } else {
    return getQuote().then(processQuote);
  }
};

Quote.prototype.getPaymentMethods = function () {
  var self = this;

  var setPaymentMethods = function (paymentMethods) {
    self.paymentMethods = {};
    for (var i = 0; i < paymentMethods.length; i++) {
      var paymentMethod = paymentMethods[i];
      self.paymentMethods[paymentMethod.inMedium] = paymentMethod;
      paymentMethod.calculateFee.bind(paymentMethod)(self);
    }
    return paymentMethods;
  };

  if (this.paymentMethods) {
    return Promise.resolve(this.paymentMethods);
  } else {
    return PaymentMethod.fetchAll(this.baseCurrency, this.quoteCurrency, this._api)
                        .then(setPaymentMethods);
  }
};

// QA tool
Quote.prototype.expire = function () {
  this._expiresAt = new Date(new Date().getTime() + 3 * 1000);
};
