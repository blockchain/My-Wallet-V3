'use strict';

module.exports = Quote;

function Quote (obj) {
  var expiresAt = new Date(obj.expiryTime);

  // Debug, make quote expire in 15 seconds:
  // expiresAt = new Date(new Date().getTime() + 15 * 1000);

  this._id = obj.id;
  this._baseCurrency = obj.baseCurrency;
  this._quoteCurrency = obj.quoteCurrency;
  this._baseAmount = obj.baseAmount;
  this._quoteAmount = obj.quoteAmount;
  this._expiresAt = expiresAt;
}

Object.defineProperties(Quote.prototype, {
  'id': {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'baseCurrency': {
    configurable: false,
    get: function () {
      return this._baseCurrency;
    }
  },
  'quoteCurrency': {
    configurable: false,
    get: function () {
      return this._quoteCurrency;
    }
  },
  'baseAmount': {
    configurable: false,
    get: function () {
      return this._baseAmount;
    }
  },
  'quoteAmount': {
    configurable: false,
    get: function () {
      return this._quoteAmount;
    }
  },
  'expiresAt': {
    configurable: false,
    get: function () {
      return this._expiresAt;
    }
  }
});

Quote.getQuote = function (coinify, amount, baseCurrency) {
  var processQuote = function (quote) {
    quote = new Quote(quote);
    return quote;
  };

  var getQuote = function (profile) {
    baseCurrency = baseCurrency || profile.defaultCurrency;
    var quoteCurrency = baseCurrency === 'BTC' ? profile.defaultCurrency : 'BTC';

    return coinify.POST('trades/quote', {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      baseAmount: amount
    });
  };

  if (coinify._offline_token == null) {
    return getQuote();
  }
  if (coinify.profile === null) {
    return coinify.fetchProfile().then(getQuote).then(processQuote);
  } else {
    if (!coinify.isLoggedIn) {
      return coinify.login().then(function () { return getQuote(coinify.profile); }).then(processQuote);
    } else {
      return getQuote(coinify.profile).then(processQuote);
    }
  }
};

// QA tool
Quote.prototype.expire = function () {
  this._expiresAt = new Date(new Date().getTime() + 3 * 1000);
};
