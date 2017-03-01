'use strict';

var Coinify = require('bitcoin-coinify-client');
var SFOX = require('bitcoin-sfox-client');
var Metadata = require('./metadata');
var ExchangeDelegate = require('./exchange-delegate');

var METADATA_TYPE_EXTERNAL = 3;

module.exports = External;

function External (wallet) {
  var masterhdnode = wallet.hdwallet.getMasterHDNode();
  this._metadata = Metadata.fromMasterHDNode(masterhdnode, METADATA_TYPE_EXTERNAL);
  this._coinify = undefined;
  this._sfox = undefined;
  this._wallet = wallet;
}

Object.defineProperties(External.prototype, {
  'coinify': {
    configurable: false,
    get: function () {
      if (!this._coinify) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._coinify = Coinify.new(delegate);
        delegate.trades = this._coinify.trades;
      }
      return this._coinify;
    }
  },
  'sfox': {
    configurable: false,
    get: function () {
      if (!this._sfox) {
        var delegate = new ExchangeDelegate(this._wallet);
        this._sfox = SFOX.new(delegate);
        delegate.trades = this._sfox.trades;
      }
      return this._sfox;
    }
  },
  'hasExchangeAccount': {
    configurable: false,
    get: function () {
      return (this._coinify && this._coinify.hasAccount) ||
             (this._sfox && this._sfox.hasAccount);
    }
  }
});

External.prototype.canBuy = function (accountInfo, options) {
  if (!accountInfo || !options) return false;

  let whitelist = options.showBuySellTab || [];
  let countryCodeGuess = accountInfo.countryCodeGuess;

  let isCoinifyCountry = options.partners.coinify.countries.indexOf(countryCodeGuess) > -1;
  let isCountryWhitelisted = whitelist.indexOf(countryCodeGuess) > -1;
  let isUserInvited = accountInfo.invited && accountInfo.invited.sfox;

  return (
    this.hasExchangeAccount ||
    isCoinifyCountry ||
    (isUserInvited && isCountryWhitelisted)
  );
};

External.prototype.toJSON = function () {
  var external = {
    coinify: this._coinify,
    sfox: this._sfox
  };
  return external;
};

External.prototype.fetch = function () {
  var fetchFailed = function (e) {
    // Metadata service is down or unreachable.
    this.loaded = false;
    return Promise.reject(e);
  };
  return this._metadata.fetch().then(this.fromJSON.bind(this)).catch(fetchFailed.bind(this));
};

External.prototype.fromJSON = function (object) {
  this.loaded = true;
  if (object !== null) {
    if (object.coinify) {
      var coinifyDelegate = new ExchangeDelegate(this._wallet);
      this._coinify = new Coinify(object.coinify, coinifyDelegate);
      coinifyDelegate.trades = this._coinify.trades;
    }
    if (object.sfox) {
      var sfoxDelegate = new ExchangeDelegate(this._wallet);
      this._sfox = new SFOX(object.sfox, sfoxDelegate);
      sfoxDelegate.trades = this._sfox.trades;
    }
  }
  return this;
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
  this._sfox = undefined;
};
