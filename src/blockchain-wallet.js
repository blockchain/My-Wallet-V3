module.exports = Wallet;

// dependencies
var assert = require('assert');
var BIP39 = require('bip39');
var RNG = require('./rng');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDWallet = require('./hd-wallet');
var Address = require('./address');
var Helpers = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var API = require('./api');
var BlockchainSettingsAPI = require('./blockchain-settings-api');
var KeyRing = require('./keyring');
var TxList = require('./transaction-list');
var Block = require('./bitcoin-block');
var External = require('./external');
var AccountInfo = require('./account-info');
var Metadata = require('./metadata');
var constants = require('./constants');
var Payment = require('./payment');
var Labels = require('./labels');
var Bitcoin = require('bitcoinjs-lib');

// Wallet

function Wallet (object) {
  var obj = object || {};
  obj.options = obj.options || {};
  obj.keys = obj.keys || [];
  obj.hd_wallets = obj.hd_wallets || [];

  this._guid = obj.guid;
  this._sharedKey = obj.sharedKey;
  this._double_encryption = obj.double_encryption || false;
  this._dpasswordhash = obj.dpasswordhash;
  // options
  let options = Object.assign(constants.getDefaultWalletOptions(), obj.options);
  this._pbkdf2_iterations = options.pbkdf2_iterations;
  this._fee_per_kb = options.fee_per_kb;
  this._html5_notifications = options.html5_notifications;
  this._logout_time = options.logout_time;

  // legacy addresses list
  this._addresses = obj.keys ? obj.keys.reduce(Address.factory, {}) : undefined;
  // hdwallets list
  this._hd_wallets = obj.hd_wallets ? obj.hd_wallets.map(HDWallet.factory) : undefined;

  // address book list
  // address book in json is [{address: 'address1', label: 'label1'} , ... ]
  // address book in memory is {address1: 'label1', address2: 'label2'}
  this._address_book = obj.address_book
      ? obj.address_book.reduce(function (o, a) {
        var address = a.address || a.addr;
        o[address] = a.label;
        return o;
      }, {})
      : {};

  this._metadataHDNode = null;

  if (obj.metadataHDNode) {
    this._metadataHDNode = Bitcoin.HDNode.fromBase58(obj.metadataHDNode, constants.getNetwork());
  } else if (!this.isUpgradedToHD) {
  } else if (!this.isDoubleEncrypted) {
    this._metadataHDNode = Metadata.deriveMetadataNode(this.hdwallet.getMasterHDNode());
    MyWallet.syncWallet();
  } else {
    console.warn('Second password required to prepare KV Store');
  }

  // tx_notes dictionary
  this._tx_notes = obj.tx_notes || {};

  // tx_tags list (not sure if list or object)
  // this._tx_tags = obj.tx_tags || [];

  // tag_names list (check how is represented each tag-name)
  this._tx_names = obj.tx_names || [];

  // fetched data from the server
  this._totalSent = 0;
  this._totalReceived = 0;
  this._finalBalance = 0;
  this._numberTxTotal = 0;
  this._txList = new TxList();
  this._latestBlock = null;
  this._accountInfo = null;
  this._external = null;
}

Object.defineProperties(Wallet.prototype, {
  'isMetadataReady': {
    configurable: false,
    get: function () { return this._metadataHDNode != null; }
  },
  'guid': {
    configurable: false,
    get: function () { return this._guid; }
  },
  'sharedKey': {
    configurable: false,
    get: function () { return this._sharedKey; }
  },
  'context': {
    configurable: false,
    get: function () {
      var xpubs = this.hdwallet && this.hdwallet.activeXpubs;
      return this.activeAddresses.concat(xpubs || []);
    }
  },
  'isDoubleEncrypted': {
    configurable: false,
    get: function () { return this._double_encryption; }
  },
  'dpasswordhash': {
    configurable: false,
    get: function () { return this._dpasswordhash; }
  },
  'fee_per_kb': {
    configurable: false,
    get: function () { return this._fee_per_kb; },
    set: function (value) {
      switch (true) {
        case !Helpers.isPositiveNumber(value):
          throw new Error('wallet.fee_per_kb must be a positive number');
        case value > 1000000:  // 0.01 btc
          throw new Error('wallet.fee_per_kb too high (0.01 btc limit)');
        default:
          this._fee_per_kb = value;
          MyWallet.syncWallet();
      }
    }
  },
  'pbkdf2_iterations': {
    configurable: false,
    get: function () { return this._pbkdf2_iterations; }
  },
  'totalSent': {
    configurable: false,
    get: function () { return this._totalSent; },
    set: function (value) {
      if (Helpers.isPositiveNumber(value)) {
        this._totalSent = value;
      } else {
        throw new Error('wallet.totalSent must be a positive number');
      }
    }
  },
  'totalReceived': {
    configurable: false,
    get: function () { return this._totalReceived; },
    set: function (value) {
      if (Helpers.isPositiveNumber(value)) {
        this._totalReceived = value;
      } else {
        throw new Error('wallet.totalReceived must be a positive number');
      }
    }
  },
  'finalBalance': {
    configurable: false,
    get: function () { return this._finalBalance; },
    set: function (value) {
      if (Helpers.isPositiveNumber(value)) {
        this._finalBalance = value;
      } else {
        throw new Error('wallet.finalBalance must be a positive number');
      }
    }
  },
  'txList': {
    configurable: false,
    get: function () { return this._txList; }
  },
  'numberTxTotal': {
    configurable: false,
    get: function () { return this._numberTxTotal; },
    set: function (value) {
      if (Helpers.isPositiveInteger(value)) {
        this._numberTxTotal = value;
      } else {
        throw new Error('wallet.numberTx must be a positive integer');
      }
    }
  },
  'addresses': {
    configurable: false,
    get: function () { return Object.keys(this._addresses); }
  },
  'activeAddresses': {
    configurable: false,
    get: function () { return this.activeKeys.map(function (k) { return k.address; }); }
  },
  'spendableActiveAddresses': {
    configurable: false,
    get: function () {
      return this.activeKeys
          .filter(function (k) { return !k.isWatchOnly; })
          .map(function (k) { return k.address; });
    }
  },
  'key': {
    configurable: false,
    value: function (addr) { return this._addresses[addr]; }
  },
  'activeKey': {
    configurable: false,
    value: function (addr) {
      var k = this._addresses[addr];
      var r = !k || k.archived ? null : k;
      return r;
    }
  },
  'keys': {
    configurable: false,
    get: function () {
      var that = this;
      return that.addresses.map(function (a) { return that.key(a); });
    }
  },
  'activeKeys': {
    configurable: false,
    get: function () { return this.keys.filter(function (a) { return !a.archived; }); }
  },
  'hdwallet': {
    configurable: false,
    get: function () { return this._hd_wallets[0]; }
  },
  'isUpgradedToHD': {
    configurable: false,
    get: function () {
      return !(this._hd_wallets == null || this._hd_wallets.length === 0);
    }
  },
  'external': {
    configurable: false,
    get: function () { return this._external; }
  },
  'isEncryptionConsistent': {
    configurable: false,
    get: function () {
      var operation;
      if (this.isDoubleEncrypted) {
        operation = function (k) { return k.isEncrypted; };
      } else { // no double encryption activated
        operation = function (k) { return k.isUnEncrypted; };
      }
      var A = this.keys.filter(function (k) { return !k.isWatchOnly; })
                       .map(operation)
                       .reduce(Helpers.and, true);
      var W = this._hd_wallets.map(operation)
                              .reduce(Helpers.and, true);
      return A && W;
    }
  },
  'balanceActiveLegacy': {
    configurable: false,
    get: function () {
      return this.activeKeys
                 .map(function (k) { return k.balance; })
                 .reduce(Helpers.add, 0);
    }
  },
  'balanceActiveAccounts': {
    configurable: false,
    get: function () {
      if (this.isUpgradedToHD) {
        return this.hdwallet.accounts
                  .filter(function (a) { return !a.archived; })
                  .map(function (a) { return a.balance; })
                  .reduce(Helpers.add, 0);
      } else {
        return 0;
      }
    }
  },
  'balanceActive': {
    configurable: false,
    get: function () {
      return this.balanceActiveLegacy + this.balanceActiveAccounts;
    }
  },
  'balanceSpendableActive': {
    configurable: false,
    get: function () {
      return this.balanceSpendableActiveLegacy + this.balanceActiveAccounts;
    }
  },
  'balanceSpendableActiveLegacy': {
    configurable: false,
    get: function () {
      return this.activeKeys
                 .filter(function (k) { return !k.isWatchOnly; })
                 .map(function (k) { return k.balance; })
                 .reduce(Helpers.add, 0);
    }
  },
  'addressBook': {
    configurable: false,
    get: function () { return this._address_book; }
  },
  'defaultPbkdf2Iterations': {
    configurable: false,
    get: function () { return 5000; }
  },
  'latestBlock': {
    configurable: false,
    get: function () { return this._latestBlock; },
    set: function (json) {
      var b = Block.fromJSON(json);
      if (b != null) {
        this._latestBlock = b;
        WalletStore.sendEvent('did_set_latest_block');
      } else {
        throw new Error('tried to set wrong wallet.latestBlock');
      }
    }
  },
  'logoutTime': {
    configurable: false,
    get: function () { return this._logout_time; },
    set: function (t) {
      if (Helpers.isPositiveInteger(t) && Helpers.isInRange(t, 60000, 86400001)) {
        this._logout_time = t;
        MyWallet.syncWallet();
      } else {
        throw new Error('wallet.logoutTime must be a positive integer in range 60000,86400001');
      }
    }
  },
  'accountInfo': {
    configurable: false,
    get: function () { return this._accountInfo; }
  },
  'labels': {
    configurable: false,
    get: function () {
      return this._labels;
    }
  }
});

// update-wallet-balances after multiaddr call
Wallet.prototype._updateWalletInfo = function (obj) {
  if (obj.info) {
    if (obj.info.notice) {
      WalletStore.sendEvent('msg', {type: 'error', message: obj.info.notice});
    }
  }

  if (obj.wallet == null) {
    this.totalSent = 0;
    this.totalReceived = 0;
    this.finalBalance = 0;
    this.numberTxTotal = 0;
    return true;
  }

  this.totalSent = obj.wallet.total_sent;
  this.totalReceived = obj.wallet.total_received;
  this.finalBalance = obj.wallet.final_balance;
  this.numberTxTotal = obj.wallet.n_tx;

  var updateAccountAndAddressesInfo = function (e) {
    if (this.isUpgradedToHD) {
      var account = this.hdwallet.activeAccount(e.address);
      if (account) {
        account.balance = e.final_balance;
        account.n_tx = e.n_tx;
        account.lastUsedReceiveIndex = e.account_index === 0 ? null : e.account_index - 1;
        account.changeIndex = e.change_index;
      }
    }
    var address = this.activeKey(e.address);
    if (address) {
      address.balance = e.final_balance;
      address.totalReceived = e.total_received;
      address.totalSent = e.total_sent;
    }
  };
  this.latestBlock = obj.info.latest_block;
  obj.addresses.forEach(updateAccountAndAddressesInfo.bind(this));
  this.txList.pushTxs(obj.txs);
  WalletStore.sendEvent('did_multiaddr');
  return obj.txs.length;
};

Wallet.prototype.getHistory = function () {
  return API.getHistory(this.context, 0, 0, this.txList.loadNumber)
    .then(function (obj) { this.txList.wipe(); return obj; }.bind(this))
    .then(this._updateWalletInfo.bind(this));
};

Wallet.prototype.fetchTransactions = function () {
  return API.getHistory(this.context, 0, this.txList.fetched, this.txList.loadNumber)
    .then(this._updateWalletInfo.bind(this));
};

Wallet.prototype.getBalancesForArchived = function () {
  var updateBalance = function (key) {
    if (this.containsLegacyAddress(key.address)) {
      this.key(key.address).balance = key.final_balance;
    }
  };
  var updateBalances = function (obj) {
    obj.addresses.forEach(updateBalance.bind(this));
    return obj;
  };
  var archivedAddrs = this.addresses.filter(function (addr) {
    return MyWallet.wallet.key(addr).archived === true;
  });

  return API.getHistory(archivedAddrs, 0, 0, 1).then(updateBalances.bind(this));
};

Wallet.prototype.toJSON = function () {
  function addressBookToJSON (addressBook) {
    return Object.keys(addressBook)
             .map(function (a) { return {addr: a, label: addressBook[a]}; });
  }

  return {
    guid: this.guid,
    sharedKey: this.sharedKey,
    double_encryption: this.isDoubleEncrypted,
    dpasswordhash: this.dpasswordhash,
    metadataHDNode: this._metadataHDNode && this._metadataHDNode.toBase58(),
    options: {
      pbkdf2_iterations: this.pbkdf2_iterations,
      fee_per_kb: this.fee_per_kb,
      html5_notifications: this._html5_notifications,
      logout_time: this._logout_time
    },
    address_book: addressBookToJSON(this._address_book),
    tx_notes: this._tx_notes,
    // tx_tags           : this._tx_tags,
    tx_names: this._tx_names,
    keys: this.keys,
    hd_wallets: Helpers.isEmptyArray(this._hd_wallets) ? undefined : this._hd_wallets
  };
};

Wallet.prototype.addKeyToLegacyAddress = function (privateKey, addr, secPass, bipPass) {
  var modifyAddress = function (newKey) {
    var watchOnlyKey = this._addresses[addr];
    if (newKey.address !== watchOnlyKey.address) {
      if (!this.containsLegacyAddress(newKey.address)) {
        console.log(newKey);
        return this.importLegacyAddress(privateKey, null, secPass, bipPass);
      } else {
        if (this.key(newKey.address).isWatchOnly) {
          watchOnlyKey = this._addresses[newKey.address];
        } else {
          throw new Error('privateKeyOfAnotherNonWatchOnlyAddress');
        }
      }
    }
    watchOnlyKey._priv = newKey._priv;
    if (this.isDoubleEncrypted) {
      if (!secPass) { throw new Error('second password needed'); }
      if (!this.validateSecondPassword(secPass)) { throw new Error('wrong second password'); }
      var cipher = WalletCrypto.cipherFunction(secPass, this._sharedKey, this._pbkdf2_iterations, 'enc');
      watchOnlyKey.encrypt(cipher).persist();
    }
    MyWallet.syncWallet();
    return watchOnlyKey;
  }.bind(this);

  if (!this.containsLegacyAddress(addr)) {
    return Promise.reject('addressNotPresentInWallet');
  } else if (!this.key(addr).isWatchOnly) {
    return Promise.reject('addressNotWatchOnly');
  } else {
    return Address.fromString(privateKey, null, bipPass).then(modifyAddress);
  }
};

Wallet.prototype.importLegacyAddress = function (addr, label, secPass, bipPass) {
  var importAddress = function (ad) {
    if (this.containsLegacyAddress(ad)) {
      if (this.key(ad.address).isWatchOnly && !ad.isWatchOnly) {
        return this.addKeyToLegacyAddress(addr, ad.address, secPass, bipPass);
      } else {
        throw new Error('presentInWallet');
      }
    }
    if (this.isDoubleEncrypted) {
      if (!secPass) { throw new Error('second password needed'); }
      if (!this.validateSecondPassword(secPass)) { throw new Error('wrong second password'); }
      var cipher = WalletCrypto.cipherFunction(secPass, this._sharedKey, this._pbkdf2_iterations, 'enc');
      ad.encrypt(cipher).persist();
    }
    this._addresses[ad.address] = ad;
    MyWallet.ws.send(MyWallet.ws.msgAddrSub(ad.address));
    MyWallet.syncWallet();
    this.getHistory();
    return ad;
  }.bind(this);

  return Address.fromString(addr, label, bipPass).then(importAddress);
};

Wallet.prototype.containsLegacyAddress = function (address) {
  if (Helpers.isInstanceOf(address, Address)) address = address.address;
  return this._addresses.hasOwnProperty(address);
};

Wallet.prototype.newLegacyAddress = function (label, pw, success, error) {
  try {
    // This method might throw if the RNG fails:
    var ad = Address.new(label);
  } catch (e) {
    error(e);
    return;
  }
  if (this.isDoubleEncrypted) {
    assert(pw, 'Error: second password needed');
    var cipher = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, 'enc');
    ad.encrypt(cipher).persist();
  }
  this._addresses[ad.address] = ad;
  MyWallet.syncWallet(success, error);
  return ad;
};

Wallet.prototype.deleteLegacyAddress = function (a) {
  assert(a, 'Error: address needed');
  if (this.containsLegacyAddress(a)) {
    delete this._addresses[a.address];
    MyWallet.syncWallet();
    return true;
  }
  return false;
};

// Wallet.prototype.setDefaultPbkdf2Iterations = function () {
//   this._pbkdf2_iterations = 5000;
//   MyWallet.syncWallet();
//   return this;
// };

Wallet.prototype.validateSecondPassword = function (inputString) {
  if (!this._pbkdf2_iterations) {
    var passHash1 = WalletCrypto.hashNTimes(this._sharedKey + inputString, 1);
    var passHash10 = WalletCrypto.hashNTimes(this._sharedKey + inputString, 10);
    switch (this._dpasswordhash) {
      case passHash1:
        this._pbkdf2_iterations = 1;
        break;
      case passHash10:
        this._pbkdf2_iterations = 10;
        break;
      default:
        var err = 'UNKNOWN_SEC_PASS_PBKDF_ITERATIONS';
        throw err;
    }
  }
  var it = this._pbkdf2_iterations;
  var passwordHash = WalletCrypto.hashNTimes(this._sharedKey + inputString, it);
  return passwordHash === this._dpasswordhash;
};

Wallet.prototype.encrypt = function (pw, success, error, encrypting, syncing) {
  encrypting && encrypting();
  try {
    if (!this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, 'enc');
      var f = function (element) { element.encrypt(g); };
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
    } else {
      // already encrypted
      return this;
    }
  } catch (e) {
    console.log('wallet encryption failure');
    error && error(e);
    return false;
  }
  // if encryption finished well, then save
  this._dpasswordhash = WalletCrypto.hashNTimes(this._sharedKey + pw, this._pbkdf2_iterations);
  this._double_encryption = true;
  var p = function (element) { element.persist(); };
  this.keys.forEach(p);
  this._hd_wallets.forEach(p);
  syncing && syncing();
  if (success) {
    MyWallet.syncWallet(success.bind(undefined, this));
  } else {
    MyWallet.syncWallet();
  }
  return this;
};

Wallet.prototype.decrypt = function (pw, success, error, decrypting, syncing) {
  decrypting && decrypting();
  try {
    if (this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, 'dec');
      var f = function (element) { element.decrypt(g); };
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
    } else {
      // already decrypted
      return this;
    }
  } catch (e) {
    console.log('wallet decryption failure');
    error && error(e);
    return false;
  }
  // if encryption finished well, then save
  this._dpasswordhash = undefined;
  this._double_encryption = false;
  var p = function (element) { element.persist(); };
  this.keys.forEach(p);
  this._hd_wallets.forEach(p);
  syncing && syncing();
  if (success) {
    MyWallet.syncWallet(success.bind(undefined, this));
  } else {
    MyWallet.syncWallet();
  }
  return this;
};

Wallet.reviver = function (k, v) {
  if (k === '') { return new Wallet(v); }
  return v;
};

function isAccountNonUsed (account, progress) {
  var isNonUsed = function (obj) {
    var result = obj[account.extendedPublicKey];
    progress && progress(result);
    return result.total_received === 0;
  };
  return API.getBalances([account.extendedPublicKey]).then(isNonUsed);
}

Wallet.prototype.scanBip44 = function (secondPassword, progress) {
  var self = this;
  var accountIndex = 1;
  var AccountsGap = 10;
  isAccountNonUsed(self.hdwallet._accounts[0], progress);

  var untilNEmptyAccounts = function (n) {
    var go = function (nonused) {
      return untilNEmptyAccounts(nonused ? n - 1 : AccountsGap);
    };
    if (n === 0) {
      self.hdwallet._accounts.splice(-AccountsGap);
      return true;
    } else {
      accountIndex++;
      var account = self.newAccount('My Bitcoin Wallet ' + accountIndex.toString(), secondPassword, 0, undefined, true);
      return isAccountNonUsed(account, progress).then(go);
    }
  };

  return untilNEmptyAccounts(AccountsGap);
};

// Enables email notifications for receiving bitcoins. Only for imported
// and labeled HD addresses.
Wallet.prototype.enableNotifications = function (success, error) {
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');
  BlockchainSettingsAPI.enableEmailReceiveNotifications(success, error);
};

Wallet.prototype.disableNotifications = function (success, error) {
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');
  BlockchainSettingsAPI.disableAllNotifications(success, error);
};

// creating a new wallet object
Wallet.new = function (guid, sharedKey, mnemonic, bip39Password, firstAccountLabel, success, error) {
  assert(mnemonic, 'BIP 39 mnemonic required');

  var object = {
    guid: guid,
    sharedKey: sharedKey,
    double_encryption: false,
    options: constants.getDefaultWalletOptions()
  };
  MyWallet.wallet = new Wallet(object);
  var label = firstAccountLabel || 'My Bitcoin Wallet';
  try {
    var hd = HDWallet.new(mnemonic, bip39Password);
    MyWallet.wallet._hd_wallets.push(hd);
    hd.newAccount(label);
  } catch (e) { error(e); return; }
  success(MyWallet.wallet);
};

// Adds an HD wallet to an existing wallet, used by frontend and iOs
Wallet.prototype.upgradeToV3 = function (firstAccountLabel, pw, success, error) {
  var encoder = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, 'enc');
  try {
    var mnemonic = BIP39.generateMnemonic(undefined, RNG.run.bind(RNG));
    var hd = HDWallet.new(mnemonic, undefined, encoder);
  } catch (e) { error(e); return; }
  this._hd_wallets.push(hd);
  var label = firstAccountLabel || 'My Bitcoin Wallet';
  this.newAccount(label, pw, this._hd_wallets.length - 1, true);
  this.loadMetadata();
  MyWallet.syncWallet(function (res) {
    success();
  }, error);

  return hd;
};

Wallet.prototype.newAccount = function (label, pw, hdwalletIndex, success, nosave) {
  if (!this.isUpgradedToHD) { return false; }
  var index = Helpers.isPositiveInteger(hdwalletIndex) ? hdwalletIndex : 0;
  var cipher;
  if (this.isDoubleEncrypted) {
    cipher = WalletCrypto.cipherFunction.bind(undefined, pw, this._sharedKey, this._pbkdf2_iterations);
  }
  var newAccount = this._hd_wallets[index].newAccount(label, cipher).lastAccount;
  try { // MyWallet.ws.send can fail when restoring from mnemonic because it is not initialized.
    MyWallet.ws.send(MyWallet.ws.msgXPUBSub(newAccount.extendedPublicKey));
  } catch (e) {}
  if (!(nosave === true)) MyWallet.syncWallet();
  typeof (success) === 'function' && success();
  return newAccount;
};

Wallet.prototype.getAddressBookLabel = function (address) {
  return this._address_book[address];
};

Wallet.prototype.addAddressBookEntry = function (address, label) {
  this._address_book[address] = label;
  MyWallet.syncWallet();
};

Wallet.prototype.removeAddressBookEntry = function (address) {
  delete this._address_book[address];
  MyWallet.syncWallet();
};

Wallet.prototype.getNote = function (txHash) {
  return this._tx_notes[txHash];
};

Wallet.prototype.setNote = function (txHash, text) {
  assert(text, 'Error: note must have message text');
  this._tx_notes[txHash] = text;
  MyWallet.syncWallet();
};

Wallet.prototype.deleteNote = function (txHash) {
  delete this._tx_notes[txHash];
  MyWallet.syncWallet();
};

Wallet.prototype.getMnemonic = function (password) {
  var seedHex = this.isDoubleEncrypted
      ? WalletCrypto.decryptSecretWithSecondPassword(this.hdwallet.seedHex, password, this.sharedKey, this.pbkdf2_iterations)
      : this.hdwallet.seedHex;
  return BIP39.entropyToMnemonic(seedHex);
};

Wallet.prototype.changePbkdf2Iterations = function (newIterations, password) {
  assert(Helpers.isPositiveInteger(newIterations), 'wallet.pbkdf2_iterations must be a positive integer');
  if (newIterations !== this._pbkdf2_iterations) {
    if (this.isDoubleEncrypted) {
      this.decrypt(password);
      this._pbkdf2_iterations = newIterations;         // sec pass iterations
      WalletStore.setPbkdf2Iterations(newIterations);  // main pass iterations
      this.encrypt(password);
    } else { // no double encrypted wallet
      this._pbkdf2_iterations = newIterations;        // sec pass iterations
      WalletStore.setPbkdf2Iterations(newIterations); // main pass iterations
      MyWallet.syncWallet();
    }
  }
  return true;
};

Wallet.prototype.getPrivateKeyForAddress = function (address, secondPassword) {
  assert(address, 'Error: address must be defined');
  var pk = null;
  if (!address.isWatchOnly) {
    pk = this.isDoubleEncrypted
        ? WalletCrypto.decryptSecretWithSecondPassword(address.priv, secondPassword, this.sharedKey, this.pbkdf2_iterations)
        : address.priv;
  }
  return pk;
};

Wallet.prototype.getWIFForAddress = function (address, secondPassword) {
  assert(address, 'Error: address must be defined');
  var pkString = this.getPrivateKeyForAddress(address, secondPassword);
  if (pkString != null) {
    var key = Helpers.privateKeyStringToKey(pkString, 'base58');
    if (key.getAddress() !== address.address) {
      key.compressed = !key.compressed;
    }
    return key.toWIF();
  } else {
    return null;
  }
};
Wallet.prototype._getPrivateKey = function (accountIndex, path, secondPassword) {
  assert(this.hdwallet.isValidAccountIndex(accountIndex), 'Error: account non-existent');
  assert(Helpers.isString(path), 'Error: path must be an string of the form \'M/0/27\'');
  var maybeXpriv = this.hdwallet.accounts[accountIndex].extendedPrivateKey;
  var xpriv = this.isDoubleEncrypted
      ? WalletCrypto.decryptSecretWithSecondPassword(maybeXpriv, secondPassword, this.sharedKey, this.pbkdf2_iterations)
      : maybeXpriv;
  var kr = new KeyRing(xpriv, null);
  return kr.privateKeyFromPath(path).keyPair.toWIF();
};

Wallet.prototype.fetchAccountInfo = function () {
  var parentThis = this;
  return BlockchainSettingsAPI.fetchAccountInfo().then(function (info) {
    parentThis._accountInfo = new AccountInfo(info);
    return info; // TODO: handle more here instead of in the frontend / iOs
  });
};

Wallet.prototype.metadata = function (typeId) {
  var masterhdnode = this.hdwallet.getMasterHDNode();
  return Metadata.fromMasterHDNode(masterhdnode, typeId);
};

// This sets:
// * wallet.external (buy-sell, KV Store type 3)
// * wallet.labels (not yet using KV Store)
Wallet.prototype.loadMetadata = function (optionalPayloads, magicHashes) {
  optionalPayloads = optionalPayloads || {};

  var self = this;

  var fetchExternal = function () {
    var success = function (external) {
      self._external = external;
    };

    var error = function (message) {
      console.warn('wallet.external not set:', message);
      self._external = null;
      return Promise.resolve();
    };

    if (optionalPayloads.external) {
      return External.fromJSON(this, optionalPayloads.external, magicHashes.external).then(success);
    } else {
      return External.fetch(this).then(success).catch(error);
    }
  };

  var fetchLabels = function () {
    this._labels = new Labels(this, MyWallet.syncWallet);
    return Promise.resolve();
  };

  let promises = [];

  if (this.isMetadataReady) {
    // No fallback is metadata is disabled
    promises.push(fetchExternal.call(this));
  }

  // Labels only works for v3 wallets
  if (this.isUpgradedToHD) {
    // Labels currently don't use the KV Store, so this should never fail.
    promises.push(fetchLabels.call(this));
  }

  return Promise.all(promises);
};

Wallet.prototype.incStats = function () {
  API.incrementSecPassStats(this.isDoubleEncrypted);
  return true;
};

Wallet.prototype.saveGUIDtoMetadata = function () {
  var setOrCheckGuid = function (res) {
    if (res === null) {
      return m.create({ guid: MyWallet.wallet.guid });
    } else if (!res || !res.guid || res.guid !== MyWallet.wallet.guid) {
      return Promise.reject();
    } else {
      return res.guid;
    }
  };

  if (this.isMetadataReady) {
    var GUID_METADATA_TYPE = 0;
    var m = this.metadata(GUID_METADATA_TYPE);
    return m.fetch().then(setOrCheckGuid);
  } else {
    return Promise.reject();
  }
};

Wallet.prototype.createPayment = function (initialState) {
  return new Payment(this, initialState);
};

Wallet.prototype.cacheMetadataKey = function (secondPassword) {
  if (!secondPassword) { return Promise.reject('second password needed'); }
  if (!this.validateSecondPassword(secondPassword)) { return Promise.reject('wrong second password'); }
  var cipher = WalletCrypto.cipherFunction.bind(undefined, secondPassword, this._sharedKey, this._pbkdf2_iterations);
  this._metadataHDNode = Metadata.deriveMetadataNode(this.hdwallet.getMasterHDNode(cipher));
  MyWallet.syncWallet();
  return Promise.resolve();
};
