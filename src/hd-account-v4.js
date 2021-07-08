module.exports = HDAccount;

var Bitcoin = require('bitcoinjs-lib');
var assert = require('assert');
var Helpers = require('./helpers');
var Derivation = require('./derivation');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete?
var API = require('./api');
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
  this._index = Helpers.isPositiveInteger(obj.index) ? obj.index : null;
  // v4 properties
  this._default_derivation = obj.default_derivation
  const derivations = obj.derivations || []
  this._derivations = derivations.map(function(o) { return Derivation.factory(o) });
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
      const derivation = this.derivations.find(x => x.type === this.defaultDerivation)
      if (derivation == null) {
        return 0
      }
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
      if (derivation == null) {
        return 0
      }
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

HDAccount.fromWalletMasterKey = function (masterkey, index, label) {
  assert(masterkey, 'Wallet MasterKey must be given to create an account.')
  assert(Helpers.isPositiveInteger(index), 'Derivation index must be a positive integer.')
  const legacyNode = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(index)
  const bech32Node = masterkey.deriveHardened(84).deriveHardened(0).deriveHardened(index)

  const legacyDerivation = new Derivation({
    type: 'legacy',
    purpose: 44,
    xpriv: legacyNode.toBase58(),
    xpub: legacyNode.neutered().toBase58()
  })
  const bech32Derivation = new Derivation({
    type: 'bech32',
    purpose: 84,
    xpriv: bech32Node.toBase58(),
    xpub: bech32Node.neutered().toBase58()
  })

  var account = new HDAccount()
  account._index = index
  account._label = label
  account._default_derivation = 'bech32'
  account.derivations = [legacyDerivation, bech32Derivation]
  return account
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
    derivations: this._derivations.map(function(o) { return o.toJSON() }),
    default_derivation: this._default_derivation
  };

  return hdaccount;
};

HDAccount.reviver = function (k, v) {
  if (k === '') return new HDAccount(v);
  return v;
};

HDAccount.prototype.getLabels = function () {
  return this._derivations
    .find(x => x.type === this._default_derivation)
    ._address_labels
    .sort((a, b) => a.index - b.index)
    .map(o => ({ index: o.index, label: o.label }));
};

HDAccount.prototype.receiveAddressAtIndex = function (index, type) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  var preferredDerivation = type || this.defaultDerivation
  const derivation = this.derivations.find((d) => d.type === preferredDerivation)
  const { publicKey } = Bitcoin.bip32.fromBase58(derivation.xpub).derivePath(`0/${index}`)

  switch (preferredDerivation) {
    case 'bech32':
      return Bitcoin.payments.p2wpkh({ pubkey: publicKey }).address
    case 'legacy':
      return Bitcoin.payments.p2pkh({ pubkey: publicKey }).address
    default:
      throw new Error('unrecognized derivation type')
  }
};

HDAccount.prototype.changeAddressAtIndex = function (index, type) {
  assert(Helpers.isPositiveInteger(index), 'Error: change index must be a positive integer');
  var preferredDerivation = type || this.defaultDerivation
  const derivation = this.derivations.find((d) => d.type === preferredDerivation)
  const { publicKey } = Bitcoin.bip32.fromBase58(derivation.xpub).derivePath(`1/${index}`)

  switch (preferredDerivation) {
    case 'bech32':
      return Bitcoin.payments.p2wpkh({ pubkey: publicKey }).address
    case 'legacy':
      return Bitcoin.payments.p2pkh({ pubkey: publicKey }).address
    default:
      throw new Error('unrecognized derivation type')
  }
};

HDAccount.prototype.encrypt = function (cipher) {
  if (!this._derivations) return this;
  this._derivations.forEach((d) => d.encrypt(cipher));
  return this;
};

HDAccount.prototype.decrypt = function (cipher) {
  if (!this._derivations) return this;
  this._derivations.forEach((d) => d.decrypt(cipher));
  return this;
};

HDAccount.prototype.persist = function () {
  if (!this._derivations) return;
  this._derivations.forEach((d) => d.persist());
};

// No longer supported by HDAccount class
HDAccount.prototype.setLabel = function (receiveIndex, label) {
  console.log('Not supported')
};
HDAccount.prototype.removeLabel = function (receiveIndex) {
  console.log('Not supported')
};