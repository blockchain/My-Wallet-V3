'use strict';

var Coinify = require('./coinify/coinify');
var Metadata = require('./metadata');
var assert = require('assert');
var ExchangeDelegate = require('./exchange-delegate');

var METADATA_TYPE_EXTERNAL = 3;

module.exports = External;

function External (wallet) {
  this._metadata = new Metadata(METADATA_TYPE_EXTERNAL);
  this._coinify = undefined;
  this._wallet = wallet;
}

Object.defineProperties(External.prototype, {
  'coinify': {
    configurable: false,
    get: function () { return this._coinify; }
  }
});

External.prototype.toJSON = function () {
  var external = {
    coinify: this._coinify
  };
  return external;
};

External.prototype.fetch = function () {
  var Populate = function (object) {
    this.loaded = true;
    if (object !== null) {
      if (object.coinify) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._coinify = new Coinify(object.coinify, delegate);
        delegate.trades = this._coinify.trades;
      }
    }
    return this;
  };
  var fetchFailed = function (e) {
    // Metadata service is down or unreachable.
    this.loaded = false;
    return Promise.reject(e);
  };
  return this._metadata.fetch().then(Populate.bind(this)).catch(fetchFailed.bind(this));
};

External.prototype.save = function () {
  if (!this._metadata.existsOnServer) {
    return this._metadata.create(this);
  } else {
    return this._metadata.update(this);
  }
};

External.prototype.wipe = function () {
  this._metadata.update({}).then(this.fetch.bind(this));
  this._coinify = undefined;
};

External.prototype.addCoinify = function () {
  assert(!this._coinify, 'Already added');

  var delegate = new ExchangeDelegate(this._wallet);
  this._coinify = Coinify.new(delegate);
  delegate.trades = this._coinify.trades;
};
