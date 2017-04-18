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
    }
    this._used = null;
    this._balance = null;
    this._address = undefined;
  }

  toJSON () {
    if (this._label === null) return null;
    return {
      label: this._label
    };
  }

  get address () {
    if (!this._address) {
      this._address = this._account.receiveAddressAtIndex(this._index);
    }
    return this._address;
  }

  get index () {
    return this._index;
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
}

module.exports = AddressHD;
