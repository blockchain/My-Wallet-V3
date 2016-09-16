var assert = require('assert');

module.exports = API;

function API () {
  this._offlineToken = null;
  this._rootURL = 'https://app-api.coinify.com/';
  this._loginExpiresAt = null;
}

Object.defineProperties(API.prototype, {
  'isLoggedIn': {
    configurable: false,
    get: function () {
      // Debug: + 60 * 19 * 1000 expires the login after 1 minute
      var tenSecondsFromNow = new Date(new Date().getTime() + 10000);
      return Boolean(this._access_token) && this._loginExpiresAt > tenSecondsFromNow;
    }
  },
  'offlineToken': {
    configurable: false,
    get: function () {
      return this._offlineToken;
    }
  },
  'hasAccount': {
    configurable: false,
    get: function () {
      return Boolean(this.offlineToken);
    }
  }
});

API.prototype.login = function () {
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
};

API.prototype.GET = function (endpoint, data) {
  return this._request('GET', endpoint, data);
};

API.prototype.authGET = function (endpoint, data) {
  var doGET = function () {
    return this._request('GET', endpoint, data, true);
  };

  if (this.isLoggedIn) {
    return doGET.bind(this)();
  } else {
    return this.login().then(doGET.bind(this));
  }
};

API.prototype.POST = function (endpoint, data) {
  return this._request('POST', endpoint, data);
};

API.prototype.authPOST = function (endpoint, data) {
  var doPOST = function () {
    return this._request('POST', endpoint, data, true);
  };

  if (this.isLoggedIn) {
    return doPOST.bind(this)();
  } else {
    return this.login().then(doPOST.bind(this));
  }
};

API.prototype.PATCH = function (endpoint, data) {
  return this._request('PATCH', endpoint, data);
};

API.prototype.authPATCH = function (endpoint, data) {
  var doPATCH = function () {
    return this._request('PATCH', endpoint, data, true);
  };

  if (this.isLoggedIn) {
    return doPATCH.bind(this)();
  } else {
    return this.login().then(doPATCH.bind(this));
  }
};

API.prototype._request = function (method, endpoint, data, authorized) {
  assert(!authorized || this.isLoggedIn, "Can't make authorized request if not logged in");

  var url = this._rootURL + endpoint;

  var options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };

  if (authorized) {
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

  if (data) {
    if (method === 'GET') {
      url += '?' + encodeFormData(data);
    } else {
      options.body = JSON.stringify(data);
    }
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
