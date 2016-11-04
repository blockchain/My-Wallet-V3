var ExchangePaymentAccount = require('bitcoin-exchange-client').PaymentAccount;
var Trade = require('./trade');

class PaymentAccount extends ExchangePaymentAccount {
  constructor (api, medium, quote) {
    super(api, medium, quote, Trade);
    this._fiatMedium = medium;
  }

  buy () {
    return super.buy().then((trade) => {
      trade._getQuote = this._quote.constructor.getQuote; // Prevents circular dependency
      return trade;
    });
  }
}

module.exports = PaymentAccount;
