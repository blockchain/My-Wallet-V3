'use strict';

var MyWallet = require('./wallet');
var Helpers = require('./helpers');
var API = require('./api');
var CoinifyProfile = require('./coinify-profile');

var assert  = require('assert');

module.exports = Coinify;

function Coinify (object) {
  var obj = object || {};

  this._user = obj.user;
  this._offline_token = obj.offline_token;
  this._auto_login = obj.auto_login;
  this._rootURL = 'https://app-api.coinify.com/';


  this._profile = new CoinifyProfile(this);
}

Object.defineProperties(Coinify.prototype, {
  'user': {
    configurable: false,
    get: function () { return this._user; }
  },
  'autoLogin': {
    configurable: false,
    get: function () { return this._auto_login;},
    set: function (value) {
      assert(
        Helpers.isBoolean(value),
        "Boolean"
      );
      this._auto_login = value;
      MyWallet.syncWallet();
    }
  },
  'profile' : {
    configurable: false,
    get: function () {
      if(!this._access_token || !this._profile._did_fetch) {
        return null;
      } else {
        return this._profile;
      }
    },
  }
});

Coinify.factory = function (o){
  if (o instanceof Object && !(o instanceof Coinify)) {
    return new Coinify(o);
  }
  else { return o; }
};

Coinify.prototype.toJSON = function (){

  var coinify = {
    user          : this._user,
    offline_token : this._offline_token,
    auto_login    : this._auto_login
  };

  return coinify;
};

// Country must be set
// Email must be provided
// Mobile must be provided
// Default currency must be provided
// TODO: email & mobile should be stored in MyWallet after get-info call
Coinify.prototype.signup = function(email, mobile, currency) {
  var parentThis = this;

  var promise = new Promise(function (resolve, reject) {
    assert(!parentThis.user, "Already signed up");
    var countryCode = MyWallet.wallet.profile.countryCode;
    assert(countryCode, "Country must be set");
    assert(email, "email required");
    assert(mobile, "mobile required");
    assert(currency, "default currency required");

    var signupSuccess = function(res) {
      parentThis._user = res.trader.id;
      parentThis._offline_token = res.offlineToken;

      MyWallet.syncWallet();

      resolve();
    };

    var signupFailed = function(e) {
      reject(e);
    }

    parentThis.POST('signup/trader', {
      email: email,
      partnerId: 18,
      defaultCurrency: currency, // ISO 4217
      profile: {
        address: {
          country: countryCode
        },
        mobile: mobile
      },
      generateOfflineToken: true
    }).then(signupSuccess).catch(signupFailed)

  });

  return promise;
}

Coinify.prototype.login = function() {
  var parentThis = this;

  var promise = new Promise(function (resolve, reject) {
    assert(parentThis._offline_token, 'Offline token required');

    var loginSuccess = function(res) {
      parentThis._access_token = res.access_token;
      resolve();
    };

    var loginFailed = function(e) {
      reject(e);
    }

    parentThis.POST('auth', {
      grant_type: 'offline_token',
      offline_token: parentThis._offline_token
    }).then(loginSuccess).catch(loginFailed);


  });

  return promise;
}

Coinify.prototype.fetchProfile = function() {
  var parentThis = this;

  if(this._access_token) {
    return this._profile.fetch();
  } else {
    return this.login().then(function() {
      parentThis._profile.fetch();
    })
  }
}

Coinify.prototype.GET = function (endpoint, data) {
  return this.request("GET", endpoint, data);
}

Coinify.prototype.POST = function (endpoint, data) {
  return this.request("POST", endpoint, data);
}

Coinify.prototype.PATCH = function (endpoint, data) {
  return this.request("PATCH", endpoint, data);
}

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
    options.body = JSON.stringify(data)
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
    .then(checkStatus)
};


Coinify.reviver = function (k,v){
  if (k === '') return new Coinify(v);
  return v;
}

Coinify.new = function () {
  var object = {
    auto_login: true
  };
  var coinify = new Coinify(object);
  return coinify;
}
