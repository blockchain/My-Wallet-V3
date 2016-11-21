var assert = require('assert');
var Exchange = require('bitcoin-exchange-client');

class API extends Exchange.API {
  constructor () {
    super();
    this._apiKey = null;
    this._partnerId = 'blockchain';
    this._accountToken = null;
  }

  get apiKey () { return this._apiKey; }
  set apiKey (value) { this._apiKey = value; }

  get partnerId () { return this._partnerId; }
  set partnerId (value) { this._partnerId = value; }

  get accountToken () { return this._accountToken; }

  get hasAccount () { return Boolean(this.accountToken); }

  _url (subdomain, version, endpoint) {
    assert(endpoint, 'endpoint required');
    version = version || 'v2';
    subdomain = subdomain || 'api';
    return `https://${subdomain}.staging.sfox.com/${version}/partner/${this._partnerId}/${endpoint}`;
  }

  GET (endpoint, data, version, subdomain) {
    return this._request('GET', endpoint, version, subdomain, data);
  }

  authGET (endpoint, data, version, subdomain) {
    return this._request('GET', endpoint, version, subdomain, data, true);
  }

  POST (endpoint, data, version, subdomain) {
    return this._request('POST', endpoint, version, subdomain, data);
  }

  authPOST (endpoint, data, version, subdomain) {
    return this._request('POST', endpoint, version, subdomain, data, true);
  }

  PATCH (endpoint, data, version, subdomain) {
    return this._request('PATCH', endpoint, version, subdomain, data);
  }

  authPATCH (endpoint, data, version, subdomain) {
    return this._request('PATCH', endpoint, version, subdomain, data, true);
  }

  _request (method, endpoint, version, subdomain, data, authorized) {
    assert(this._apiKey, 'API key required');
    assert(!authorized || this.hasAccount, "Can't make authorized request without an account");

    var url = this._url(subdomain, version, endpoint);

    var headers = {};

    if (subdomain !== 'quotes') {
      headers['X-SFOX-PARTNER-ID'] = this._apiKey;
    }

    if (authorized) {
      headers['Authorization'] = 'Bearer ' + this._accountToken;
    }

    return super._request(method, url, data, headers);
  }
}

module.exports = API;
