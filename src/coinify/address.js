'use strict';

module.exports = Address;

function Address (obj) {
  this._street = obj.street;
  this._city = obj.city;
  this._state = obj.state;
  this._zipcode = obj.zipcode;
  this._country = obj.country;
}

Object.defineProperties(Address.prototype, {
  'city': {
    configurable: false,
    get: function () {
      return this._city;
    }
  },
  'country': {
    configurable: false,
    get: function () {
      return this._country;
    }
  },
  'state': { // ISO 3166-2, the part after the dash
    configurable: false,
    get: function () {
      return this._state;
    }
  },
  'street': {
    configurable: false,
    get: function () {
      return this._street;
    }
  },
  'zipcode': {
    configurable: false,
    get: function () {
      return this._zipcode;
    }
  }
});
