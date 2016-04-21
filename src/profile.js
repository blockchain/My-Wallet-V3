'use strict';

var MyWallet = require('./wallet');
var assert = require('assert');
var Helpers = require('./helpers');

module.exports = Profile;

function Profile (object) {
  var obj = object || {};

  this._country_code = obj.country_code || null; // ISO 3166-1 alpha-2
}

Object.defineProperties(Profile.prototype, {
  'countryCode': {
    configurable: false,
    get: function () { return this._country_code; },
    set: function (value) {
      assert(
        value &&
        Helpers.isString(value) &&
        value.length === 2 &&
        value.match(/[a-zA-Z]{2}/),
        'ISO 3166-1 alpha-2'
      );
      this._country_code = value.toUpperCase();
      MyWallet.syncWallet();
    }
  }
});

Profile.factory = function (o) {
  if (o instanceof Object && !(o instanceof Profile)) {
    return new Profile(o);
  } else { return o; }
};

Profile.prototype.toJSON = function () {
  var profile = {
    country_code: this._country_code
  };

  return profile;
};

Profile.reviver = function (k, v) {
  if (k === '') return new Profile(v);
  return v;
};
