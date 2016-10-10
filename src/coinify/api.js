var assert = require('assert');
var ExchangeAPI = require('../exchange/api');

class API extends ExchangeAPI {
  constructor () {
    super();
    this._offlineToken = null;
    this._rootURL = 'https://app-api.coinify.com/';
    this._loginExpiresAt = null;
  }

  get isLoggedIn () {
    // Debug: + 60 * 19 * 1000 expires the login after 1 minute
    var tenSecondsFromNow = new Date(new Date().getTime() + 10000);
    return Boolean(this._access_token) && this._loginExpiresAt > tenSecondsFromNow;
  }
  get offlineToken () { return this._offlineToken; }
  get hasAccount () { return Boolean(this.offlineToken); }

  login () {
    var self = this;

    var promise = new Promise(function (resolve, reject) {
      assert(self._offlineToken, 'Offline token required');

      var loginSuccess = function (res) {
        self._access_token = res.access_token;
        self._loginExpiresAt = new Date(new Date().getTime() + res.expires_in * 1000);
        resolve();
      };

      var loginFailed = function (e) {
        reject(e);
      };
      self.POST('auth', {
        grant_type: 'offline_token',
        offline_token: self._offlineToken
      }).then(loginSuccess).catch(loginFailed);
    });

    return promise;
  }

  _request (method, endpoint, data, authorized) {
    assert(!authorized || this.isLoggedIn, "Can't make authorized request if not logged in");

    var url = this._rootURL + endpoint;

    var headers = {};

    if (authorized) {
      headers['Authorization'] = 'Bearer ' + this._access_token;
    }

    return super._request(method, url, data, headers);
  }

  _authRequest (method, endpoint, data) {
    var doRequest = function () {
      return this._request(method, endpoint, data, true);
    };

    if (this.isLoggedIn) {
      return doRequest.bind(this)();
    } else {
      return this.login().then(doRequest.bind(this));
    }
  }

  GET (endpoint, data) {
    return this._request('GET', endpoint, data);
  }

  authGET (endpoint, data) {
    return this._authRequest('GET', endpoint, data);
  }

  POST (endpoint, data) {
    return this._request('POST', endpoint, data);
  }

  authPOST (endpoint, data) {
    return this._authRequest('POST', endpoint, data);
  }

  PATCH (endpoint, data) {
    return this._request('PATCH', endpoint, data);
  }

  authPATCH (endpoint, data) {
    return this._authRequest('PATCH', endpoint, data);
  }
}

module.exports = API;
