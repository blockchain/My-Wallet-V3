'use strict';

/* To use this class, two things are needed:
1 - a delegate object with functions that provide the following:
      save() -> e.g. function () { return JSON.stringify(this._sfox); }
      email() -> String            : the users email address
      mobile() -> String           : the users mobile number
      isEmailVerified() -> Boolean : whether the users email is verified
      isMobileVerified() -> Boolean : whether the users mobile is verified
      getToken() -> stringify : JSON web token {
                                                  email: 'me@example.com',
                                                  phone_number: '+155512345678'}
      monitorAddress(address, callback) : callback(amount) if btc received
      checkAddress(address) : look for existing transaction at address
      getReceiveAddress(trade) : return the trades receive address
      reserveReceiveAddress()
      commitReceiveAddress()
      releaseReceiveAddress()
      serializeExtraFields(obj, trade) : e.g. obj.account_index = ...
      deserializeExtraFields(obj, trade)

2 - a SFOX partner identifier

var object = {user: 1, account_token: 'token'};
var sfox = new SFOX(object, delegate);
sfox.partnerId = ...;
sfox.delegate.save.bind(sfox.delegate)()
// "{"user":1,"account_token":"token"}"
*/

var API = require('./api');
var Helpers = require('../exchange/helpers');

var assert = require('assert');

module.exports = SFOX;

function SFOX (object, delegate) {
  assert(delegate, 'ExchangeDelegate required');
  this._delegate = delegate;
  var obj = object || {};
  this._partner_id = null;
  this._user = obj.user;
  this._auto_login = obj.auto_login;
  this._accountToken = obj.account_token;
  this._api = new API();
  this._api._accountToken = this._accountToken;

  this._trades = [];
}

Object.defineProperties(SFOX.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (value) {
      this._debug = Boolean(value);
      this._delegate.debug = Boolean(value);
      for (var i = 0; i < this.trades.length; i++) {
        this.trades[i].debug = Boolean(value);
      }
    }
  },
  'delegate': {
    configurable: false,
    get: function () { return this._delegate; }
  },
  'user': {
    configurable: false,
    get: function () { return this._user; }
  },
  'autoLogin': {
    configurable: false,
    get: function () { return this._auto_login; },
    set: function (value) {
      assert(
        Helpers.isBoolean(value),
        'Boolean'
      );
      this._auto_login = value;
      this.delegate.save.bind(this.delegate)();
    }
  },
  'trades': {
    configurable: false,
    get: function () {
      return this._trades;
    }
  },
  'hasAccount': {
    configurable: false,
    get: function () {
      return Boolean(this._accountToken);
    }
  },
  'partnerId': {
    configurable: false,
    get: function () {
      return this._partner_id;
    },
    set: function (value) {
      this._partner_id = value;
    }
  },
  'buyCurrencies': {
    configurable: false,
    get: function () {
      return ['USD'];
    }
  },
  'sellCurrencies': {
    configurable: false,
    get: function () {
      return ['USD'];
    }
  }
});

SFOX.prototype.toJSON = function () {
  var sfox = {
    user: this._user,
    account_token: this._accountToken,
    auto_login: this._auto_login,
    trades: []
  };

  return sfox;
};
// Email must be set and verified
// Mobile must be set and verified
SFOX.prototype.signup = function () {
  var self = this;
  var runChecks = function () {
    assert(!self.user, 'Already signed up');

    assert(self.delegate, 'ExchangeDelegate required');

    assert(self.delegate.email(), 'email required');
    assert(self.delegate.mobile(), 'mobile required');
    assert(self.delegate.isEmailVerified(), 'email must be verified');
    assert(self.delegate.isMobileVerified(), 'mobile must be verified');
  };

  var doSignup = function (token) {
    assert(token, 'email + mobile token missing');
    return this._api.POST('account', {
      username: self.delegate.email(),
      user_data: token
    });
  };

  var saveMetadata = function (res) {
    this._user = res.account.id;
    this._accountToken = res.token;
    this._api._accountToken = this._accountToken;
    return this._delegate.save.bind(this._delegate)().then(function () { return res; });
  };

  return Promise.resolve().then(runChecks.bind(this))
                          .then(this.delegate.getToken.bind(this.delegate))
                          .then(doSignup.bind(this))
                          .then(saveMetadata.bind(this));
};

SFOX.new = function (delegate) {
  assert(delegate, 'SFOX.new requires delegate');
  var object = {
    auto_login: true
  };
  var sfox = new SFOX(object, delegate);
  return sfox;
};
