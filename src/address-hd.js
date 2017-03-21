var Helpers = require('./helpers');

var assert = require('assert');

class AddressHD {
  constructor (object, account, index) {
    assert(object || object === null, 'Data (or null) missing');
    assert(account.constructor.name === 'HDAccount', 'HDAccount missing');
    assert(Helpers.isPositiveInteger(index), 'Receive index missing');

    this._account = account;
    this._index = index;
    if (object === null) {
      this._label = null;
    } else {
      this._label = object.label;
      this._used = Helpers.isBoolean(object.used) ? object.used : null;
      this._amount = Helpers.isPositiveInteger(object.amount) ? object.amount : null;
    }
    this._balance = null;
    this._address = undefined;
  }

  toJSON () {
    if (this._label === null) return null;
    // To save space, the used and amount fields are not stored if empty
    return {
      label: this._label,
      used: this._used ? this._used : undefined,
      amount: Helpers.isPositiveInteger(this._amount) && this._amount > 0
              ? this._amount : undefined
    };
  }

  get address () {
    if (!this._address) {
      this._address = this._account.receiveAddressAtIndex(this._index);
    }
    return this._address;
  }

  get label () {
    return this._label;
  }

  set label (value) {
    this._label = value;
  }

  get balance () {
    return this._balance;
  }

  set balance (value) {
    this._balance = value;
  }

  get used () {
    return this._used;
  }

  set used (value) {
    this._used = value;
  }

  get amount () {
    return this._amount;
  }

  set amount (value) {
    this._amount = value;
  }
}

module.exports = AddressHD;
