var ExchangePaymentMedium = require('bitcoin-exchange-client').PaymentMedium;
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
    return PaymentAccount.getAll(undefined, undefined, this._api).then((accounts) => {
      this._accounts = accounts;
      return accounts;
    });
  }

  // Buy from a specific account, avoids the need for .getAccounts()
  buy (account) {
    assert(account, 'Specify account');
    let acc = account.accountWithQuote(this._quote);
    return acc.buy();
  }
}

module.exports = PaymentMedium;
