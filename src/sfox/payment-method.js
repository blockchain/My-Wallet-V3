var ExchangePaymentMethod = require('../exchange/payment-method');
var Trade = require('./trade');
var assert = require('assert');

class PaymentMethod extends ExchangePaymentMethod {
  constructor (obj, api, quote) {
    super(api, quote, Trade);

    this._TradeClass = Trade;

    if (obj) {
      this._id = obj.payment_method_id;
      this._status = obj.status;
      this._routingNumber = obj.routing_number;
      this._accountNumber = obj.account_number;
      this._name = obj.name;
      this._accountType = obj.account_type;
    } else {
      this._accounts = [];
    }

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

  get accounts () { return this._accounts; }

  get status () { return this._status; }

  get routingNumber () { return this._routingNumber; }

  get accountNumber () { return this._accountNumber; }

  get accountType () { return this._accountType; }

  buy () {
    if (this.status !== 'active') {
      return Promise.reject('ACH_ACCOUNT_INACTIVE');
    }
    return super.buy();
  }

  static fetchAll (inCurrency, outCurrency, api, quote) {
    if (quote) {
      // Return list user's ACH accounts
      var output = [];
      return api.authGET('payment-methods').then(function (res) {
        for (let method of res) {
          output.push(new PaymentMethod(method, api, quote));
        }
        return Promise.resolve(output);
      });
    } else {
      // Return ACH account as a type
      return Promise.resolve([new PaymentMethod(undefined, api)]);
    }
  }

  addAccount (routingNumber, accountNumber, name, nickname, type) {
    assert(this._inMedium === 'ach', 'Not ACH');

    assert(routingNumber && accountNumber, 'Routing and account number required');
    assert(name, 'Account holder name required');
    assert(nickname, 'Nickname required');

    return this._api.authPOST('payment-methods', {
      type: 'ach',
      ach: {
        currency: 'usd',
        routing_number: routingNumber,
        account_number: accountNumber,
        name1: name,
        nickname: nickname,
        type: type || 'checking'
      }
    }).then((res) => {
      this._accounts.push(new PaymentMethod(res, this._api));
    });
  }

  fetchAccounts () {
    return this._api.authGET('payment-methods').then((accounts) => {
      for (let account of accounts) {
        this._accounts.push(new PaymentMethod(account, this._api));
      }
      return this._accounts;
    });
  }

  verify (amount1, amount2) {
    assert(amount1 && amount2, 'Split amounts required');
    return this._api.authPOST('payment-methods/verify', {
      payment_method_id: this._id,
      amount1: amount1,
      amount2: amount2
    }).then((res) => {
      this._status = res.status;
      return this;
    });
  }
}

module.exports = PaymentMethod;
