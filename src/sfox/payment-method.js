var ExchangePaymentMethod = require('../exchange/payment-method');
var Trade = require('./trade');

class PaymentMethod extends ExchangePaymentMethod {
  constructor (obj, api, quote) {
    super(api, quote);

    this._TradeClass = Trade;

    this._id = obj.payment_method_id;
    this._status = obj.status;
    this._routingNumber = obj.routing_number;
    this._accountNumber = obj.account_number;
    this._name = obj.name;
    this._accountType = obj.account_type;

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

    this._fee = 0;
    this._total = -quote.baseAmount;
  }

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
        output.length = 0;
        for (let method of res) {
          output.push(new PaymentMethod(method, api, quote));
        }
        return Promise.resolve(output);
      });
    } else {
      // Return ACH account as a type
      return Promise.resolve([new PaymentMethod(api, quote)]);
    }
  }
}

module.exports = PaymentMethod;
