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
      return this._bitcoinReceived;
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
  }
});

CoinifyTrade.prototype.set = function (obj) {
  this._createdAt = new Date(obj.createTime);
  this._state = obj.state;
  this._is_buy = obj.is_buy;
  if (obj.confirmed === Boolean(obj.confirmed)) {
    this._coinify.delegate.deserializeExtraFields(obj, this);
    this._receiveAddress = this._coinify.delegate.getReceiveAddress(this);

    this._confirmed = obj.confirmed;
    if (obj.confirmed) {
      this._bitcoinReceived = true;
    }
    this._txHash = obj.tx_hash;
  } else { // Contructed from Coinify API
    this._inCurrency = obj.inCurrency;
    this._outCurrency = obj.outCurrency;
    this._inAmount = obj.inAmount;
    this._medium = obj.transferIn.medium;
    this._sendAmount = obj.transferIn.sendAmount;
    if (this._medium === 'bank') {
      this._bankAccount = new BankAccount(obj.transferIn.details);
    }
    this._outAmountExpected = obj.outAmountExpected;
    this._receiveAddress = obj.transferOut.details.account;
    this._iSignThisID = obj.transferIn.details.paymentId;
    this._receiptUrl = obj.receiptUrl;
    if (!this.bitcoinReceived) {
      this._bitcoinReceived = null;
    }
    return this;
  }
};

CoinifyTrade.prototype.cancel = function () {
  var self = this;

  var processCancel = function (trade) {
    self._state = trade.state;

    self._coinify.delegate.releaseReceiveAddress(self, CoinifyTrade.filteredTrades(self._coinify.trades));

    return self._coinify.save();
  };

  var cancelOrder = function () {
    return self._coinify.PATCH('trades/' + self._id + '/cancel').then(processCancel);
  };

  if (this._coinify.isLoggedIn) {
    return cancelOrder();
  } else {
    return this._coinify.login().then(cancelOrder);
  }
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

  var fakeBankTransfer = function () {
    return self._coinify.POST('trades/' + self._id + '/test/bank-transfer', {
      sendAmount: self.inAmount,
      currency: self.inCurrency
    });
  };

  if (this._coinify.isLoggedIn) {
    return fakeBankTransfer();
  } else {
    return this._coinify.login().then(fakeBankTransfer);
  }
};

// QA tool:
CoinifyTrade.prototype.expireQuote = function () {
  if (this.inAmount !== -this._coinify._lastQuote.baseAmount) {
    console.log("Can't find corresponding quote.");
  } else {
    this._coinify._lastQuote.expiresAt = new Date();
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

  return coinify.POST('trades', {
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
  var getTrades = function () {
    return coinify.GET('trades').then(function (res) {
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

  if (coinify.isLoggedIn) {
    return getTrades();
  } else {
    return coinify.login().then(getTrades);
  }
};

CoinifyTrade.prototype.refresh = function () {
  var updateTrade = function () {
    return this._coinify.GET('trades/' + this._id).then(this.set.bind(this));
  };
  if (this._coinify.isLoggedIn) {
    return updateTrade.bind(this)();
  } else {
    return this._coinify.login().then(updateTrade.bind(this));
  }
};

CoinifyTrade.prototype._monitorAddress = function () {
  var self = this;

  var saveTrade = function () {
    self._coinify.save.bind(self._coinify)();
  };

  var tradeWasPaid = function (amount) {
    self._watchAddressResolve && self._watchAddressResolve(amount);

    self.refresh()
      .then(CoinifyTrade._getTransactionHash)
      .then(saveTrade);
  };

  self._coinify.delegate.monitorAddress(self.receiveAddress, function (amount) {
    self._bitcoinReceived = true;
    tradeWasPaid(amount);
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
             trade._txHash = tx.hash;
             trade._confirmations = tx.confirmations;
             trade._bitcoinReceived = true;
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
    is_buy: this.isBuy
  };

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
