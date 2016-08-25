'use strict';

var WalletStore = require('../wallet-store');
var API = require('../api');
var assert = require('assert');
var Helpers = require('../helpers');
var MyWallet = require('../wallet');
var TX = require('../wallet-transaction');

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
  var account;
  this._createdAt = new Date(obj.createTime);
  this._state = obj.state;
  this._is_buy = obj.is_buy;
  if (obj.confirmed === Boolean(obj.confirmed)) { // Constructed from metadata JSON
    if (Helpers.isPositiveInteger(obj.account_index)) {
      account = MyWallet.wallet.hdwallet.accounts[obj.account_index];
      this._receiveAddress = account.receiveAddressAtIndex(obj.receive_index);
    }

    this._confirmed = obj.confirmed;
    if (obj.confirmed) {
      this._bitcoinReceived = true;
    }
    this._txHash = obj.tx_hash;
    this._account_index = obj.account_index;
    this._receive_index = obj.receive_index;
  } else { // Contructed from Coinify API
    if (
      Helpers.isPositiveInteger(this._account_index) &&
      Helpers.isPositiveInteger(this._receive_index)
    ) {
      account = MyWallet.wallet.hdwallet.accounts[this._account_index];
      var receiveAddress = account.receiveAddressAtIndex(this._receive_index);
      assert(obj.transferOut.details.account === receiveAddress, 'Unexpected receive address');
    } else {
      this._receiveAddress = obj.transferOut.details.account;
    }
    this._inCurrency = obj.inCurrency;
    this._outCurrency = obj.outCurrency;
    this._inAmount = obj.inAmount;
    this._medium = obj.transferIn.medium;
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

CoinifyTrade.prototype.removeLabeledAddress = function () {
  var account;
  if (this._account_index && Helpers.isPositiveInteger(this._receive_index)) {
    account = MyWallet.wallet.hdwallet.accounts[this._account_index];
    account.removeLabelForReceivingAddress(this._receive_index);
  }
};

CoinifyTrade.prototype.cancel = function () {
  var self = this;

  var processCancel = function (trade) {
    self._state = trade.state;

    self.removeLabeledAddress.bind(self)();

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

CoinifyTrade.buy = function (quote, medium, coinify) {
  assert(quote, 'Quote required');

  var account = MyWallet.wallet.hdwallet.defaultAccount;

  var receiveAddressIndex = account.receiveIndex;

  // Respect the GAP limit:
  if (receiveAddressIndex - account.lastUsedReceiveIndex >= 19) {
    return Promise.reject('gap_limit');
  }

  var processTrade = function (res) {
    var trade = new CoinifyTrade(res, coinify);
    account.setLabelForReceivingAddress(receiveAddressIndex, 'Coinify order #' + trade.id);
    trade._account_index = account.index;
    trade._receive_index = receiveAddressIndex;
    coinify._trades.push(trade);
    return coinify.save();
  };

  return coinify.POST('trades', {
    priceQuoteId: quote.id,
    transferIn: {
      medium: medium
    },
    transferOut: {
      medium: 'blockchain',
      details: {
        account: account.receiveAddressAtIndex(receiveAddressIndex)
      }
    }
  }).then(processTrade);
};

// Fetches the latest trades and updates coinify._trades
CoinifyTrade.fetchAll = function (coinify) {
  var getTrades = function () {
    return coinify.GET('trades').then(function (res) {
      for (var i = 0; i < res.length; i++) {
        var trade;
        for (var k = 0; k < coinify._trades.length; k++) {
          if (coinify._trades[k]._id === res[i].id) {
            trade = coinify._trades[k];
            trade.set(res[i]);
          }
        }
        if (trade === undefined) {
          trade = new CoinifyTrade(res[i], coinify);
          coinify._trades.push(trade);
        }

        // Remove labeled address if trade is cancelled, rejected or expired
        if (Helpers.isPositiveInteger(trade._account_index)) {
          var account = MyWallet.wallet.hdwallet.accounts[trade._account_index];
          if (['rejected', 'cancelled', 'expired'].indexOf(trade.state) > -1) {
            account.removeLabelForReceivingAddress(trade._receive_index);
          }
        }
        trade = undefined;
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
  return API.getHistory([trade.receiveAddress]).then(function (res) {
    if (res.txs && res.txs.length > 0) {
      var tx = new TX(res.txs[0]);
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
  var getReceiveAddress = function (obj) { return obj.receiveAddress; };

  var saveTrade = function () {
    coinify.save.bind(coinify)();
  };

  var tradeWasPaid = function (trade, amount) {
    trade._watchAddressResolve && trade._watchAddressResolve(amount);

    trade.refresh()
      .then(CoinifyTrade._getTransactionHash)
      .then(saveTrade);
  };

  WalletStore.addEventListener(function (event, data) {
    if (event === 'on_tx_received') {
      var trades = coinify._trades
                    .filter(tradeFilter);
      var receiveAddresses = trades.map(getReceiveAddress);
      if (data['out']) {
        for (var i = 0; i < data['out'].length; i++) {
          var index = receiveAddresses.indexOf(data['out'][i].addr);
          if (index > -1) {
            var trade = trades[index];
            trade._bitcoinReceived = true;
            var amount = data['out'][i].value;
            tradeWasPaid(trade, amount);
          }
        }
      }
    }
  });
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
  return {
    id: this._id,
    state: this._state,
    tx_hash: this._txHash,
    account_index: this._account_index,
    receive_index: this._receive_index,
    confirmed: this.confirmed,
    is_buy: this.isBuy
  };
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
