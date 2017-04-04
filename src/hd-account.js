module.exports = HDAccount;

var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');
var Helpers = require('./helpers');
var KeyRing = require('./keyring');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var constants = require('./constants');

// HDAccount Class

function HDAccount (object) {
  var obj = object || {};
  obj.cache = obj.cache || {};
  // serializable data
  this._label = obj.label;
  this._archived = obj.archived || false;
  this._xpriv = obj.xpriv;
  this._xpub = obj.xpub;
  this._network = obj.network || Bitcoin.networks.bitcoin;

  this._address_labels = obj.address_labels || [];

  // computed properties
  this._keyRing = new KeyRing(obj.xpub, obj.cache);
  // The highest receive index with transactions, as returned by the server:
  this._lastUsedReceiveIndex = null;
  this._changeIndex = 0;
  this._n_tx = 0;
  this._balance = null;
  this._index = Helpers.isPositiveInteger(obj.index) ? obj.index : null;
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
  'balance': {
    configurable: false,
    get: function () { return this._balance; },
    set: function (num) {
      if (Helpers.isPositiveNumber(num)) {
        this._balance = num;
      } else {
        throw new Error('account.balance must be a positive number');
      }
    }
  },
  'n_tx': {
    get: function () { return this._n_tx; },
    set: function (num) {
      if (Helpers.isPositiveInteger(num)) {
        this._n_tx = num;
      } else {
        throw new Error('account.n_tx must be a positive integer');
      }
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
      let maxLabeledReceiveIndex = null;
      if (MyWallet.wallet.labels) { // May not be set yet
        maxLabeledReceiveIndex = MyWallet.wallet.labels.maxLabeledReceiveIndex(this.index);
      } else if (this._address_labels && this._address_labels.length) {
        maxLabeledReceiveIndex = this._address_labels[this._address_labels.length - 1].index;
      }
      return Math.max(
        this.lastUsedReceiveIndex === null ? -1 : this.lastUsedReceiveIndex,
        maxLabeledReceiveIndex === null ? -1 : maxLabeledReceiveIndex
      ) + 1;
    }
  },
  'lastUsedReceiveIndex': {
    configurable: false,
    get: function () { return this._lastUsedReceiveIndex; },
    set: function (value) {
      assert(value === null || Helpers.isPositiveInteger(value), 'should be null or >= 0');
      this._lastUsedReceiveIndex = value;
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
    get: function () { return this._xpub; }
  },
  'extendedPrivateKey': {
    configurable: false,
    get: function () { return this._xpriv; }
  },
  'keyRing': {
    configurable: false,
    get: function () { return this._keyRing; }
  },
  'receiveAddress': {
    configurable: false,
    get: function () { return this._keyRing.receive.getAddress(this.receiveIndex); }
  },
  'changeAddress': {
    configurable: false,
    get: function () { return this._keyRing.change.getAddress(this._changeIndex); }
  },
  'isEncrypted': {
    configurable: false,
    get: function () { return Helpers.isBase64(this._xpriv) && !Helpers.isXprivKey(this._xpriv); }
  },
  'isUnEncrypted': {
    configurable: false,
    get: function () { return Helpers.isXprivKey(this._xpriv); }
  },
  'index': {
    configurable: false,
    get: function () { return this._index; }
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
  var accountZero = Bitcoin.HDNode.fromBase58(extPublicKey, constants.getNetwork());
  var a = HDAccount.fromAccountMasterKey(accountZero, index, label);
  a._xpriv = null;
  return a;
};

HDAccount.fromExtPrivateKey = function (extPrivateKey, index, label) {
  assert(Helpers.isXprivKey(extPrivateKey), 'Extended private key must be given to create an account.');
  var accountZero = Bitcoin.HDNode.fromBase58(extPrivateKey, constants.getNetwork());
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
    xpriv: this._xpriv,
    xpub: this._xpub,
    address_labels: this._orderedAddressLabels(),
    cache: this._keyRing
  };

  return hdaccount;
};

HDAccount.reviver = function (k, v) {
  if (k === '') return new HDAccount(v);
  return v;
};

HDAccount.prototype.receiveAddressAtIndex = function (index) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  return this._keyRing.receive.getAddress(index);
};

HDAccount.prototype.encrypt = function (cipher) {
  if (!this._xpriv) return this;
  var xpriv = cipher ? cipher(this._xpriv) : this._xpriv;
  if (!xpriv) { throw new Error('Error Encoding account extended private key'); }
  this._temporal_xpriv = xpriv;
  return this;
};

HDAccount.prototype.decrypt = function (cipher) {
  if (!this._xpriv) return this;
  var xpriv = cipher ? cipher(this._xpriv) : this._xpriv;
  if (!xpriv) { throw new Error('Error Decoding account extended private key'); }
  this._temporal_xpriv = xpriv;
  return this;
};

HDAccount.prototype.persist = function () {
  if (!this._temporal_xpriv) return this;
  this._xpriv = this._temporal_xpriv;
  delete this._temporal_xpriv;
  return this;
};

// Address labels:

HDAccount.prototype._orderedAddressLabels = function () {
  return this._address_labels.sort((a, b) => a.index - b.index);
};

HDAccount.prototype.addLabel = function (receiveIndex, label) {
  assert(Helpers.isPositiveInteger(receiveIndex));

  let labels = this._address_labels;

  let labelEntry = {
    index: receiveIndex,
    label: label
  };

  labels.push(labelEntry);
};

HDAccount.prototype.getLabels = function () {
  return this._address_labels
          .sort((a, b) => a.index - b.index)
          .map(o => ({index: o.index, label: o.label}));
};

HDAccount.prototype.setLabel = function (receiveIndex, label) {
  let labels = this._address_labels;

  let labelEntry = labels.find((label) => label.index === receiveIndex);

  if (!labelEntry) {
    labelEntry = {index: receiveIndex};
    labels.push(labelEntry);
  }

  labelEntry.label = label;
};

HDAccount.prototype.removeLabel = function (receiveIndex) {
  let labels = this._address_labels;
  let labelEntry = labels.find((label) => label.index === receiveIndex);
  labels.splice(labels.indexOf(labelEntry), 1);
};
