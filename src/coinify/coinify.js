'use strict';

var CoinifyProfile = require('./profile');
var CoinifyTrade = require('./trade');
var PaymentMethod = require('./payment-method');

var MyWallet = require('../wallet');
var Helpers = require('../helpers');
var HDAccount = require('../hd-account');
var API = require('../api');

var assert = require('assert');

module.exports = Coinify;

function Coinify (object) {
  var obj = object || {};

  this._user = obj.user;
  this._offline_token = obj.offline_token;
  this._auto_login = obj.auto_login;
  this._rootURL = 'https://app-api.coinify.com/';

  this._profile = new CoinifyProfile(this);
  this._lastQuote = null;
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
      MyWallet.syncWallet();
    }
  },
  'profile': {
    configurable: false,
    get: function () {
      if (!this._access_token || !this._profile._did_fetch) {
        return null;
      } else {
        return this._profile;
      }
    }
  }
});

Coinify.factory = function (o) {
  if (o instanceof Object && !(o instanceof Coinify)) {
    return new Coinify(o);
  } else { return o; }
};

Coinify.prototype.toJSON = function () {
  var coinify = {
    user: this._user,
    offline_token: this._offline_token,
    auto_login: this._auto_login
  };

  return coinify;
};

// Country and default currency must be set
// Email must be set and verified
Coinify.prototype.signup = function () {
  var parentThis = this;

  var promise = new Promise(function (resolve, reject) {
    var email = MyWallet.wallet.accountInfo.email;
    var currency = MyWallet.wallet.accountInfo.currency;
    assert(!parentThis.user, 'Already signed up');
    var countryCode = MyWallet.wallet.profile.countryCode;
    assert(countryCode, 'Country must be set');
    assert(email, 'email required');
    assert(MyWallet.wallet.accountInfo.isEmailVerified, 'email must be verified');
    assert(currency, 'default currency required');

    var signupSuccess = function (res) {
      parentThis._user = res.trader.id;
      parentThis._offline_token = res.offlineToken;

      MyWallet.syncWallet();

      resolve();
    };

    var signupFailed = function (e) {
      reject(e);
    };

    parentThis.getEmailToken().then(function (emailToken) {
      parentThis.POST('signup/trader', {
        email: email,
        partnerId: 18,
        defaultCurrency: currency, // ISO 4217
        profile: {
          address: {
            country: countryCode
          }
        },
        trustedEmailValidationToken: emailToken,
        generateOfflineToken: true
      }).then(signupSuccess).catch(signupFailed);
    });
  });

  return promise;
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

  if (this._access_token) {
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

  var parentThis = this;

  var processQuote = function (quote) {
    var expiresAt = new Date(quote.expiryTime);

    parentThis._lastQuote = {
      id: quote.id,
      baseCurrency: quote.baseCurrency,
      quoteCurrency: quote.quoteCurrency,
      baseAmount: quote.baseAmount,
      quoteAmount: quote.quoteAmount * 100, // API is in μBTC
      expiresAt: expiresAt
    };
    return Promise.resolve(parentThis._lastQuote);
  };

  var getQuote = function (profile) {
    baseCurrency = baseCurrency || profile.defaultCurrency;
    var quoteCurrency = baseCurrency === 'BTC' ? profile.defaultCurrency : 'BTC';

    return parentThis.POST('trades/quote', {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      baseAmount: -amount
    }).then(processQuote);
  };

  if (this.profile === null) {
    return this.fetchProfile().then(getQuote);
  } else {
    return getQuote(this.profile);
  }
};

Coinify.prototype.buy = function (amount, account) {
  assert(account === undefined || Helpers.isInstanceOf(account, HDAccount), 'HDAccount');
  var parentThis = this;

  if (account === undefined) {
    account = MyWallet.wallet.hdwallet.accounts[0];
  }

  var receiveAddressIndex = account.receiveIndex;

  var processTrade = function (res) {
    var trade = new CoinifyTrade(res, parentThis);
    account.setLabelForReceivingAddress(receiveAddressIndex, 'Coinify order #' + trade.id);
    return Promise.resolve(trade);
  };

  var buy = function () {
    return parentThis.POST('trades', {
      priceQuoteId: parentThis._lastQuote.id,
      baseCurrency: parentThis._lastQuote.baseCurrency,
      quoteCurrency: parentThis._lastQuote.quoteCurrency,
      baseAmount: -amount,
      transferIn: {
        medium: 'card'
      },
      transferOut: {
        medium: 'blockchain',
        details: {
          account: account.receiveAddressAtIndex(receiveAddressIndex)
        }
      }
    }).then(processTrade);
  };

  var tenSecondsFromNow = new Date(new Date() + 10000);
  if (
    this._lastQuote === null ||
    this._lastQuote.baseAmount !== amount ||
    this._lastQuote.expiresAt < tenSecondsFromNow
  ) {
    return this.getQuote(amount).then(buy);
  } else {
    return buy();
  }
};

Coinify.prototype.getTrades = function () {
  var parentThis = this;

  var getTrades = function () {
    return parentThis.GET('trades').then(function (res) {
      var output = [];
      for (var i = 0; i < res.length; i++) {
        var trade = new CoinifyTrade(res[i], parentThis);
        output.push(trade);
      }
      return Promise.resolve(output);
    });
  };

  if (this._access_token) {
    return getTrades();
  } else {
    return this.login().then(getTrades);
  }
};

Coinify.prototype.getPaymentMethods = function (currency) {
  return PaymentMethod.fetchAll(this, currency);
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

  if (this._access_token) {
    options.headers['Authorization'] = 'Bearer ' + this._access_token;
  }

  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  options.method = method;

  var handleNetworkError = function (e) {
    return Promise.reject({ error: 'COINIFY_CONNECT_ERROR', message: e });
  };

  var checkStatus = function (response) {
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };

  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus);
};

Coinify.reviver = function (k, v) {
  if (k === '') return new Coinify(v);
  return v;
};

Coinify.new = function () {
  var object = {
    auto_login: true
  };
  var coinify = new Coinify(object);
  return coinify;
};
