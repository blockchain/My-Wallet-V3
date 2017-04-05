var API = require('./api');
var WalletStore = require('./wallet-store');
var TX = require('./wallet-transaction');
var Helpers = require('./helpers');
var assert = require('assert');

module.exports = ExchangeDelegate;

function ExchangeDelegate (wallet) {
  assert(wallet, 'BlockchainWallet expected');
  this._wallet = wallet;
}

Object.defineProperties(ExchangeDelegate.prototype, {
  'debug': {
    configurable: false,
    get: function () { return this._debug; },
    set: function (value) {
      this._debug = Boolean(value);
    }
  },
  'trades': {
    configurable: false,
    get: function () { return this._trades; },
    set: function (value) {
      this._trades = value;
    }
  },
  'labelBase': {
    configurable: false,
    get: function () {
      return this._labelBase || 'Exchange order';
    },
    set: function (value) {
      this._labelBase = value;
    }
  }
});

ExchangeDelegate.prototype.save = function () {
  return this._wallet.external.save();
};

ExchangeDelegate.prototype.email = function () {
  return this._wallet.accountInfo.email;
};

ExchangeDelegate.prototype.mobile = function () {
  return this._wallet.accountInfo.mobile;
};

ExchangeDelegate.prototype.isEmailVerified = function () {
  return this._wallet.accountInfo.isEmailVerified;
};

ExchangeDelegate.prototype.isMobileVerified = function () {
  return this._wallet.accountInfo.isMobileVerified;
};

ExchangeDelegate.prototype.getToken = function (partner, options) {
  options = options || {};
  // assert(partner, 'Specify exchange partner');

  let fields = {
    // partner: partner, // Coinify doesn't support this yet
    guid: this._wallet.guid,
    sharedKey: this._wallet.sharedKey,
    fields: `email${options.mobile ? '|mobile' : ''}${options.walletAge ? '|wallet_age' : ''}`
  };

  if (partner) {
    fields.partner = partner;
  }

  return API.request(
    'GET',
    'wallet/signed-token',
    fields
  ).then(function (res) {
    if (res.success) {
      return res.token;
    } else {
      throw new Error('Unable to obtain email & mobile verification proof');
    }
  });
};

ExchangeDelegate.prototype.monitorAddress = function (address, callback) {
  var self = this;
  WalletStore.addEventListener(function (event, data) {
    if (event === 'on_tx_received') {
      if (data['out']) {
        for (var i = 0; i < data['out'].length; i++) {
          if (data['out'][i].addr === address) {
            /* istanbul ignore if */
            if (self.debug) {
              console.info('Transaction ' + data['hash'] + ' detected on address ' + address);
            }
            callback(data['hash'], data['out'][i].value);
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
  if (Helpers.isPositiveInteger(trade._account_index)) {
    var account = this._wallet.hdwallet.accounts[trade._account_index];
    return account.receiveAddressAtIndex(trade._receive_index);
  } else {
    // trade.account_index could be missing, although that shouldn't happen
    return null;
  }
};

ExchangeDelegate.prototype.findLastExchangeIndex = function () {
  var account = this._wallet.hdwallet.defaultAccount;
  var receiveAddressIndex = account.receiveIndex;

  var receiveIndexes = this._trades.map(Helpers.pluck('_receive_index'));
  var index = receiveAddressIndex;
  for (var i = index - 1; i > index - 20; i--) {
    if (receiveIndexes.filter(Helpers.eq(i)).length > 0) return i;
  }
  return null;
};

ExchangeDelegate.prototype.reserveReceiveAddress = function () {
  assert(this._trades, 'delegate.trades array should be set for reserveReceiveAddress');

  var self = this;

  var account = this._wallet.hdwallet.defaultAccount;

  let reservation = this._wallet.labels.reserveReceiveAddress(account.index, {
    reusableIndex: this.findLastExchangeIndex()
  });

  return {
    _reservation: reservation,
    receiveAddress: reservation.receiveAddress,
    commit: (trade) => {
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Set label for receive index', reservation.receiveIndex);
      }
      trade._account_index = account.index;
      trade._receive_index = reservation.receiveIndex;
      reservation.commit(`${self.labelBase} #${trade.id}`);
    }
  };
};

ExchangeDelegate.prototype.releaseReceiveAddress = function (trade) {
  assert(this._trades, 'delegate.trades array should be set for releaseReceiveAddress');
  if (Helpers.isPositiveInteger(trade._account_index) && Helpers.isPositiveInteger(trade._receive_index)) {
    var ids = this._trades
      .filter(Helpers.propEq('receiveAddress', trade.receiveAddress))
      .map(Helpers.pluck('id'))
      .filter(Helpers.notEq(trade.id));

    var self = this;

    if (Helpers.isEmptyArray(ids)) {
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Remove label for receive index', trade._receive_index);
      }
      this._wallet.labels.releaseReceiveAddress(trade._account_index, trade._receive_index);
    } else {
      /* istanbul ignore if */
      if (self.debug) {
        console.info('Rename label for receive index', trade._receive_index);
      }
      this._wallet.labels.releaseReceiveAddress(
        trade._account_index,
        trade._receive_index,
        {
          expectedLabel: `${self.labelBase} #${trade.id}`
        }
      );
    }
  } else {
    // trade.account_index could be missing, although that shouldn't happen
    /* istanbul ignore if */
    if (this.debug) {
      console.info('account_index missing for trade #', trade.id);
    }
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
