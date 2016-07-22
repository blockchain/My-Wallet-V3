'use strict';

var WalletStore = require('../wallet-store');
var API = require('../api');
var assert = require('assert');
var MyWallet = require('../wallet');

module.exports = CoinifyTrade;

function CoinifyTrade (obj, coinify) {
  this._coinify = coinify;

  this._id = obj.id;
  this._inCurrency = obj.inCurrency;
  this._outCurrency = obj.outCurrency;
  this._inAmount = obj.inAmount;
  this._medium = obj.transferIn.medium;
  this._outAmountExpected = obj.outAmountExpected;
  this._receiveAddress = obj.transferOut.details.account;
  this._state = obj.state;
  this._createdAt = new Date(obj.createTime);
  this._iSignThisID = obj.transferIn.details.paymentId;
  this._receiptUrl = obj.receiptUrl;
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
  }
});

CoinifyTrade.prototype.removeLabeledAddress = function () {
  console.log('removeLabeledAddress()');
  var account = MyWallet.wallet.hdwallet.accounts[0];

  var index = account.indexOfreceiveAddress(this.receiveAddress);

  console.log(index);

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
// trade.bitcoinReceived.then(() => ...);
CoinifyTrade.prototype.bitcoinReceived = function () {
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

CoinifyTrade.buy = function (quote, coinify) {
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
      medium: 'card'
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
      }
      return Promise.resolve(coinify._trades);
    });
  };

  if (coinify.isLoggedIn) {
    return getTrades();
  } else {
    return coinify.login().then(getTrades);
  }
};
