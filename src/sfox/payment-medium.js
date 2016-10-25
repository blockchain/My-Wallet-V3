var ExchangePaymentMedium = require('../exchange/payment-medium');
var PaymentAccount = require('./payment-account');
var assert = require('assert');

class PaymentMedium extends ExchangePaymentMedium {
  constructor (obj, api, quote) {
    super(api, quote);

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

    if (quote) {
      this._fee = 0;
      this._total = -quote.baseAmount;
    }
  }

  static getAll (inCurrency, outCurrency, api, quote) {
    // Return ACH account as a type
    return Promise.resolve({ach: new PaymentMedium(undefined, api, quote)});
  }

  addAccount (routingNumber, accountNumber, name, nickname, type) {
    assert(this._inMedium === 'ach', 'Not ACH');

    return PaymentAccount.add(this._api, routingNumber, accountNumber, name, nickname, type).then((account) => {
      this._accounts.push(account);
      return account;
    });
  }

  getAccounts () {
    return this._api.authGET('payment-methods').then((accounts) => {
      for (let account of accounts) {
        this._accounts.push(new PaymentAccount(account, this._api, this._quote));
      }
      return this._accounts;
    });
  }
}

module.exports = PaymentMedium;
