'use strict';

var assert = require('assert');

var BankAccount = require('./bank-account');

module.exports = CoinifyTrade;

function CoinifyTrade (obj, coinify) {
  this._coinify = coinify;
  this._id = obj.id;
  this.set(obj);
}

Object.defineProperties(CoinifyTrade.prototype, {
  'id': {
    configurable: false,
    get: function () {
      return this._id;
    }
  },
  'iSignThisID': {
    configurable: false,
    get: function () {
      return this._iSignThisID;
    }
  },
  'bankAccount': {
    configurable: false,
    get: function () {
      return this._bankAccount;
    }
  },
  'createdAt': {
    configurable: false,
    get: function () {
      return this._createdAt;
    }
  },
  'inCurrency': {
    configurable: false,
    get: function () {
      return this._inCurrency;
    }
  },
  'outCurrency': {
    configurable: false,
    get: function () {
      return this._outCurrency;
    }
  },
  'inAmount': {
    configurable: false,
    get: function () {
      return this._inAmount;
    }
  },
  'medium': {
    configurable: false,
    get: function () {
      return this._medium;
    }
  },
  'state': {
    configurable: false,
    get: function () {
      return this._state;
    }
  },
  'sendAmount': {
    configurable: false,
    get: function () {
      return this._sendAmount;
    }
  },
  'outAmount': {
    configurable: false,
    get: function () {
      return this._outAmount;
    }
  },
  'outAmountExpected': {
    configurable: false,
    get: function () {
      return this._outAmountExpected;
    }
  },
  'receiptUrl': {
    configurable: false,
    get: function () {
      return this._receiptUrl;
    }
  },
  'receiveAddress': {
    configurable: false,
    get: function () {
      return this._receiveAddress;
    }
  },
  'accountIndex': {
    configurable: false,
    get: function () {
      return this._account_index;
    }
  },
  'bitcoinReceived': {
    configurable: false,
    get: function () {
      return Boolean(this._txHash);
    }
  },
  'confirmed': {
    configurable: false,
    get: function () {
      return this._confirmed || this._confirmations >= 3;
    }
  },
  'isBuy': {
    configurable: false,
    get: function () {
      if (Boolean(this._is_buy) === this._is_buy) {
        return this._is_buy;
      } else if (this._is_buy === undefined && this.outCurrency === undefined) {
        return true; // For older test wallets, can be safely removed later.
      } else {
        return this.outCurrency === 'BTC';
      }
    }
  },
  'txHash': {
    configurable: false,
    get: function () { return this._txHash || null; }
  }
});

function toCents (fiat) {
  return Math.round((parseFloat(fiat) || 0) * 100);
}

function toSatoshi (fiat) {
  return Math.round((parseFloat(fiat) || 0) * 100000000);
}

function fromCents (cents) {
  return parseFloat((cents / 100).toFixed(2));
}

function fromSatoshi (cents) {
  return parseFloat((cents / 100000000).toFixed(2));
}

CoinifyTrade.prototype.set = function (obj) {
  this._createdAt = new Date(obj.createTime);
  if ([
    'awaiting_transfer_in',
    'processing',
    'reviewing',
    'completed',
    'completed_test',
    'cancelled',
    'rejected',
    'expired'
  ].indexOf(obj.state) === -1) {
    console.warn('Unknown state:', obj.state);
  }
  this._state = obj.state;
  this._is_buy = obj.is_buy;

  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;
  this._medium = obj.transferIn.medium;

  if (this._inCurrency === 'BTC') {
    this._inAmount = toSatoshi(obj.inAmount);
    this._sendAmount = toSatoshi(obj.transferIn.sendAmount);
    this._outAmount = toCents(obj.outAmount);
    this._outAmountExpected = toCents(obj.outAmountExpected);
  } else {
    this._inAmount = toCents(obj.inAmount);
    this._sendAmount = toCents(obj.transferIn.sendAmount);
    this._outAmount = toSatoshi(obj.outAmount);
    this._outAmountExpected = toSatoshi(obj.outAmountExpected);
  }

  if (obj.confirmed === Boolean(obj.confirmed)) {
    this._coinify.delegate.deserializeExtraFields(obj, this);
    this._receiveAddress = this._coinify.delegate.getReceiveAddress(this);
    this._confirmed = obj.confirmed;
    this._txHash = obj.tx_hash;
  } else { // Contructed from Coinify API
    this._receiptUrl = obj.receiptUrl;

    if (this._inCurrency !== 'BTC') {
      // NOTE: this field is currently missing in the Coinify API:
      if (obj.transferOut && obj.transferOutdetails && obj.transferOutdetails.transaction) {
        this._txHash = obj.transferOutdetails.transaction;
      }

      if (this._medium === 'bank') {
        this._bankAccount = new BankAccount(obj.transferIn.details);
      }

      this._receiveAddress = obj.transferOut.details.account;
      this._iSignThisID = obj.transferIn.details.paymentId;
    }
  }

  return this;
};

CoinifyTrade.prototype.cancel = function () {
  var self = this;

  var processCancel = function (trade) {
    self._state = trade.state;

    self._coinify.delegate.releaseReceiveAddress(self, CoinifyTrade.filteredTrades(self._coinify.trades));

    return self._coinify.save();
  };

  return self._coinify.authPATCH('trades/' + self._id + '/cancel').then(processCancel);
};

// Checks the balance for the receive address and monitors the websocket if needed:
// Call this method long before the user completes the purchase:
// trade.watchAddress.then(() => ...);
CoinifyTrade.prototype.watchAddress = function () {
  var self = this;
  var promise = new Promise(function (resolve, reject) {
    self._watchAddressResolve = resolve;
  });
  return promise;
};

CoinifyTrade.prototype.btcExpected = function () {
  var self = this;
  if (this.isBuy) {
    if ([
      'completed',
      'completed_test',
      'cancelled',
      'rejected'
    ].indexOf(this.state) > -1) {
      return Promise.resolve(this.outAmountExpected);
    }

    var fifteenMinutesAgo = new Date(new Date().getTime() - 15 * 60 * 1000);
    var oneMinuteAgo = new Date(new Date().getTime() - 15 * 60 * 1000);
    if (this.createdAt > fifteenMinutesAgo) {
      // Quoted price still valid
      // Note: trade creation date + 15 mins != quote expiration date
      // TODO: Coinify adds quote expiration to trade object
      return Promise.resolve(this.outAmountExpected);
    } else {
      // Estimate BTC expected based on current exchange rate:
      if (this._lastBtcExpectedGuessAt > oneMinuteAgo) {
        return Promise.resolve(this._lastBtcExpectedGuess);
      } else {
        var processQuote = function (quote) {
          self._lastBtcExpectedGuess = quote.quoteAmount;
          self._lastBtcExpectedGuessAt = new Date();
          return self._lastBtcExpectedGuess;
        };
        return this._coinify.getBuyQuote(this.inAmount, this.inCurrency).then(processQuote);
      }
    }
  } else {
    return Promise.reject();
  }
};

// QA tool:
CoinifyTrade.prototype.fakeBankTransfer = function () {
  var self = this;

  return self._coinify.authPOST('trades/' + self._id + '/test/bank-transfer', {
    sendAmount: parseFloat((self.inAmount / 100).toFixed(2)),
    currency: self.inCurrency
  });
};

// QA tool:
CoinifyTrade.prototype.expireQuote = function () {
  if (this.inAmount !== -this._coinify._lastQuote.baseAmount) {
    console.log("Can't find corresponding quote.");
  } else {
    this._coinify._lastQuote.expire();
  }
};

CoinifyTrade.buy = function (quote, medium, coinify) {
  assert(quote, 'Quote required');

  var reservation = coinify.delegate.reserveReceiveAddress(CoinifyTrade.filteredTrades(coinify.trades));

  var processTrade = function (res) {
    var trade = new CoinifyTrade(res, coinify);
    reservation.commit(trade);
    coinify._trades.push(trade);
    trade._monitorAddress.bind(trade)();
    return coinify.save().then(function () { return trade; });
  };

  return coinify.authPOST('trades', {
    priceQuoteId: quote.id,
    transferIn: {
      medium: medium
    },
    transferOut: {
      medium: 'blockchain',
      details: {
        account: reservation.receiveAddress
      }
    }
  }).then(processTrade);
};

// Fetches the latest trades and updates coinify._trades
CoinifyTrade.fetchAll = function (coinify) {
  return coinify.authGET('trades').then(function (res) {
    var trade;
    for (var i = 0; i < res.length; i++) {
      trade = undefined;
      for (var k = 0; k < coinify._trades.length; k++) {
        if (coinify._trades[k]._id === res[i].id) {
          trade = coinify._trades[k];
          trade.set.bind(trade)(res[i]);
        }
      }
      if (trade === undefined) {
        trade = new CoinifyTrade(res[i], coinify);
        coinify._trades.push(trade);
      }

      if (['rejected', 'cancelled', 'expired'].indexOf(trade.state) > -1) {
        coinify.delegate.releaseReceiveAddress(trade, CoinifyTrade.filteredTrades(coinify.trades));
      }
    }

    return coinify.save().then(function () { return coinify._trades; });
  });
};

CoinifyTrade.prototype.refresh = function () {
  return this._coinify.authGET('trades/' + this._id).then(this.set.bind(this));
};

CoinifyTrade.prototype._monitorAddress = function () {
  var self = this;

  var tradeWasPaid = function (amount) {
    var resolve = function () {
      self._watchAddressResolve && self._watchAddressResolve(amount);
    };
    self._coinify.save.bind(self._coinify)().then(resolve);
  };

  self._coinify.delegate.monitorAddress(self.receiveAddress, function (hash, amount) {
    var updateTrade = function () {
      if (self.state === 'completed_test' && !self.confirmations) {
        // For test trades, there is no real transaction, so trade._txHash is not
        // set. Instead use the hash for the incoming transaction. This will not
        // work correctly with address reuse.
        self._txHash = hash;
        tradeWasPaid(amount);
      } else if (self.state === 'completed' || self.state === 'processing') {
        if (self._txHash) {
          // Multiple trades may reuse the same address if e.g. one is
          // cancelled of if we reach the gap limit.
          if (self._txHash !== hash) return;
        } else {
          // transferOut.details.transaction is not implemented and might be
          // missing if in the processing state.
          self._txHash = hash;
        }
        tradeWasPaid(amount);
      }
    };

    if (self.state === 'completed' || self.state === 'processing' || self.state === 'completed_test') {
      updateTrade();
    } else {
      self.refresh().then(updateTrade);
    }
  });
};

CoinifyTrade._checkOnce = function (coinify, tradeFilter) {
  var getReceiveAddress = function (obj) { return obj.receiveAddress; };

  var trades = coinify._trades.filter(tradeFilter);

  var receiveAddresses = trades.map(getReceiveAddress);

  if (receiveAddresses.length === 0) {
    return Promise.resolve();
  }

  var promises = [];

  for (var i = 0; i < trades.length; i++) {
    promises.push(CoinifyTrade._getTransactionHash(trades[i]));
  }

  var save = function () {
    coinify.save.bind(coinify)();
  };

  return Promise.all(promises).then(save);
};

CoinifyTrade._getTransactionHash = function (trade) {
  return trade._coinify.delegate.checkAddress(trade.receiveAddress)
    .then(function (tx) {
      if (tx) {
        if (trade.state === 'completed_test' && !trade._txHash) {
          // See remarks below
          trade._txHash = tx.hash;
        } else if (trade.state === 'processing' || trade.state === 'completed') {
          if (trade._txHash) {
            if (trade._txHash !== tx.hash) return;
          } else {
            trade._txHash = tx.hash;
          }
        } else {
          return;
        }
        trade._confirmations = tx.confirmations;
        if (trade.confirmed) {
          trade._confirmed = true;
        }
      }
    });
};

CoinifyTrade._monitorWebSockets = function (coinify, tradeFilter) {
  var trades = coinify._trades
                .filter(tradeFilter);

  for (var i = 0; i < trades.length; i++) {
    var trade = trades[i];
    trade._monitorAddress.bind(trade)();
  }
};

// Monitor the receive addresses for pending and completed trades.
CoinifyTrade.monitorPayments = function (coinify) {
  var tradeFilter = function (trade) {
    return [
      'awaiting_transfer_in',
      'reviewing',
      'processing',
      'completed',
      'completed_test'
    ].indexOf(trade.state) > -1 && !trade.confirmed;
  };

  CoinifyTrade._checkOnce(coinify, tradeFilter).then(function () {
    CoinifyTrade._monitorWebSockets(coinify, tradeFilter);
  });
};

CoinifyTrade.prototype.toJSON = function () {
  var serialized = {
    id: this._id,
    state: this._state,
    tx_hash: this._txHash,
    confirmed: this.confirmed,
    is_buy: this.isBuy,
    createTime: this._createdAt,
    inCurrency: this._inCurrency,
    outCurrency: this._outCurrency,
    transferIn: {}
  };

  if (this._inCurrency === 'BTC') {
    serialized.inAmount = fromSatoshi(this._inAmount);
    serialized.transferIn.sendAmount = fromSatoshi(this._sendAmount);
    serialized.outAmount = fromCents(this._outAmount);
    serialized.outAmountExpected = fromCents(this._outAmountExpected);
  } else {
    serialized.inAmount = fromCents(this._inAmount);
    serialized.transferIn.sendAmount = fromCents(this._sendAmount);
    serialized.outAmount = fromSatoshi(this._outAmount);
    serialized.outAmountExpected = fromSatoshi(this._outAmountExpected);
  }

  this._coinify.delegate.serializeExtraFields(serialized, this);

  return serialized;
};

CoinifyTrade.filteredTrades = function (trades) {
  return trades.filter(function (trade) {
    // Only consider transactions that are complete or that we're still
    // expecting payment for:
    return [
      'awaiting_transfer_in',
      'processing',
      'reviewing',
      'completed',
      'completed_test'
    ].indexOf(trade._state) > -1;
  });
};
