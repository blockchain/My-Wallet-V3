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
  this._offline_token = obj.offline_token;
  this._auto_login = obj.auto_login;
  this._rootURL = 'https://app-api.coinify.com/';

  this._profile = new CoinifyProfile(this);
  this._lastQuote = null;

  this._loginExpiresAt = null;

  this._trades = [];
  if (obj.trades) {
    for (var i = 0; i < obj.trades.length; i++) {
      this._trades.push(new CoinifyTrade(obj.trades[i], this));
    }
  }

  this._kycs = [];

  this.exchangeRate = new ExchangeRate(this);
}

Object.defineProperties(Coinify.prototype, {
  'delegate': {
    configurable: false,
    get: function () { return this._delegate; },
    set: function (value) {
      this._delegate = value;
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
      return Boolean(this._offline_token);
    }
  },
  'isLoggedIn': {
    configurable: false,
    get: function () {
      // Debug: + 60 * 19 * 1000 expires the login after 1 minute
      var tenSecondsAgo = new Date(new Date().getTime() + 10000);
      return Boolean(this._access_token) && this._loginExpiresAt > tenSecondsAgo;
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
  }
});

Coinify.prototype.toJSON = function () {
  var coinify = {
    user: this._user,
    offline_token: this._offline_token,
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
    return this.POST('signup/trader', {
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
    this._offline_token = res.offlineToken;
    return this.save().then(function () { return res; });
  };

  return Promise.resolve().then(runChecks.bind(this))
                          .then(this.delegate.getEmailToken.bind(this.delegate))
                          .then(doSignup.bind(this))
                          .then(saveMetadata.bind(this));
};

Coinify.prototype.login = function () {
  var parentThis = this;

  var promise = new Promise(function (resolve, reject) {
    assert(parentThis._offline_token, 'Offline token required');

    var loginSuccess = function (res) {
      parentThis._access_token = res.access_token;
      parentThis._loginExpiresAt = new Date(new Date().getTime() + res.expires_in * 1000);
      resolve();
    };

    var loginFailed = function (e) {
      reject(e);
    };
    parentThis.POST('auth', {
      grant_type: 'offline_token',
      offline_token: parentThis._offline_token
    }).then(loginSuccess).catch(loginFailed);
  });

  return promise;
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
  return Quote.getQuote(this, -amount, baseCurrency, quoteCurrency)
              .then(this.setLastQuote.bind(this));
};

Coinify.prototype.setLastQuote = function (quote) {
  this._lastQuote = quote;
  return quote;
};

Coinify.prototype.buy = function (amount, baseCurrency, medium) {
  assert(this._lastQuote !== null, 'You must first obtain a quote');
  assert(this._lastQuote.baseAmount === -amount, 'Amount must match last quote');
  assert(this._lastQuote.baseCurrency === baseCurrency, 'Currency must match last quote');
  assert(this._lastQuote.expiresAt > new Date(), 'Quote expired');
  assert(medium === 'bank' || medium === 'card', 'Specify bank or card');

  var self = this;

  return CoinifyTrade.buy(self._lastQuote, medium, self);
};

Coinify.prototype.getTrades = function () {
  return CoinifyTrade.fetchAll(this);
};

Coinify.prototype.triggerKYC = function () {
  var self = this;

  return CoinifyKYC.trigger(self);
};

Coinify.prototype.getKYCs = function () {
  return CoinifyKYC.fetchAll(this);
};

// DEPRECATED, used get[Buy/Sell]Methods() or quote.getPaymentMethods()
Coinify.prototype.getPaymentMethods = function (inCurrency, outCurrency) {
  console.warn('coinify.getPaymentMethods() is deprecated');
  assert(inCurrency || outCurrency, 'In or out currency required');
  assert(outCurrency, 'Out currency required');
  return PaymentMethod.fetchAll(inCurrency, outCurrency, this);
};

Coinify.prototype.getBuyMethods = function () {
  return PaymentMethod.fetchAll(undefined, 'BTC', this);
};

Coinify.prototype.getSellMethods = function () {
  return PaymentMethod.fetchAll('BTC', undefined, this);
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
    return currencies;
  };
  return this.getBuyMethods().then(getCurrencies);
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
    return currencies;
  };
  return this.getSellMethods().then(getCurrencies);
};

Coinify.prototype.monitorPayments = function () {
  CoinifyTrade.monitorPayments(this);
};

Coinify.prototype.GET = function (endpoint, data) {
  return this.request('GET', endpoint, data);
};

Coinify.prototype.authGET = function (endpoint, data) {
  var doGET = function () {
    return this.GET(endpoint, data);
  };

  if (this.isLoggedIn) {
    return doGET.bind(this)();
  } else {
    return this.login().then(doGET.bind(this));
  }
};

Coinify.prototype.POST = function (endpoint, data) {
  return this.request('POST', endpoint, data);
};

Coinify.prototype.authPOST = function (endpoint, data) {
  var doPOST = function () {
    return this.POST(endpoint, data);
  };

  if (this.isLoggedIn) {
    return doPOST.bind(this)();
  } else {
    return this.login().then(doPOST.bind(this));
  }
};

Coinify.prototype.PATCH = function (endpoint, data) {
  return this.request('PATCH', endpoint, data);
};

Coinify.prototype.authPATCH = function (endpoint, data) {
  var doPATCH = function () {
    return this.PATCH(endpoint, data);
  };

  if (this.isLoggedIn) {
    return doPATCH.bind(this)();
  } else {
    return this.login().then(doPATCH.bind(this));
  }
};

Coinify.prototype.request = function (method, endpoint, data) {
  var url = this._rootURL + endpoint;

  var options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };

  if (this.isLoggedIn) {
    options.headers['Authorization'] = 'Bearer ' + this._access_token;
  }

  // encodeFormData :: Object -> url encoded params
  var encodeFormData = function (data) {
    if (!data) return '';
    var encoded = Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
    return encoded;
  };

  if (method === 'GET') {
    url += '?' + encodeFormData(data);
  } else {
    options.body = JSON.stringify(data);
  }

  options.method = method;

  var handleNetworkError = function (e) {
    return Promise.reject({ error: 'COINIFY_CONNECT_ERROR', message: e });
  };

  var checkStatus = function (response) {
    if (response.status === 204) {
      return;
    } else if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };

  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus);
};

Coinify.new = function (parent, delegate) {
  var object = {
    auto_login: true
  };
  var coinify = new Coinify(object, parent, delegate);
  return coinify;
};
