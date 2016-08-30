'use strict';

var Address = require('./address');

module.exports = BankAccount;

function BankAccount (obj) {
  this._id = obj.id; // Not used in buy
  this._type = obj.account.type; // Missing in API
  this._currency = obj.account.currency; // Missing in API
  this._bic = obj.account.bic;
  this._number = obj.account.number;
  this._bank_name = obj.bank.name;
  this._bank_address = new Address(obj.bank.address);
  this._holder_name = obj.holder.name;
  this._holder_address = new Address(obj.holder.address);
  this._referenceText = obj.referenceText;
  this._updated_at = obj.updateTime; // Not used in buy
  this._created_at = obj.createTime; // Not used in buy
}

Object.defineProperties(BankAccount.prototype, {
  // 'id': {
  //   configurable: false,
  //   get: function () {
  //     return this._id;
  //   }
  // },
  'type': {
    configurable: false,
    get: function () {
      return this._type;
    }
  },
  'currency': {
    configurable: false,
    get: function () {
      return this._currency;
    }
  },
  'bic': {
    configurable: false,
    get: function () {
      return this._bic;
    }
  },
  'number': {
    configurable: false,
    get: function () {
      return this._number;
    }
  },
  'bankName': {
    configurable: false,
    get: function () {
      return this._bank_name;
    }
  },
  'bankAddress': {
    configurable: false,
    get: function () {
      return this._bank_address;
    }
  },
  'holderName': {
    configurable: false,
    get: function () {
      return this._holder_name;
    }
  },
  'holderAddress': {
    configurable: false,
    get: function () {
      return this._holder_address;
    }
  },
  'referenceText': {
    configurable: false,
    get: function () {
      return this._referenceText;
    }
  }
  // 'createdAt': {
  //   configurable: false,
  //   get: function () {
  //     return this._created_at;
  //   }
  // },
  // 'updatedAt': {
  //   configurable: false,
  //   get: function () {
  //     return this._updated_at;
  //   }
  // }
});
