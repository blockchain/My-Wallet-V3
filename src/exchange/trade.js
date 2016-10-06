'use strict';

var assert = require('assert');

class Trade {
  constructor (api, delegate) {
    assert(api, 'API missing');
    assert(delegate, 'delegate missing');
    assert(typeof delegate.getReceiveAddress === 'function', 'delegate requires getReceiveAddress()');
    this._delegate = delegate;
    this._api = api;
  }

  get debug () { return this._debug; }
  set debug (value) {
    this._debug = Boolean(value);
  }

  get id () { return this._id; }

  get createdAt () { return this._createdAt; }

  get inCurrency () { return this._inCurrency; }

  get outCurrency () { return this._outCurrency; }

  get inAmount () { return this._inAmount; }

  get medium () { return this._medium; }

  get state () { return this._state; }

  get sendAmount () { return this._sendAmount; }

  get outAmount () { return this._outAmount; }

  get outAmountExpected () { return this._outAmountExpected; }

  get receiveAddress () { return this._receiveAddress; }

  get accountIndex () { return this._account_index; }

  get bitcoinReceived () { return Boolean(this._txHash); }

  get confirmed () {
    return this._confirmed || this._confirmations >= 3;
  }

  get txHash () { return this._txHash || null; }

  self () {
    return this;
  }

  process () {
    if (['rejected', 'cancelled', 'expired', 'failed'].indexOf(this.state) > -1) {
      /* istanbul ignore if */
      if (this.debug) {
        console.info('Check if address for ' + this.state + ' trade ' + this.id + ' can be released');
      }
      this._delegate.releaseReceiveAddress(this);
    }
  }

  // Checks the balance for the receive address and monitors the websocket if needed:
  // Call this method long before the user completes the purchase:
  // trade.watchAddress.then(() => ...);
  watchAddress () {
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
  }

  _monitorAddress () {
    var save = () => this._delegate.save.bind(this._delegate)();

    let self = this;

    this._delegate.monitorAddress(this.receiveAddress, function (hash, amount) {
      var checkAddress = () => self._setTransactionHash({hash: hash}, amount, self._delegate);
      if (self.state === 'completed' || self.state === 'processing' || self.state === 'completed_test') {
        return checkAddress().then(save);
      } else {
        return self.refresh().then(checkAddress).then(save);
      }
    });
  }

  static _checkOnce (trades, delegate) {
    assert(delegate, '_checkOnce needs delegate');

    if (trades.length === 0) {
      return Promise.resolve();
    }

    /* istanbul ignore if */
    if (delegate.debug) {
      console.info('_checkOnce', trades.map(function (trade) { return trade.id; }).join(', '));
    }

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
  }

  refresh () {
    // Subclass needs to implement this
  }

  //
  _setTransactionHash (tx, amount, delegate) {
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
  }

  static _monitorWebSockets (trades) {
    for (var i = 0; i < trades.length; i++) {
      var trade = trades[i];
      trade._monitorAddress.bind(trade)();
    }
  }

  // Monitor the receive addresses for pending and completed trades.
  static monitorPayments (trades, delegate) {
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
  }

  static filteredTrades (trades) {
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
  }
}

module.exports = Trade;
