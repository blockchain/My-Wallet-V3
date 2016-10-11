var assert = require('assert');

class PaymentMethod {
  constructor (api) {
    this._api = api;
  }

  get inMedium () { return this._inMedium; }

  get outMedium () { return this._outMedium; }

  get name () { return this._name; }

  get inCurrencies () { return this._inCurrencies; }

  get outCurrencies () { return this._outCurrencies; }

  get inCurrency () { return this._inCurrency; }

  get outCurrency () { return this._outCurrency; }

  get inFixedFee () { return this._inFixedFee || 0; }

  get outFixedFee () { return this._outFixedFee || 0; }

  get inPercentageFee () { return this._inPercentageFee || 0; }

  get outPercentageFee () { return this._outPercentageFee || 0; }

  get fee () { return this._fee; }

  get total () { return this._total; }

  static fetchAll () {
    assert(false, 'Subclass must implement this. Do not call super');
  }
}

module.exports = PaymentMethod;
