'use strict';

var WalletStore = require('../wallet-store');
var API = require('../api');
var assert = require('assert');
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
  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;
  this._inAmount = obj.inAmount;
  this._medium = obj.transferIn.medium;
  if (this._medium === 'bank') {
    this._bankAccount = new BankAccount(obj.transferIn.details);
  }
  this._outAmountExpected = obj.outAmountExpected;
  this._receiveAddress = obj.transferOut.details.account;
  this._state = obj.state;
  this._iSignThisID = obj.transferIn.details.paymentId;
  this._receiptUrl = obj.receiptUrl;
  this._bitcoinReceived = null;
  return this;
};

CoinifyTrade.prototype.removeLabeledAddress = function () {
  var account = MyWallet.wallet.hdwallet.accounts[0];

  var index = account.indexOfreceiveAddress(this.receiveAddress);

  if (index) {
    account.removeLabelForReceivingAddress(index);
  }
};

CoinifyTrade.prototype.cancel = function () {
  var self = this;

  var processCancel = function (trade) {
    self._state = trade.state;

    self.removeLabeledAddress.bind(self)();

    return Promise.resolve();
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
        WalletStore.addEventListener((event, data) => {
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
    coinify._trades.push(trade);
    return trade;
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
      coinify._trades.length = 0; // empty array without losing reference
      for (var i = 0; i < res.length; i++) {
        var trade = new CoinifyTrade(res[i], coinify);
        coinify._trades.push(trade);

        // Remove labeled address if trade is cancelled, rejected or expired
        // This is not 100% accurate, because that would require either
        // generating all labeled addresses (slow) or storing the receive index
        // of each pending trade on the metadata server (we may do this later).
        var account = MyWallet.wallet.hdwallet.accounts[0];
        var labels = account.receivingAddressesLabels;
        if (['rejected', 'cancelled', 'expired'].indexOf(trade.state) > -1) {
          for (var j = 0; j < labels.length; j++) {
            if (labels[j].label === 'Coinify order #' + trade.id) {
              account.removeLabelForReceivingAddress(labels[j].index);
            }
          }
        }
      }

      return CoinifyTrade.checkCompletedTrades(coinify);
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
