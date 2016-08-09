'use strict';

var WalletStore = require('../wallet-store');
var API = require('../api');
var assert = require('assert');
var Helpers = require('../helpers');
var MyWallet = require('../wallet');
var BankAccount = require('./bank-account');

module.exports = CoinifyTrade;

function CoinifyTrade (obj, coinify) {
  this._coinify = coinify;
  this._id = obj.id;
  this._createdAt = new Date(obj.createTime);
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
  }
});

CoinifyTrade.prototype.set = function (obj) {
  var account;
  this._state = obj.state;
  if (obj.confirmed === Boolean(obj.confirmed)) { // Constructed from metadata JSON
    if (Helpers.isPositiveInteger(obj.account_index)) {
      account = MyWallet.wallet.hdwallet.accounts[obj.account_index];
      this._receiveAddress = account.receiveAddressAtIndex(obj.receive_index);
    }

    this._confirmed = obj.confirmed;
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
    this._bitcoinReceived = null;
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

    // self.removeLabeledAddress.bind(self)();

    // return self._coinify.save();
    return;
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
    // Check if we already got it:
    API.getBalances([self.receiveAddress]).then(function (res) {
      var totalReceived = 0;
      if (res[self.receiveAddress]) {
        totalReceived = res[self.receiveAddress].total_received;
      }
      if (totalReceived > 0) {
        resolve(totalReceived);
      } else {
        // Monitor websocket for receive notification:
        WalletStore.addEventListener(function (event, data) {
          if (event === 'on_tx_received') {
            if (data['out']) {
              for (var i = 0; i < data['out'].length; i++) {
                if (data['out'][i].addr === self.receiveAddress) {
                  resolve(data['out'][i].value);
                }
              }
            }
          }
        });
      }
    });
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

  /* If we want to support buying to another account, we need to store
     the account index and receive address index for each trade in the
     metadata service. */
  var account = MyWallet.wallet.hdwallet.accounts[0];

  var receiveAddressIndex = account.receiveIndex;

  // Respect the GAP limit:
  if (receiveAddressIndex - account.lastUsedReceiveIndex >= 19) {
    return Promise.reject('gap_limit');
  }

  var processTrade = function (res) {
    var trade = new CoinifyTrade(res, coinify);
    account.setLabelForReceivingAddress(receiveAddressIndex, 'Coinify order #' + trade.id);
    trade._account_index = 0; // TODO: use default account
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
      var didCleanup = false;
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
            didCleanup = true;
          }
        }
        trade = undefined;
      }

      if (didCleanup) {
        return coinify.save().then(function () {
          return CoinifyTrade.checkCompletedTrades(coinify);
        });
      } else {
        return CoinifyTrade.checkCompletedTrades(coinify);
      }
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

CoinifyTrade.checkCompletedTrades = function (coinify) {
  var isCompleted = function (trade) {
    return trade.state === 'completed' || trade.state === 'completed_test';
  };
  var getReceiveAddress = function (obj) { return obj.receiveAddress; };
  var completedTrades = coinify._trades.filter(isCompleted);
  var receiveAddresses = completedTrades.map(getReceiveAddress);
  if (receiveAddresses.length === 0) {
    return Promise.resolve(coinify._trades);
  }
  return API.getBalances(receiveAddresses).then(function (res) {
    for (var i = 0; i < completedTrades.length; i++) {
      var trade = completedTrades[i];
      if (res[trade.receiveAddress]) {
        trade._bitcoinReceived = res[trade.receiveAddress].total_received > 0;
      }
    }
    return Promise.resolve(coinify._trades);
  });
};

CoinifyTrade.prototype.toJSON = function () {
  return {
    id: this._id,
    state: this._state,
    tx_hash: this._txHash,
    account_index: this._account_index,
    receive_index: this._receive_index,
    confirmed: this._confirmations >= 3
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
