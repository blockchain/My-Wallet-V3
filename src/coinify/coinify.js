'use strict';

var CoinifyProfile = require('./profile');
var CoinifyTrade = require('./trade');
var CoinifyKYC = require('./kyc');
var PaymentMethod = require('./payment-method');
var ExchangeRate = require('./exchange-rate');

var MyWallet = require('../wallet');
var Helpers = require('../helpers');
var API = require('../api');

var assert = require('assert');

module.exports = Coinify;

function Coinify (object, parent) {
  var obj = object || {};
  this._parent = parent; // parent this of external (for save)
  this._user = obj.user;
  this._offline_token = obj.offline_token;
  this._auto_login = obj.auto_login;
  this._rootURL = 'https://app-api.coinify.com/';

  this._profile = new CoinifyProfile(this);
  this._lastQuote = null;

  this._loginExpiresAt = null;

  this._trades = [];
  this._kycs = [];

  this.exchangeRate = new ExchangeRate(this);
}

Object.defineProperties(Coinify.prototype, {
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
  'paymentMethods': {
    configurable: false,
    get: function () {
      return this._payment_methods;
    }
  },
  'isLoggedIn': {
    configurable: false,
    get: function () {
      // Debug: + 60 * 19 * 1000 expires the login after 1 minute
      var tenSecondsAgo = new Date(new Date().getTime() + 10000);
      return Boolean(this._access_token) && this._loginExpiresAt > tenSecondsAgo;
    }
  }
});

Coinify.prototype.toJSON = function () {
  var coinify = {
    user: this._user,
    offline_token: this._offline_token,
    auto_login: this._auto_login
  };

  return coinify;
};
Coinify.prototype.save = function () {
  return this._parent.save();
};
// Country and default currency must be set
// Email must be set and verified
Coinify.prototype.signup = function (countryCode) {
  var runChecks = function () {
    assert(!this.user, 'Already signed up');

    assert(
      countryCode &&
      Helpers.isString(countryCode) &&
      countryCode.length === 2 &&
      countryCode.match(/[a-zA-Z]{2}/),
      'ISO 3166-1 alpha-2'
    );

    assert(MyWallet.wallet.accountInfo.email, 'email required');
    assert(MyWallet.wallet.accountInfo.isEmailVerified, 'email must be verified');
    assert(MyWallet.wallet.accountInfo.currency, 'default currency required');
  };

  var doSignup = function (emailToken) {
    assert(emailToken, 'email token missing');
    return this.POST('signup/trader', {
      email: MyWallet.wallet.accountInfo.email,
      partnerId: 18,
      defaultCurrency: MyWallet.wallet.accountInfo.currency, // ISO 4217
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
    return this.save();
  };

  return Promise.resolve().then(runChecks.bind(this))
                          .then(this.getEmailToken.bind(this))
                          .then(doSignup.bind(this))
                          .then(saveMetadata.bind(this));
};

Coinify.prototype.getEmailToken = function () {
  return API.request(
    'GET',
    'wallet/signed-email-token',
    {
      guid: MyWallet.wallet.guid,
      sharedKey: MyWallet.wallet.sharedKey
    }
  ).then(function (res) {
    if (res.success) {
      return res.token;
    } else {
      throw new Error('Unable to obtain email verification proof');
    }
  });
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
  var parentThis = this;

  if (this.isLoggedIn) {
    return this._profile.fetch();
  } else {
    return this.login().then(function () {
      return parentThis._profile.fetch();
    });
  }
};

Coinify.prototype.getQuote = function (amount, baseCurrency) {
  // TODO: mnemonize (taking expiration into account)

  if (baseCurrency && ['BTC', 'EUR', 'GBP', 'USD', 'DKK'].indexOf(baseCurrency) === -1) {
    return Promise.reject('base_currency_not_supported');
  }

  var self = this;

  var processQuote = function (quote) {
    var expiresAt = new Date(quote.expiryTime);

    // Debug, make quote expire in 15 seconds:
    // expiresAt = new Date(new Date().getTime() + 15 * 1000);

    self._lastQuote = {
      id: quote.id,
      baseCurrency: quote.baseCurrency,
      quoteCurrency: quote.quoteCurrency,
      baseAmount: quote.baseAmount,
      quoteAmount: quote.quoteAmount * 100, // API is in μBTC
      expiresAt: expiresAt
    };
    return Promise.resolve(self._lastQuote);
  };

  var getQuote = function (profile) {
    baseCurrency = baseCurrency || profile.defaultCurrency;
    var quoteCurrency = baseCurrency === 'BTC' ? profile.defaultCurrency : 'BTC';

    return self.POST('trades/quote', {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      baseAmount: -amount
    }).then(processQuote);
  };

  if (this.profile === null) {
    return this.fetchProfile().then(getQuote);
  } else {
    if (!this.isLoggedIn) {
      return this.login().then(function () { getQuote(self.profile); });
    } else {
      return getQuote(this.profile);
    }
  }
};

Coinify.prototype.buy = function (amount, baseCurrency, medium) {
  assert(this._lastQuote !== null, 'You must first obtain a quote');
  assert(this._lastQuote.baseAmount === -amount, 'Amount must match last quote');
  assert(this._lastQuote.baseCurrency === baseCurrency, 'Currency must match last quote');
  assert(this._lastQuote.expiresAt > new Date(), 'Quote expired');
  assert(medium === 'bank' || medium === 'card', 'Specify bank or card');

  var self = this;

  var doBuy = function () {
    return CoinifyTrade.buy(self._lastQuote, medium, self);
  };

  if (!this.isLoggedIn) {
    return this.login().then(doBuy);
  } else {
    return doBuy();
  }
};

Coinify.prototype.getTrades = function () {
  return CoinifyTrade.fetchAll(this);
};

Coinify.prototype.triggerKYC = function () {
  var self = this;

  var doKYC = function () {
    return CoinifyKYC.trigger(self);
  };

  if (!this.isLoggedIn) {
    return this.login().then(doKYC);
  } else {
    return doKYC();
  }
};

Coinify.prototype.getKYCs = function () {
  return CoinifyKYC.fetchAll(this);
};

Coinify.prototype.getPaymentMethods = function (inCurrency, outCurrency) {
  assert(inCurrency, 'In currency required');
  assert(outCurrency, 'Out currency required');
  return PaymentMethod.fetchAll(inCurrency, outCurrency, this);
};

Coinify.prototype.getBuyMethods = function () {
  return PaymentMethod.fetchAll(undefined, 'BTC', this);
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

Coinify.prototype.getSellMethods = function () {
  return PaymentMethod.fetchAll('BTC', undefined, this);
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

Coinify.prototype.GET = function (endpoint, data) {
  return this.request('GET', endpoint, data);
};

Coinify.prototype.POST = function (endpoint, data) {
  return this.request('POST', endpoint, data);
};

Coinify.prototype.PATCH = function (endpoint, data) {
  return this.request('PATCH', endpoint, data);
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

  if (method === 'GET') {
    url += '?' + API.encodeFormData(data);
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

Coinify.new = function (parent) {
  var object = {
    auto_login: true
  };
  var coinify = new Coinify(object, parent);
  return coinify;
};
