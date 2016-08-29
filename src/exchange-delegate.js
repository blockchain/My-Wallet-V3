var API = require('./api');
var WalletStore = require('./wallet-store');
var TX = require('./wallet-transaction');
var Helpers = require('./helpers');

module.exports = ExchangeDelegate;

function ExchangeDelegate (wallet) {
  this._wallet = wallet;
}

ExchangeDelegate.prototype.email = function () {
  return this._wallet.accountInfo.email;
};

ExchangeDelegate.prototype.isEmailVerified = function () {
  return this._wallet.accountInfo.isEmailVerified;
};

ExchangeDelegate.prototype.getEmailToken = function () {
  var self = this;
  return API.request(
    'GET',
    'wallet/signed-email-token',
    {
      guid: self._wallet.guid,
      sharedKey: self._wallet.sharedKey
    }
  ).then(function (res) {
    if (res.success) {
      return res.token;
    } else {
      throw new Error('Unable to obtain email verification proof');
    }
  });
};

ExchangeDelegate.prototype.monitorAddress = function (address, callback) {
  WalletStore.addEventListener(function (event, data) {
    if (event === 'on_tx_received') {
      if (data['out']) {
        for (var i = 0; i < data['out'].length; i++) {
          if (data['out'][i].addr === address) {
            callback(data['out'][i].value);
          }
        }
      }
    }
  });
};

ExchangeDelegate.prototype.checkAddress = function (address) {
  return API.getHistory([address]).then(function (res) {
    if (res.txs && res.txs.length > 0) {
      var tx = new TX(res.txs[0]);
      return {hash: tx.hash, confirmations: tx.confirmations};
    }
  });
};

ExchangeDelegate.prototype.getReceiveAddress = function (trade) {
  var account = this._wallet.hdwallet.accounts[trade._account_index];
  return account.receiveAddressAtIndex(trade._receive_index);
};

ExchangeDelegate.prototype.reserveReceiveAddress = function (trade) {
  // TODO: make sure the wallet doesn't use it unless trade creation fails
  var account = this._wallet.hdwallet.defaultAccount;

  var receiveAddressIndex = account.receiveIndex;

  // Respect the GAP limit:
  if (receiveAddressIndex - account.lastUsedReceiveIndex >= 19) {
    throw new Error('gap_limit');
  }

  return account.receiveAddressAtIndex(receiveAddressIndex);
};

ExchangeDelegate.prototype.commitReceiveAddress = function (trade) {
  var account = this._wallet.hdwallet.defaultAccount;
  var receiveAddressIndex = account.receiveIndex;

  account.setLabelForReceivingAddress(receiveAddressIndex, 'Coinify order #' + trade.id);

  trade._account_index = account.index;
  trade._receive_index = receiveAddressIndex;
};

ExchangeDelegate.prototype.releaseReceiveAddress = function (trade) {
  if (Helpers.isPositiveInteger(trade._account_index) && Helpers.isPositiveInteger(trade._receive_index)) {
    var account = this._wallet.hdwallet.accounts[trade._account_index];
    account.removeLabelForReceivingAddress(trade._receive_index);
  }
};

ExchangeDelegate.prototype.serializeExtraFields = function (obj, trade) {
  obj.account_index = trade._account_index;
  obj.receive_index = trade._receive_index;
};

ExchangeDelegate.prototype.deserializeExtraFields = function (obj, trade) {
  trade._account_index = obj.account_index;
  trade._receive_index = obj.receive_index;
};
