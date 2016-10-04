var assert = require('assert');

module.exports = API;

function API () {
  // TODO
  // * SFOX uses several subdomains, e.g. quote.sfox.com
  // * parter/blockchain should be a seperate param probably
  this._rootURL = 'https://api.staging.sfox.com/v2/partner/blockchain/';
  this._apiKey = '6CD61A0E965D48A7B1883A860490DC9E';
  this._accountToken = null;
}

Object.defineProperties(API.prototype, {
  'apiKey': {
    configurable: false,
    get: function () {
      return this._apiKey;
    },
    set: function (value) {
      this._apiKey = value;
    }
  },
  'accountToken': {
    configurable: false,
    get: function () {
      return this._accountToken;
    }
  },
  'hasAccount': {
    configurable: false,
    get: function () {
      return Boolean(this.accountToken);
    }
  }
});

API.prototype.GET = function (endpoint, data) {
  return this._request('GET', endpoint, data);
};

API.prototype.authGET = function (endpoint, data) {
  return this._request('GET', endpoint, data, true);
};

API.prototype.POST = function (endpoint, data) {
  return this._request('POST', endpoint, data);
};

API.prototype.authPOST = function (endpoint, data) {
  return this._request('POST', endpoint, data, true);
};

API.prototype.PATCH = function (endpoint, data) {
  return this._request('PATCH', endpoint, data);
};

API.prototype.authPATCH = function (endpoint, data) {
  return this._request('PATCH', endpoint, data, true);
};

API.prototype._request = function (method, endpoint, data, authorized) {
  assert(this._apiKey, 'API key required');
  assert(!authorized || this.hasAccount, "Can't make authorized request without an account");

  var url = this._rootURL + endpoint;

  var options = {
    headers: {
      'Content-Type': 'application/json',
      'X-SFOX-PARTNER-ID': this._apiKey
    },
    credentials: 'omit'
  };

  if (authorized) {
    options.headers['Authorization'] = 'Bearer ' + this._accountToken;
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
