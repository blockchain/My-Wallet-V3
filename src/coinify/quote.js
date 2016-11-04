var PaymentMethod = require('./payment-medium');
var Exchange = require('bitcoin-exchange-client');
var Trade = require('./trade');

class Quote extends Exchange.Quote {
  constructor (obj, api, delegate, debug) {
    super(api, delegate, Trade, PaymentMethod, debug);

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

  // QA tool
  expire () {
    this._expiresAt = new Date(new Date().getTime() + 3 * 1000);
  }
}

module.exports = Quote;
