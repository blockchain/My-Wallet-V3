'use strict';

var WalletStore = require('../wallet-store');
var API = require('../api');

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

CoinifyTrade.prototype.cancel = function () {
  var parentThis = this;

  var processCancel = function (trade) {
    parentThis._state = trade.state;

    return Promise.resolve();
  };

  var cancelOrder = function () {
    return parentThis._coinify.PATCH('trades/' + parentThis._id + '/cancel').then(processCancel);
  };

  if (this._coinify._access_token) {
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
