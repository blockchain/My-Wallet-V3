'use strict';

/* To use this class, three things are needed:
1 - a delegate object with functions that provide the following:
      email() -> String            : the users email address
      isEmailVerified() -> Boolean : whether the users email is verified
      getEmailToken() -> stringify : JSON web token {email: 'me@example.com'}
      monitorAddress(address, callback) : callback(amount) if btc received
      checkAddress(address) : look for existing transaction at address
      getReceiveAddress(trade) : return the trades receive address
      reserveReceiveAddress()
      commitReceiveAddress()
      releaseReceiveAddress()
      serializeExtraFields(obj, trade) : e.g. obj.account_index = ...
      deserializeExtraFields(obj, trade)

2 - a Coinify parner identifier

3 - a parent object with a save() method, e.g.:
    var parent = {
      save: function () { return JSON.stringify(this._coinify); }
    }
    var object = {user: 1, offline_token: 'token'};
    var coinify = new Coinify(object, parent, delegate);
    coinify.partnerId = ...;
    parent._coinify = coinify;
    coinify.save()
    // "{"user":1,"offline_token":"token"}"
*/

var CoinifyProfile = require('./profile');
var CoinifyTrade = require('./trade');
var CoinifyKYC = require('./kyc');
var PaymentMethod = require('./payment-method');
var ExchangeRate = require('./exchange-rate');
var Quote = require('./quote');
var API = require('./api');

var assert = require('assert');

var isBoolean = function (value) {
  return typeof (value) === 'boolean';
};

var isString = function (str) {
  return typeof str === 'string' || str instanceof String;
};

module.exports = Coinify;

function Coinify (object, parent, delegate) {
  var obj = object || {};
  this._parent = parent; // parent this of external (for save)
  this._delegate = delegate; // ExchangeDelegate
  this._partner_id = null;
  this._user = obj.user;
  this._auto_login = obj.auto_login;
  this._offlineToken = obj.offline_token;

  this._api = new API();
  this._api._offlineToken = this._offlineToken;

  this._profile = new CoinifyProfile(this._api);
  this._lastQuote = null;

  this._buyCurrencies = null;
  this._sellCurrencies = null;

  this._trades = [];
  if (obj.trades) {
    for (var i = 0; i < obj.trades.length; i++) {
      var trade = new CoinifyTrade(obj.trades[i], this._api, this.delegate, this);
      trade.debug = this._debug;
      this._trades.push(trade);
    }
  }

  this._kycs = [];

  this.exchangeRate = new ExchangeRate(this._api);
}

Object.defineProperties(Coinify.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (value) {
      this._debug = Boolean(value);
    }
  },
  'delegate': {
    configurable: false,
    get: function () { return this._delegate; },
    set: function (value) {
      this._delegate = value;
      if (this._delegate) {
        this._delegate.debug = this._debug;
      }
    }
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
        isBoolean(value),
        'Boolean'
      );
      this._auto_login = value;
      this.save();
    }
  },
  'profile': {
    configurable: false,
    get: function () {
      if (!this._profile._did_fetch) {
        return null;
      } else {
        return this._profile;
      }
    }
  },
  'trades': {
    configurable: false,
    get: function () {
      return this._trades;
    }
  },
  'kycs': {
    configurable: false,
    get: function () {
      return this._kycs;
    }
  },
  'hasAccount': {
    configurable: false,
    get: function () {
      return Boolean(this._offlineToken);
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
      return this._buyCurrencies;
    }
  },
  'sellCurrencies': {
    configurable: false,
    get: function () {
      return this._sellCurrencies;
    }
  }
});

Coinify.prototype.toJSON = function () {
  var coinify = {
    user: this._user,
    offline_token: this._offlineToken,
    auto_login: this._auto_login,
    trades: CoinifyTrade.filteredTrades(this._trades)
  };

  return coinify;
};
Coinify.prototype.save = function () {
  return this._parent.save();
};
// Country and default currency must be set
// Email must be set and verified
Coinify.prototype.signup = function (countryCode, currencyCode) {
  var self = this;
  var runChecks = function () {
    assert(!self.user, 'Already signed up');

    assert(self.delegate, 'ExchangeDelegate required');

    assert(
      countryCode &&
      isString(countryCode) &&
      countryCode.length === 2 &&
      countryCode.match(/[a-zA-Z]{2}/),
      'ISO 3166-1 alpha-2'
    );

    assert(currencyCode, 'currency required');

    assert(self.delegate.email(), 'email required');
    assert(self.delegate.isEmailVerified(), 'email must be verified');
  };

  var doSignup = function (emailToken) {
    assert(emailToken, 'email token missing');
    return this._api.POST('signup/trader', {
      email: self.delegate.email(),
      partnerId: self.partnerId,
      defaultCurrency: currencyCode, // ISO 4217
      profile: {
        address: {
          country: countryCode.toUpperCase()
        }
      },
      trustedEmailValidationToken: emailToken,
      generateOfflineToken: true
    });
  };

  var saveMetadata = function (res) {
    this._user = res.trader.id;
    this._offlineToken = res.offlineToken;
    this._api._offlineToken = this._offlineToken;
    return this.save().then(function () { return res; });
  };

  return Promise.resolve().then(runChecks.bind(this))
                          .then(this.delegate.getEmailToken.bind(this.delegate))
                          .then(doSignup.bind(this))
                          .then(saveMetadata.bind(this));
};

Coinify.prototype.fetchProfile = function () {
  return this._profile.fetch();
};

Coinify.prototype.getBuyQuote = function (amount, baseCurrency, quoteCurrency) {
  assert(baseCurrency, 'Specify base currency');
  assert(baseCurrency !== 'BTC' || quoteCurrency, 'Specify quote currency');
  if (baseCurrency !== 'BTC') {
    quoteCurrency = 'BTC';
  }
  return Quote.getQuote(this._api, -amount, baseCurrency, quoteCurrency)
              .then(this.setLastQuote.bind(this));
};

Coinify.prototype.setLastQuote = function (quote) {
  this._lastQuote = quote;
  return quote;
};

Coinify.prototype.buy = function (amount, baseCurrency, medium) {
  assert(this._lastQuote !== null, 'You must first obtain a quote');
  assert(this._lastQuote.baseAmount === -amount, 'LAST_QUOTE_AMOUNT_DOES_NOT_MATCH');
  assert(this._lastQuote.baseCurrency === baseCurrency, 'Currency must match last quote');
  assert(this._lastQuote.expiresAt > new Date(), 'LAST_QUOTE_EXPIRED');
  assert(medium === 'bank' || medium === 'card', 'Specify bank or card');

  var addTrade = function (trade) {
    trade.debug = this._debug;
    this._trades.push(trade);
    return this.save().then(function () { return trade; });
  };

  return CoinifyTrade.buy(
    this._lastQuote,
    medium,
    this._api,
    this.delegate,
    this._trades,
    this
  ).then(addTrade.bind(this));
};

Coinify.prototype.updateList = function (list, items, ListClass) {
  var item;
  for (var i = 0; i < items.length; i++) {
    item = undefined;
    for (var k = 0; k < list.length; k++) {
      if (list[k]._id === items[i].id) {
        item = list[k];
        item.debug = this.debug;
        item.set.bind(item)(items[i]);
      }
    }
    if (item === undefined) {
      item = new ListClass(items[i], this._api, this.delegate, this);
      item.debug = this.debug;
      list.push(item);
    }
  }
};

Coinify.prototype.getTrades = function () {
  var self = this;
  var save = function () {
    return this.save().then(function () { return self._trades; });
  };
  var update = function (trades) {
    this.updateList(this._trades, trades, CoinifyTrade);
  };
  var process = function () {
    for (var i = 0; i < this._trades.length; i++) {
      var trade = this._trades[i];
      trade.process(this._trades);
    }
  };
  return CoinifyTrade.fetchAll(this._api)
                     .then(update.bind(this))
                     .then(process.bind(this))
                     .then(save.bind(this));
};

Coinify.prototype.triggerKYC = function () {
  var addKYC = function (kyc) {
    this._kycs.push(kyc);
    return kyc;
  };

  return CoinifyKYC.trigger(this._api).then(addKYC.bind(this));
};

Coinify.prototype.getKYCs = function () {
  var self = this;
  var save = function () {
    return this.save().then(function () { return self._kycs; });
  };
  var update = function (kycs) {
    this.updateList(this._kycs, kycs, CoinifyKYC);
  };
  return CoinifyKYC.fetchAll(this._api, this)
                     .then(update.bind(this))
                     .then(save.bind(this));
};

Coinify.prototype.getBuyMethods = function () {
  return PaymentMethod.fetchAll(undefined, 'BTC', this._api);
};

Coinify.prototype.getSellMethods = function () {
  return PaymentMethod.fetchAll('BTC', undefined, this._api);
};

Coinify.prototype.getBuyCurrencies = function () {
  var getCurrencies = function (paymentMethods) {
    var currencies = [];
    for (var i = 0; i < paymentMethods.length; i++) {
      var paymentMethod = paymentMethods[i];
      for (var j = 0; j < paymentMethod.inCurrencies.length; j++) {
        var inCurrency = paymentMethod.inCurrencies[j];
        if (currencies.indexOf(inCurrency) === -1) {
          currencies.push(paymentMethod.inCurrencies[j]);
        }
      }
    }
    this._buyCurrencies = JSON.parse(JSON.stringify(currencies));
    return currencies;
  };
  return this.getBuyMethods().then(getCurrencies.bind(this));
};

Coinify.prototype.getSellCurrencies = function () {
  var getCurrencies = function (paymentMethods) {
    var currencies = [];
    for (var i = 0; i < paymentMethods.length; i++) {
      var paymentMethod = paymentMethods[i];
      for (var j = 0; j < paymentMethod.outCurrencies.length; j++) {
        var outCurrency = paymentMethod.outCurrencies[j];
        if (currencies.indexOf(outCurrency) === -1) {
          currencies.push(paymentMethod.outCurrencies[j]);
        }
      }
    }
    this._sellCurrencies = JSON.parse(JSON.stringify(currencies));
    return currencies;
  };
  return this.getSellMethods().then(getCurrencies.bind(this));
};

Coinify.prototype.monitorPayments = function () {
  CoinifyTrade.monitorPayments(this._trades, this);
};

Coinify.new = function (parent, delegate) {
  var object = {
    auto_login: true
  };
  var coinify = new Coinify(object, parent, delegate);
  return coinify;
};
