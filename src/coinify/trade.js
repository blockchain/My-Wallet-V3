'use strict';

var assert = require('assert');

var BankAccount = require('./bank-account');
var Helpers = require('../exchange/helpers');
var Quote = require('./quote');

var ExchangeTrade = require('../exchange/trade');

var Trade = (function () {
  var $this = function (obj, api, delegate) {
    $this.base.constructor.call(this, api, delegate);

    assert(obj, 'JSON missing');
    this._id = obj.id;
    this.set(obj);
  };

  Helpers.extend(ExchangeTrade, $this, {});

  return $this;
})();

Object.defineProperties(Trade.prototype, {
  'iSignThisID': {
    configurable: false,
    get: function () {
      return this._iSignThisID;
    }
  },
  'quoteExpireTime': {
    configurable: false,
    get: function () {
      return this._quoteExpireTime;
    }
  },
  'bankAccount': {
    configurable: false,
    get: function () {
      return this._bankAccount;
    }
  },
  'updatedAt': {
    configurable: false,
    get: function () {
      return this._updatedAt;
    }
  },
  'receiptUrl': {
    configurable: false,
    get: function () {
      return this._receiptUrl;
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

Trade.prototype.set = function (obj) {
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
  if (this._isDeclined && obj.state === 'awaiting_transfer_in') {
    // Coinify API may lag a bit behind the iSignThis iframe.
    this._state = 'rejected';
  } else {
    this._state = obj.state;
  }
  this._is_buy = obj.is_buy;

  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;

  if (obj.transferIn) {
    this._medium = obj.transferIn.medium;
    this._sendAmount = this._inCurrency === 'BTC'
      ? Helpers.toSatoshi(obj.transferIn.sendAmount)
      : Helpers.toCents(obj.transferIn.sendAmount);
  }

  if (this._inCurrency === 'BTC') {
    this._inAmount = Helpers.toSatoshi(obj.inAmount);
    this._outAmount = Helpers.toCents(obj.outAmount);
    this._outAmountExpected = Helpers.toCents(obj.outAmountExpected);
  } else {
    this._inAmount = Helpers.toCents(obj.inAmount);
    this._outAmount = Helpers.toSatoshi(obj.outAmount);
    this._outAmountExpected = Helpers.toSatoshi(obj.outAmountExpected);
  }

  if (obj.confirmed === Boolean(obj.confirmed)) {
    this._delegate.deserializeExtraFields(obj, this);
    this._receiveAddress = this._delegate.getReceiveAddress(this);
    this._confirmed = obj.confirmed;
    this._txHash = obj.tx_hash;
  } else { // Contructed from Coinify API
    /* istanbul ignore if */
    if (this.debug) {
      // This log only happens if .set() is called after .debug is set.
      console.info('Trade ' + this.id + ' from Coinify API');
    }
    this._createdAt = new Date(obj.createTime);
    this._updatedAt = new Date(obj.updateTime);
    this._quoteExpireTime = new Date(obj.quoteExpireTime);
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

Trade.prototype.cancel = function () {
  var self = this;

  var processCancel = function (trade) {
    self._state = trade.state;

    self._delegate.releaseReceiveAddress(self);

    return self._delegate.save.bind(self._delegate)();
  };

  return self._api.authPATCH('trades/' + self._id + '/cancel').then(processCancel);
};

// Checks the balance for the receive address and monitors the websocket if needed:
// Call this method long before the user completes the purchase:
// trade.watchAddress.then(() => ...);
Trade.prototype.watchAddress = function () {
  /* istanbul ignore if */
  if (this.debug) {
    console.info('Watch ' + this.receiveAddress + ' for ' + this.state + ' trade ' + this.id);
  }
  // Check if this transaction is already marked as paid:
  if (this._txHash) {
    /* istanbul ignore if */
    if (this.debug) {
      console.info("Already paid, resolve immedidately and don't watch.");
    }
    return Promise.resolve();
  }
  var self = this;
  var promise = new Promise(function (resolve, reject) {
    self._watchAddressResolve = resolve;
  });
  return promise;
};

Trade.prototype.btcExpected = function () {
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

    var oneMinuteAgo = new Date(new Date().getTime() - 60 * 1000);
    if (this.quoteExpireTime > new Date()) {
      // Quoted price still valid
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
        return Quote.getQuote(this._api, -this.inAmount, this.inCurrency, this.outCurrency).then(processQuote);
      }
    }
  } else {
    return Promise.reject();
  }
};

// QA tool:
Trade.prototype.fakeBankTransfer = function () {
  var self = this;

  return self._api.authPOST('trades/' + self._id + '/test/bank-transfer', {
    sendAmount: parseFloat((self.inAmount / 100).toFixed(2)),
    currency: self.inCurrency
  }).then(this._delegate.save.bind(this._delegate));
};

// QA tool:
Trade.prototype.expireQuote = function () {
  this._quoteExpireTime = new Date(new Date().getTime() + 3000);
};

Trade.buy = function (quote, medium, api, delegate, debug) {
  assert(quote, 'Quote required');

  /* istanbul ignore if */
  if (debug) {
    console.info('Reserve receive address for new trade');
  }
  var reservation = delegate.reserveReceiveAddress();

  var processTrade = function (res) {
    var trade = new Trade(res, api, delegate);
    trade.debug = debug;

    /* istanbul ignore if */
    if (debug) {
      console.info('Commit receive address for new trade');
    }
    reservation.commit(trade);

    /* istanbul ignore if */
    if (debug) {
      console.info('Monitor trade', trade.receiveAddress);
    }
    trade._monitorAddress.bind(trade)();
    return trade;
  };

  var error = function (e) {
    console.error(e);
    return Promise.reject(e);
  };

  return api.authPOST('trades', {
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
  }).then(processTrade).catch(error);
};

Trade.fetchAll = function (api) {
  return api.authGET('trades');
};

Trade.prototype.self = function () {
  return this;
};

Trade.prototype.process = function () {
  if (['rejected', 'cancelled', 'expired'].indexOf(this.state) > -1) {
    /* istanbul ignore if */
    if (this.debug) {
      console.info('Check if address for ' + this.state + ' trade ' + this.id + ' can be released');
    }
    this._delegate.releaseReceiveAddress(this);
  }
};

Trade.prototype.refresh = function () {
  /* istanbul ignore if */
  if (this.debug) {
    console.info('Refresh ' + this.state + ' trade ' + this.id);
  }
  return this._api.authGET('trades/' + this._id)
          .then(this.set.bind(this))
          .then(this._delegate.save.bind(this._delegate))
          .then(this.self.bind(this));
};

// Call this if the iSignThis iframe says the card is declined. It may take a
// while before Coinify API reflects this change
Trade.prototype.declined = function () {
  this._state = 'rejected';
  this._isDeclined = true;
};

Trade.prototype._monitorAddress = function () {
  var self = this;

  var save = function () {
    return self._delegate.save.bind(self._delegate)();
  };

  self._delegate.monitorAddress(self.receiveAddress, function (hash, amount) {
    var checkAddress = function () {
      return self._setTransactionHash({hash: hash}, amount, self._delegate);
    };
    if (self.state === 'completed' || self.state === 'processing' || self.state === 'completed_test') {
      return checkAddress().then(save);
    } else {
      return self.refresh().then(checkAddress).then(save);
    }
  });
};

Trade._checkOnce = function (trades, delegate) {
  assert(delegate, '_checkOnce needs delegate');

  if (trades.length === 0) {
    return Promise.resolve();
  }

  /* istanbul ignore if */
  if (delegate.debug) {
    console.info('_checkOnce', trades.map(function (trade) { return trade.id; }).join(', '));
  }

  // DO NOT DO THIS: // for (var i = 0; i < trades.length; i++) {
  var promises = trades.map(function (trade) {
    return delegate.checkAddress(trade.receiveAddress).then(function (tx, amount) {
      if (!tx) return;

      /* istanbul ignore if */
      if (delegate.debug) {
        console.info('checkAddress', trade.receiveAddress, 'found transaction');
      }

      var setTransactionHash = function () {
        return trade._setTransactionHash(tx, amount, delegate);
      };

      if (trade.state === 'completed' || trade.state === 'processing' || trade.state === 'completed_test') {
        return setTransactionHash();
      } else {
        return trade.refresh().then(setTransactionHash);
      }
    });
  });

  return Promise.all(promises).then(delegate.save.bind(delegate));
};

//
Trade.prototype._setTransactionHash = function (tx, amount, delegate) {
  var self = this;
  var setConfirmations = function (tx) {
    self._confirmations = tx.confirmations;
    // TODO: refactor
    if (self.confirmed) {
      self._confirmed = true;
    }
  };

  /* istanbul ignore if */
  if (self.debug) {
    console.info('Transaction ' + tx.hash + ' detected, considering ' + self.state + ' trade ' + self.id);
  }
  if (self.state === 'completed_test') {
    if (!self.confirmations && !self._txHash) {
      // For test trades, there is no real transaction, so trade._txHash is not
      // set. Instead use the hash for the incoming transaction. This will not
      // work correctly with address reuse.
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Test trade, not matched before, unconfirmed transaction, assuming match');
      }
      self._txHash = tx.hash;
      setConfirmations(tx);
      self._watchAddressResolve && self._watchAddressResolve();
    } else {
      if (self.debug) {
        console.info('Trade already matched, not calling _watchAddressResolve()');
      }
      if (self._txHash === tx.hash) {
        /* istanbul ignore if */
        setConfirmations(tx);
      }
    }
  } else if (self.state === 'completed' || self.state === 'processing') {
    if (self._txHash) {
      // Multiple trades may reuse the same address if e.g. one is
      // cancelled of if we reach the gap limit.
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Trade already matched, not calling _watchAddressResolve()');
      }
      if (self._txHash === tx.hash) {
        setConfirmations(tx);
      } else {
        // Different trade, ignore
      }
    } else {
      // transferOut.details.transaction is not implemented and might be
      // missing if in the processing state.
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Trade not matched yet, assuming match');
      }
      self._txHash = tx.hash;
      setConfirmations(tx);
    }
    self._watchAddressResolve && self._watchAddressResolve();
  } else {
    /* istanbul ignore if */
    if (self.debug) {
      console.info('Not calling _watchAddressResolve()');
    }
  }
};

Trade._monitorWebSockets = function (trades) {
  for (var i = 0; i < trades.length; i++) {
    var trade = trades[i];
    trade._monitorAddress.bind(trade)();
  }
};

// Monitor the receive addresses for pending and completed trades.
Trade.monitorPayments = function (trades, delegate) {
  /* istanbul ignore if */
  if (delegate.debug) {
    console.info('monitorPayments');
  }

  assert(delegate, '_monitorPayments needs delegate');

  var tradeFilter = function (trade) {
    return [
      'awaiting_transfer_in',
      'reviewing',
      'processing',
      'completed',
      'completed_test'
    ].indexOf(trade.state) > -1 && !trade.confirmed;
  };

  var filteredTrades = trades.filter(tradeFilter);

  Trade._checkOnce(filteredTrades, delegate).then(function () {
    Trade._monitorWebSockets(filteredTrades);
  });
};

Trade.prototype.toJSON = function () {
  var serialized = {
    id: this._id,
    state: this._state,
    tx_hash: this._txHash,
    confirmed: this.confirmed,
    is_buy: this.isBuy
  };

  this._delegate.serializeExtraFields(serialized, this);

  return serialized;
};

Trade.filteredTrades = function (trades) {
  return trades.filter(function (trade) {
    // Only consider transactions that are complete or that we're still
    // expecting payment for:
    return [
      'awaiting_transfer_in',
      'processing',
      'reviewing',
      'completed',
      'completed_test'
    ].indexOf(trade.state) > -1;
  });
};

module.exports = Trade;
