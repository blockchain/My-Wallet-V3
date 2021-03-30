module.exports = HDAccount;

var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');
var Helpers = require('./helpers');
var Derivation = require('./derivation');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete?
var API = require('./api');
var Transaction = require('./transaction');
var constants = require('./constants');

// HDAccount Class

function HDAccount (object) {
  var obj = object || {};
  this._label = obj.label;
  this._archived = obj.archived || false;
  this._network = obj.network || Bitcoin.networks.bitcoin;
  // computed properties
  // The highest receive index with transactions, as returned by the server:
  this._lastUsedReceiveIndex = null;
  this._changeIndex = 0;
  this._n_tx = 0;
  this._balance = null;
  this._index = Helpers.isPositiveInteger(obj.index) ? obj.index : null;
  // v4 properties
  this._default_derivation = obj.default_derivation;
  this._derivations = obj.derivations.map(function(o) { return Derivation.factory(o) });
}

// PUBLIC PROPERTIES

Object.defineProperties(HDAccount.prototype, {
  'label': {
    configurable: false,
    get: function () { return this._label; },
    set: function (str) {
      if (Helpers.isValidLabel(str)) {
        this._label = str;
        MyWallet.syncWallet();
      } else {
        throw new Error('account.label must be an alphanumeric string');
      }
    }
  },
  'defaultDerivation': {
    configurable: false,
    get: function () { return this._default_derivation; },
    set: function (derivation) {
      return this._default_derivation = derivation;
    }
  },
  'defaultDerivationAccount': {
    configurable: false,
    get: function () {
      return this.derivations.find(x => x.type === this.defaultDerivation);
    }
  },
  'derivations': {
    configurable: false,
    get: function () { return this._derivations; },
    set: function (derivations) {
      return this._derivations = derivations;
    }
  },
  'balance': {
    configurable: false,
    get: function () {
      var balance = 0;
      this.derivations.forEach(function (d) {
        balance += d.balance
      })
      return balance;
    },
  },
  'n_tx': {
    configurable: false,
    get: function () {
      return this.defaultDerivationAccount.n_tx;
    }
  },
  'archived': {
    configurable: false,
    get: function () { return this._archived; },
    set: function (value) {
      if (Helpers.isBoolean(value)) {
        this._archived = value;
        MyWallet.syncWallet();
        MyWallet.wallet.getHistory();
      } else {
        throw new Error('account.archived must be a boolean');
      }
    }
  },
  'active': {
    configurable: false,
    get: function () { return !this.archived; },
    set: function (value) { this.archived = !value; }
  },
  'receiveIndex': {
    configurable: false,
    get: function () {
      var derivation = this.derivations.find(x => x.type === this.defaultDerivation)
      var maxLabeledReceiveIndex = derivation._address_labels.length > 0
      ? derivation._address_labels[derivation._address_labels.length - 1].index
      : null
      return Math.max(
        this.lastUsedReceiveIndex === null ? -1 : this.lastUsedReceiveIndex,
        maxLabeledReceiveIndex === null ? -1 : maxLabeledReceiveIndex
      ) + 1;
    }
  },
  'legacyDerivationReceiveIndex': {
    configurable: false,
    get: function () {
      var derivation = this.derivations.find(x => x.type === 'legacy')
      var maxLabeledReceiveIndex = derivation._address_labels.length > 0
      ? derivation._address_labels[derivation._address_labels.length - 1].index
      : null
      var lastUsedReceiveIndex = derivation.lastUsedReceiveIndex
      return Math.max(
        lastUsedReceiveIndex === null ? -1 : lastUsedReceiveIndex,
        maxLabeledReceiveIndex === null ? -1 : maxLabeledReceiveIndex
      ) + 1;
    }
  },
  'lastUsedReceiveIndex': {
    configurable: false,
    get: function () {
      return this.defaultDerivationAccount.lastUsedReceiveIndex;
    }
  },
  'changeIndex': {
    configurable: false,
    get: function () { return this._changeIndex; },
    set: function (value) {
      if (Helpers.isPositiveInteger(value)) {
        this._changeIndex = value;
      } else {
        throw new Error('account.changeIndex must be a number');
      }
    }
  },
  'extendedPublicKey': {
    configurable: false,
    get: function () { return this.defaultDerivationAccount._xpub; }
  },
  'extendedPrivateKey': {
    configurable: false,
    get: function () { return this.defaultDerivationAccount._xpriv; }
  },
  'legacyDerivationReceiveAddress': {
    configurable: false,
    get: function () { return this.receiveAddressAtIndex(this.legacyDerivationReceiveIndex, 'legacy'); }
  },
  'receiveAddress': {
    configurable: false,
    get: function () { return this.receiveAddressAtIndex(this.receiveIndex); }
  },
  'changeAddress': {
    configurable: false,
    get: function () { return this.changeAddressAtIndex(this.changeIndex); }
  },
  'isEncrypted': {
    configurable: false,
    get: function () { return Helpers.isBase64(this.defaultDerivationAccount._xpriv) && !Helpers.isXprivKey(this.defaultDerivationAccount._xpriv); }
  },
  'isUnEncrypted': {
    configurable: false,
    get: function () { return Helpers.isXprivKey(this.defaultDerivationAccount._xpriv); }
  },
  'index': {
    configurable: false,
    get: function () { return this._index; }
  },
  'coinCode': {
    configurable: false,
    get: function () { return 'btc'; }
  }
});

// CONSTRUCTORS

/* BIP 44 defines the following 5 levels in BIP32 path:
 * m / purpose' / coin_type' / account' / change / address_index
 * Apostrophe in the path indicates that BIP32 hardened derivation is used.
 *
 * Purpose is a constant set to 44' following the BIP43 recommendation
 * Registered coin types: 0' for Bitcoin
 */
// TODO Segwit: new accounts
HDAccount.fromAccountMasterKey = function (accountZero, index, label) {
  assert(accountZero, 'Account MasterKey must be given to create an account.');
  var account = new HDAccount();
  account._index = Helpers.isPositiveInteger(index) ? index : null;
  account._label = label;
  account._xpriv = accountZero.toBase58();
  account._xpub = accountZero.neutered().toBase58();
  account._keyRing.init(account._xpub, null);
  return account;
};

HDAccount.fromWalletMasterKey = function (masterkey, index, label) {
  assert(masterkey, 'Wallet MasterKey must be given to create an account.');
  assert(Helpers.isPositiveInteger(index), 'Derivation index must be a positive integer.');
  var accountZero = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(index);
  return HDAccount.fromAccountMasterKey(accountZero, index, label);
};

HDAccount.fromExtPublicKey = function (extPublicKey, index, label) {
  // this is creating a read-only account
  assert(Helpers.isXpubKey(extPublicKey), 'Extended public key must be given to create an account.');
  var accountZero = Bitcoin.bip32.fromBase58(extPublicKey, constants.getNetwork());
  var a = HDAccount.fromAccountMasterKey(accountZero, index, label);
  a._xpriv = null;
  return a;
};

HDAccount.fromExtPrivateKey = function (extPrivateKey, index, label) {
  assert(Helpers.isXprivKey(extPrivateKey), 'Extended private key must be given to create an account.');
  var accountZero = Bitcoin.bip32.fromBase58(extPrivateKey, constants.getNetwork());
  return HDAccount.fromAccountMasterKey(accountZero, index, label);
};

HDAccount.factory = function (o) {
  if (o instanceof Object && !(o instanceof HDAccount)) {
    return new HDAccount(o);
  } else {
    return o;
  }
};

// JSON SERIALIZER
HDAccount.prototype.toJSON = function () {
  var hdaccount = {
    label: this._label,
    archived: this._archived,
    derivations: this._derivations,
    default_derivation: this._default_derivation
  };

  return hdaccount;
};

HDAccount.reviver = function (k, v) {
  if (k === '') return new HDAccount(v);
  return v;
};

HDAccount.prototype.getLabels = function () {
  return this._derivations.find(x => x.type === this._default_derivation)._address_labels
          .sort((a, b) => a.index - b.index)
          .map(o => ({index: o.index, label: o.label}));
};

HDAccount.prototype.receiveAddressAtIndex = function (index, type) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  var preferredDerivation = type || this.defaultDerivation
  var derivations = this.derivations
  var keyRing = derivations.find((d) => d.type === preferredDerivation).keyRing
  return keyRing.receive.getAddress(index);
};

HDAccount.prototype.changeAddressAtIndex = function (index, type) {
  assert(Helpers.isPositiveInteger(index), 'Error: change index must be a positive integer');
  var preferredDerivation = type || this.defaultDerivation
  var derivations = this.derivations
  var keyRing = derivations.find((d) => d.type === preferredDerivation).keyRing
  return keyRing.change.getAddress(index);
};

HDAccount.prototype.getAvailableBalance = function (feeType) {
  feeType = (feeType === 'regular' || feeType === 'priority') ? feeType : 'regular';
  let feesP = API.getFees();
  let addresses = null;
  let addressesBech32 = null;
  if (defaultDerivation === 'bech32') {
    addressesBech32 = [this.extendedPublicKey];
  } else {
    addresses = [this.extendedPublicKey];
  }
  let coinsP = API.getUnspent(addresses, addressesBech32).then(Helpers.pluck('unspent_outputs'));
  return Promise.all([feesP, coinsP]).then(([fees, coins]) => {
    let fee = Helpers.toFeePerKb(fees[feeType]);
    let usableCoins = Transaction.filterUsableCoins(coins, fee);
    let amount = Transaction.maxAvailableAmount(usableCoins, fee).amount;
    return { amount, fee: fees[feeType] };
  });
};

HDAccount.prototype.encrypt = function (cipher) {
  if (!this._derivations) return this;
  this._derivations.forEach((d) => d.encrypt(cipher).persist());
  return this;
};

HDAccount.prototype.decrypt = function (cipher) {
  if (!this._derivations) return this;
  this._derivations.forEach((d) => d.decrypt(cipher));
  return this;
};

// No longer supported by HDAccount class
// Address labels:
HDAccount.prototype.persist = function () {
  console.log('Not supported')
};
HDAccount.prototype.addLabel = function (receiveIndex, label) {
  console.log('Not supported')
};

HDAccount.prototype.setLabel = function (receiveIndex, label) {
  console.log('Not supported')
};

HDAccount.prototype.removeLabel = function (receiveIndex) {
  console.log('Not supported')
};

// Shapeshift
HDAccount.prototype.createShiftPayment = function (wallet) {
  console.log('Not supported')
};
