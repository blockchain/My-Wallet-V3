var PaymentMethod = require('./payment-method');
var ExchangeQuote = require('../exchange/quote');
var Trade = require('./trade');
var assert = require('assert');

class Quote extends ExchangeQuote {
  constructor (obj, api, delegate, debug) {
    super(api, delegate, Trade, debug);

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

  static getQuote (api, delegate, amount, baseCurrency, quoteCurrency, debug) {
    const processQuote = (quote) => new Quote(quote, api, delegate);

    const getQuote = (_baseAmount) => {
      var getAnonymousQuote = function () {
        return api.POST('trades/quote', {
          baseCurrency: baseCurrency,
          quoteCurrency: quoteCurrency,
          baseAmount: parseFloat(_baseAmount)
        });
      };

      var getQuote = function () {
        return api.authPOST('trades/quote', {
          baseCurrency: baseCurrency,
          quoteCurrency: quoteCurrency,
          baseAmount: parseFloat(_baseAmount)
        });
      };

      if (!api.hasAccount) {
        return getAnonymousQuote().then(processQuote);
      } else {
        return getQuote().then(processQuote);
      }
    };

    return super.getQuote(amount, baseCurrency, quoteCurrency, ['BTC', 'EUR', 'GBP', 'USD', 'DKK'], debug)
             .then(getQuote);
  }

  getPaymentMethods () {
    var self = this;

    var setPaymentMethods = function (paymentMethods) {
      self.paymentMethods = {};
      for (var i = 0; i < paymentMethods.length; i++) {
        var paymentMethod = paymentMethods[i];
        self.paymentMethods[paymentMethod.inMedium] = paymentMethod;
        paymentMethod.calculateFee.bind(paymentMethod)(self);
      }
      return self.paymentMethods;
    };

    if (this.paymentMethods) {
      return Promise.resolve(this.paymentMethods);
    } else {
      return PaymentMethod.fetchAll(this.baseCurrency, this.quoteCurrency, this._api)
                          .then(setPaymentMethods);
    }
  }

  buy (medium) {
    assert(medium === 'bank' || medium === 'card', 'Specify bank or card');
    return super.buy(medium).then((trade) => {
      trade._getQuote = Quote.getQuote; // Prevents circular dependency
    });
  }

  // QA tool
  expire () {
    this._expiresAt = new Date(new Date().getTime() + 3 * 1000);
  }
}

module.exports = Quote;
