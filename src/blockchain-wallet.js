'use strict';

module.exports = Wallet;

////////////////////////////////////////////////////////////////////////////////
// dependencies
var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var ECKey = Bitcoin.ECKey;
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDWallet = require('./hd-wallet');
var HDAccount = require('./hd-account');
var Address = require('./address');
var Helpers = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var ImportExport = require('./import-export');
var API = require('./api');
var Tx = require('./wallet-transaction');
var shared = require('./shared');
var BlockchainSettingsAPI = require('./blockchain-settings-api');
var KeyRing  = require('./keyring');
var Analytics = require('./analytics');

////////////////////////////////////////////////////////////////////////////////
// Wallet

function Wallet(object) {

  var obj        = object || {};
  obj.options    = obj.options || {};
  obj.keys       = obj.keys || [];
  obj.hd_wallets = obj.hd_wallets || [];

  this._guid              = obj.guid;
  this._sharedKey         = obj.sharedKey;
  this._double_encryption = obj.double_encryption || false;
  this._dpasswordhash     = obj.dpasswordhash;
  //options
  this._pbkdf2_iterations        = obj.options.pbkdf2_iterations;
  this._fee_per_kb               = obj.options.fee_per_kb == null ? 10000 : obj.options.fee_per_kb;
  this._html5_notifications      = obj.options.html5_notifications;
  this._logout_time              = obj.options.logout_time;

  // legacy addresses list
  this._addresses = obj.keys ? obj.keys.reduce(Address.factory, {}) : undefined;
  // hdwallets list
  this._hd_wallets = obj.hd_wallets ? obj.hd_wallets.map(HDWallet.factory) : undefined;

  // paidTo dictionary
  this._paidTo = obj.paidTo || {};
  if (this.isUpgradedToHD){
    Helpers.merge(this._paidTo, this.hdwallet._paidTo); // move paidTo from the wrong place
    delete this.hdwallet._paidTo;
  };

  // address book list
  // address book in json is [{address: "address1", label: "label1"} , ... ]
  // address book in memory is {address1: "label1", address2: "label2"}
  this._address_book = obj.address_book ?
    obj.address_book.reduce(function(o,a){
                              var address = a.address || a.addr;
                              o[address] = a.label;
                              return o;
                            }, {}) : {};

  // tx_notes dictionary
  this._tx_notes = obj.tx_notes || {};

  // tx_tags list (not sure if list or object)
  // this._tx_tags = obj.tx_tags || [];

  // tag_names list (check how is represented each tag-name)
  this._tx_names = obj.tx_names || [];

  // fetched data from the server
  this._totalSent       = 0;
  this._totalReceived   = 0;
  this._finalBalance    = 0;
  this._numberTxTotal   = 0;
  this._numberTxFetched = 0;
  this._txPerScroll     = 50;
}

Object.defineProperties(Wallet.prototype, {
  "guid": {
    configurable: false,
    get: function() { return this._guid;}
  },
  "sharedKey": {
    configurable: false,
    get: function() { return this._sharedKey;}
  },
  "isDoubleEncrypted": {
    configurable: false,
    get: function() { return this._double_encryption;}
  },
  "dpasswordhash": {
    configurable: false,
    get: function() { return this._dpasswordhash;}
  },
  "fee_per_kb": {
    configurable: false,
    get: function() { return this._fee_per_kb;},
    set: function(value) {
      switch (true) {
        case !Helpers.isNumber(value):
          throw 'Error: wallet.fee_per_kb must be a number';
          break;
        case value > 1000000:  // 0.01 btc
          throw 'Error: wallet.fee_per_kb too high (0.01 btc limit)';
          break;
        default:
          this._fee_per_kb = value;
          MyWallet.syncWallet();
      };
    }
  },
  "pbkdf2_iterations": {
    configurable: false,
    get: function() { return this._pbkdf2_iterations;}
  },
  "totalSent": {
    configurable: false,
    get: function() { return this._totalSent;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._totalSent = value;
      else
        throw 'Error: wallet.totalSent must be a number';
    }
  },
  "totalReceived": {
    configurable: false,
    get: function() { return this._totalReceived;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._totalReceived = value;
      else
        throw 'Error: wallet.totalReceived must be a number';
    }
  },
  "finalBalance": {
    configurable: false,
    get: function() { return this._finalBalance;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._finalBalance = value;
      else
        throw 'Error: wallet.finalBalance must be a number';
    }
  },
  "numberTxTotal": {
    configurable: false,
    get: function() { return this._numberTxTotal;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._numberTxTotal = value;
      else
        throw 'Error: wallet.numberTx must be a number';
    }
  },
  "numberTxFetched": {
    configurable: false,
    get: function() { return this._numberTxFetched;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._numberTxFetched = value;
      else
        throw 'Error: wallet.numberTxFetched must be a number';
    }
  },
  "txPerScroll": {
    configurable: false,
    get: function() { return this._txPerScroll;}
  },
  "addresses": {
    configurable: false,
    get: function(){return Object.keys(this._addresses);}
  },
  "activeAddresses": {
    configurable: false,
    get: function(){return this.activeKeys.map(function(k){return k.address;});}
  },
  "spendableActiveAddresses": {
    configurable: false,
    get: function(){return this.activeKeys
                        .filter(function(k){return !k.isWatchOnly;})
                          .map(function(k){return k.address;});}
  },
  "key": {
    configurable: false,
    value: function(addr) {return this._addresses[addr];}
  },
  "activeKey": {
    configurable: false,
    value: function(addr) {
      var k = this._addresses[addr];
      var r = !k || k.archived ? null : k;
      return r;
    }
  },
  "keys": {
    configurable: false,
    get: function() {
      var that = this;
      return that.addresses.map(function(a){return that.key(a)});
    }
  },
  "activeKeys": {
    configurable: false,
    get: function(){return this.keys.filter(function(a){return !a.archived;})}
  },
  "hdwallet": {
    configurable: false,
    get: function() {return this._hd_wallets[0];}
  },
  "isUpgradedToHD":{
    configurable: false,
    get: function() {
      return !(this._hd_wallets == null || this._hd_wallets.length === 0);
    }
  },
  "isEncryptionConsistent":{
    configurable: false,
    get: function() {
      var operation = undefined;
      if (this.isDoubleEncrypted) {
        operation = function(k){return k.isEncrypted;}
      }
      else { // no double encryption activated
        operation = function(k){return k.isUnEncrypted;}
      }
      var A = this.keys.filter(function(k){return !k.isWatchOnly;})
                       .map(operation)
                       .reduce(Helpers.and, true);
      var W = this._hd_wallets.map(operation)
                              .reduce(Helpers.and, true);
      return A && W;
    }
  },
  "balanceActiveLegacy":{
    configurable: false,
    get: function() {
      return this.activeKeys
                 .map(function(k){return k.balance;})
                 .reduce(Helpers.add, 0);
    }
  },
  "balanceActiveAccounts":{
    configurable: false,
    get: function() {
      return this.hdwallet.accounts
                 .filter(function(a){return !a.archived;})
                 .map(function(a){return a.balance;})
                 .reduce(Helpers.add, 0);
    }
  },
  "balanceActive":{
    configurable: false,
    get: function() {
      return this.balanceActiveLegacy + this.balanceActiveAccounts;
    }
  },
  "balanceSpendableActive":{
    configurable: false,
    get: function() {
      if (this.isUpgradedToHD) {
        return this.balanceSpendableActiveLegacy + this.balanceActiveAccounts;
      } else {
        return this.balanceSpendableActiveLegacy;
      }
    }
  },
  "balanceSpendableActiveLegacy":{
    configurable: false,
    get: function() {
      return this.activeKeys
                 .filter(function(k){return !k.isWatchOnly;})
                 .map(function(k){return k.balance;})
                 .reduce(Helpers.add, 0);
    }
  },
  "addressBook":{
    configurable: false,
    get: function() { return this._address_book;}
  },
  "defaultPbkdf2Iterations":{
    configurable: false,
    get: function(){return 5000;}
  },
  "logoutTime":{
    configurable: false,
    get: function() { return this._logout_time; },
    set: function(t) {
      if (Helpers.isNumber(t) && Helpers.isInRange(t, 60000, 86400001)) {
        this._logout_time = t;
        MyWallet.syncWallet();
      } else {
        throw "Error: wallet.logoutTime must be a number in range 60000,86400001";
      }
    }
  }
});

////////////////////////////////////////////////////////////////////////////////
// update-wallet-balances after multiaddr call
Wallet.prototype._updateWalletInfo = function(obj) {

  // delete all transactions stored
  var transactions = WalletStore.getTransactions();
  transactions.length = 0;

  if (obj.info) {
    if (obj.info.symbol_local)
      shared.setLocalSymbol(obj.info.symbol_local);
    if (obj.info.symbol_btc)
      shared.setBTCSymbol(obj.info.symbol_btc);
    if (obj.info.notice)
      WalletStore.sendEvent("msg", {type: "error", message: obj.info.notice});
  }

  if (obj.wallet == null) {
    this.totalSent       = 0;
    this.totalReceived   = 0;
    this.finalBalance    = 0;
    this.numberTxTotal   = 0;
    this.numberTxFetched = 0;
    return true;
  };

  this.totalSent     = obj.wallet.total_sent;
  this.totalReceived = obj.wallet.total_received;
  this.finalBalance  = obj.wallet.final_balance;
  this.numberTxTotal = obj.wallet.n_tx;

  var updateAccountAndAddressesInfo = function (e) {
    if (this.isUpgradedToHD) {
      var account = this.hdwallet.activeAccount(e.address);
      if (account){
        account.balance      = e.final_balance;
        account.n_tx         = e.n_tx;
        account.lastUsedReceiveIndex = e.account_index;
        account.receiveIndex = Math.max(account.lastUsedReceiveIndex, account.maxLabeledReceiveIndex);

        account.changeIndex  = e.change_index;

        if (account.getLabelForReceivingAddress(account.receiveIndex)) {
          account.incrementReceiveIndex();
        };
      };
    }
    var address = this.activeKey(e.address);
    if (address){
      address.balance       = e.final_balance;
      address.totalReceived = e.total_received;
      address.totalSent     = e.total_sent;
    };
  };

  obj.addresses.forEach(updateAccountAndAddressesInfo.bind(this));

  this.numberTxFetched += obj.txs.length;
  for (var i = 0; i < obj.txs.length; ++i) {
    var tx = shared.TransactionFromJSON(obj.txs[i]);
    WalletStore.pushTransaction(tx);
  }

  if (obj.info.latest_block)
    WalletStore.setLatestBlock(obj.info.latest_block);

  WalletStore.sendEvent('did_multiaddr');

  return true;
};

// equivalent to MyWallet.get_history(success, error) but returning a promise
Wallet.prototype.getHistory = function() {
  var allAddresses = this.activeAddresses;
  if (this.isUpgradedToHD) {
    this.hdwallet.accounts.forEach(
      function(account){ allAddresses.push(account.extendedPublicKey);}
    );
  }
  // TODO: obtain paidTo addresses too
  var promise = API.getHistory(allAddresses, 0 ,0, 50).then(this._updateWalletInfo.bind(this));
  return promise;
};

Wallet.prototype.fetchMoreTransactions = function(didFetchOldestTransaction) {
  var xpubs = this.isUpgradedToHD ? this.hdwallet.activeXpubs : [];
  var list = this.activeAddresses.concat(xpubs);
  var txListP = API.getHistory(list, null, this.numberTxFetched, this.txPerScroll);
  function processTxs(data) {
    var pTx = data.txs.map(MyWallet.processTransaction.compose(shared.TransactionFromJSON));
    this.numberTxFetched += pTx.length;
    if (pTx.length < this.txPerScroll) { didFetchOldestTransaction(); }
    return pTx;
  };
  return txListP.then(processTxs.bind(this));
};

Wallet.prototype.ask100TxTest = function(){
  var context = this.activeAddresses.concat(this.hdwallet.activeXpubs);
  var txListP = API.getHistory(context, null, 0, 100);
  function processTxs(data) { return data.txs.map(Tx.factory);};
  return txListP.then(processTxs);
};
////////////////////////////////////////////////////////////////////////////////

Wallet.prototype.getBalancesForArchived = function() {
  var updateBalance = function(key){
    if (this.containsLegacyAddress(key.address)) {
      this.key(key.address).balance = key.final_balance;
    }
  };
  var updateBalances = function(obj) {
    obj.addresses.forEach(updateBalance.bind(this));
    return obj;
  };
  var archivedAddrs = this.addresses.filter(function (addr) {
      return MyWallet.wallet.key(addr).archived === true;
  });
  var promise = API.getHistory(archivedAddrs, 0 ,0, 1).then(updateBalances.bind(this));
  return promise;
};
////////////////////////////////////////////////////////////////////////////////
Wallet.prototype.toJSON = function(){

  function addressBookToJSON (addressBook) {
    return Object.keys(addressBook)
             .map(function(a){ return {addr: a, label: addressBook[a]};});
  };

  var wallet = {
    guid              : this.guid,
    sharedKey         : this.sharedKey,
    double_encryption : this.isDoubleEncrypted,
    dpasswordhash     : this.dpasswordhash,
    options           : {
      pbkdf2_iterations        : this.pbkdf2_iterations,
      fee_per_kb               : this.fee_per_kb,
      html5_notifications      : this._html5_notifications,
      logout_time              : this._logout_time
    },
    address_book      : addressBookToJSON(this._address_book),
    tx_notes          : this._tx_notes,
    // tx_tags           : this._tx_tags,
    tx_names          : this._tx_names,
    keys              : this.keys,
    paidTo            : this._paidTo,
    hd_wallets        : Helpers.isEmptyArray(this._hd_wallets) ? undefined : this._hd_wallets
  };
  return wallet;
};

Wallet.prototype.addKeyToLegacyAddress = function (privateKey, addr, secPass, bipPass) {

  var modifyAddress = function (newKey) {
    var watchOnlyKey = this._addresses[addr];
    if (newKey.address !== watchOnlyKey.address) {
      throw 'addressDoesNotMatchWithTheKey'
    }
    watchOnlyKey._priv = newKey._priv;
    if (this.isDoubleEncrypted) {
      if (!secPass) {throw 'Error: second password needed';}
      if (!this.validateSecondPassword(secPass)) { throw 'Error: wrong second password';}
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
    return Address.fromString(privateKey, null, bipPass).then(modifyAddress)
  }
};

Wallet.prototype.importLegacyAddress = function (addr, label, secPass, bipPass) {
  var importAddress = function (ad) {
    if (this.containsLegacyAddress(ad)) {
      throw 'presentInWallet';
    }
    if (this.isDoubleEncrypted) {
      if (!secPass) {throw 'Error: second password needed';}
      if (!this.validateSecondPassword(secPass)) {throw 'Error: wrong second password';}
      var cipher = WalletCrypto.cipherFunction(secPass, this._sharedKey, this._pbkdf2_iterations, 'enc');
      ad.encrypt(cipher).persist();
    }
    this._addresses[ad.address] = ad;
    MyWallet.ws.send('{"op":"addr_sub", "addr":"' + ad.address + '"}');
    MyWallet.syncWallet();
    this.getHistory();
    return ad;
  }.bind(this);

  return Address.fromString(addr, label, bipPass).then(importAddress)
};

Wallet.prototype.containsLegacyAddress = function(address) {
  if(Helpers.isInstanceOf(address, Address)) address = address.address;
  return this._addresses.hasOwnProperty(address);
}

Wallet.prototype.newLegacyAddress = function(label, pw, success, error){
  try {
    // This method might throw if the RNG fails:
    var ad = Address.new(label);
  } catch (e) {
    error(e);
    return;
  }
  if (this.isDoubleEncrypted) {
    assert(pw, "Error: second password needed");
    var cipher = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
    ad.encrypt(cipher).persist();
  };
  this._addresses[ad.address] = ad;
  MyWallet.syncWallet(success, error);
  return ad;
};

Wallet.prototype.deleteLegacyAddress = function(a){
  assert(a, "Error: address needed");
  if (typeof this._addresses === 'object') {
    delete this._addresses[a.address];
    MyWallet.syncWallet();
    return true;
  }
  return false;
};

// Wallet.prototype.setDefaultPbkdf2Iterations = function(){
//   this._pbkdf2_iterations = 5000;
//   MyWallet.syncWallet();
//   return this;
// };

Wallet.prototype.validateSecondPassword = function(inputString) {

  // old wallets default_iterations is 10
  var it = !this._pbkdf2_iterations ? 10 : this._pbkdf2_iterations;
  var password_hash = WalletCrypto.hashNTimes(this._sharedKey + inputString, it);
  return password_hash === this._dpasswordhash;
};

Wallet.prototype.encrypt = function(pw, success, error, encrypting, syncing){
  encrypting && encrypting();
  try {
    if (!this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
      var f = function(element) {element.encrypt(g);};
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
    }
    else {
      // already encrypted
      return this;
    };
  }
  catch (e){
    console.log("wallet encryption failure");
    error && error(e);
    return false;
  };
  // if encryption finished well, then save
  this._dpasswordhash = WalletCrypto.hashNTimes(this._sharedKey + pw, this._pbkdf2_iterations);
  this._double_encryption = true;
  var p = function(element) {element.persist();};
  this.keys.forEach(p);
  this._hd_wallets.forEach(p);
  syncing && syncing();
  if (success) { MyWallet.syncWallet(success.bind(undefined, this));}
  else {MyWallet.syncWallet();};
  return this;
};

Wallet.prototype.decrypt = function(pw, success, error, decrypting, syncing){
  decrypting && decrypting();
  try {
    if (this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "dec");
      var f = function(element) {element.decrypt(g);};
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
    }
    else {
      // already decrypted
      return this;
    };
  }
  catch (e){
    console.log("wallet decryption failure");
    error && error(e);
    return false;
  };
  // if encryption finished well, then save
  this._dpasswordhash     = undefined;
  this._double_encryption = false;
  var p = function(element) {element.persist();};
  this.keys.forEach(p);
  this._hd_wallets.forEach(p);
  syncing && syncing();
  if (success) { MyWallet.syncWallet(success.bind(undefined, this));}
  else {MyWallet.syncWallet();};
  return this;
};

Wallet.reviver = function(k,v){
  if (k === '') return new Wallet(v);
  return v;
}

function isAccountNonUsed (account, progress) {
  var isNonUsed = function(obj){
    if (progress) { progress(obj);}
    return obj.addresses[0].account_index === 0 && obj.addresses[0].change_index === 0;
  };
  return API.getHistory([account.extendedPublicKey], 0, 0, 50).then(isNonUsed);
};

Wallet.prototype.restoreHDWallet = function(mnemonic, bip39Password, pw, startedRestoreHDWallet, progress){
  // wallet restoration
  startedRestoreHDWallet && startedRestoreHDWallet;
  var self = this;
  var seedHex = BIP39.mnemonicToEntropy(mnemonic);
  var pass39  = Helpers.isString(bip39Password) ? bip39Password : "";
  var encoder = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
  var newHDwallet = HDWallet.restore(seedHex, pass39, encoder);
  this._hd_wallets[0] = newHDwallet;
  var account = this.newAccount("My Bitcoin Wallet 1", pw, 0, undefined, true);
  API.getHistory([account.extendedPublicKey], 0, 0, 50).then(progress);
  var accountIndex  = 1;
  var AccountsGap = 10;

  var untilNEmptyAccounts = function(n){
    var go = function(nonused) {
      if (nonused) { return untilNEmptyAccounts(n-1);}
      else { return untilNEmptyAccounts(AccountsGap);};
    };
    if (n === 0) {
      self.hdwallet._accounts.splice(-AccountsGap);
      return true;
    } else{
      accountIndex++;
      account = self.newAccount("My Bitcoin Wallet " + accountIndex.toString(), pw, 0, undefined, true);
      return isAccountNonUsed(account, progress).then(go);
    };
  };

  var saveAndReturn = function (){
    return new Promise(MyWallet.syncWallet);
  };

  // it returns a promise of the newHDWallet
  return untilNEmptyAccounts(AccountsGap)
    .then(saveAndReturn)
};

// Enables email notifications for receiving bitcoins. Only for imported
// and labeled HD addresses.
Wallet.prototype.enableNotifications = function(success, error) {
  assert(success, "Success callback required");
  assert(error, "Error callback required");

  BlockchainSettingsAPI.enableEmailReceiveNotifications(
    function() {
      WalletStore.setSyncPubKeys(true);
      MyWallet.syncWallet();
      success();
    },
    function() {
      error();
    }
  )
}

Wallet.prototype.disableNotifications = function(success, error) {
  assert(success, "Success callback required");
  assert(error, "Error callback required");

  BlockchainSettingsAPI.disableAllNotifications(
    function() {
      WalletStore.setSyncPubKeys(false);
      MyWallet.syncWallet();
      success();
    },
    function() {
      error();
    }
  );

}

// creating a new wallet object
Wallet.new = function(guid, sharedKey, firstAccountLabel, success, error, isHD){
  isHD = Helpers.isBoolean(isHD) ? isHD : true;
  var object = {
    guid              : guid,
    sharedKey         : sharedKey,
    double_encryption : false,
    options: {
      pbkdf2_iterations  : 5000,
      html5_notifications: false,
      fee_per_kb         : 10000,
      logout_time        : 600000
    }
  };
  MyWallet.wallet = new Wallet(object);
  var label = firstAccountLabel ||  "My Bitcoin Wallet";
  try {
    // wallet or address generation could fail because of the RNG
    if (isHD) {
      // hd wallet
      var newHDwallet = HDWallet.new();
      MyWallet.wallet._hd_wallets.push(newHDwallet);
      newHDwallet.newAccount(label);
    } else {
      // legacy wallet (generate address)
      var ad = Address.new(label);
      MyWallet.wallet._addresses[ad.address] = ad;
    };
  } catch (e) { error(e); return; }
  success(MyWallet.wallet);
};

// adding and hd wallet to an existing wallet, used by frontend and iOs
Wallet.prototype.newHDWallet = function(firstAccountLabel, pw, success, error){
  var encoder = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
  try {
    var newHDwallet = HDWallet.new(encoder);
  } catch (e) { error(e); return; }
  this._hd_wallets.push(newHDwallet);
  var label = firstAccountLabel ? firstAccountLabel : "My Bitcoin Wallet";
  var account = this.newAccount(label, pw, this._hd_wallets.length-1, true);
  var guid = this.guid;
  MyWallet.syncWallet(function(res) {
    Analytics.walletUpgraded(guid);
    success();
  }, error);

  return newHDwallet;
};

Wallet.prototype.newAccount = function(label, pw, hdwalletIndex, success, nosave){
  if (!this.isUpgradedToHD) { return false; };
  var index = Helpers.isNumber(hdwalletIndex) ? hdwalletIndex : 0;
  var cipher = undefined;
  if (this.isDoubleEncrypted) {
    cipher = WalletCrypto.cipherFunction.bind(undefined, pw, this._sharedKey, this._pbkdf2_iterations);
  };
  var newAccount = this._hd_wallets[index].newAccount(label, cipher).lastAccount;
  MyWallet.listenToHDWalletAccount(newAccount.extendedPublicKey);
  if(!(nosave === true)) MyWallet.syncWallet();
  typeof(success) === 'function' && success();
  return newAccount;
};

Wallet.prototype.getPaidTo = function(txHash){
  return this._paidTo[txHash];
};

Wallet.prototype.getAddressBookLabel = function(address){
  return this._address_book[address];
};

Wallet.prototype.addAddressBookEntry = function(address, label){
  this._address_book[address] = label;
  MyWallet.syncWallet();
};

Wallet.prototype.removeAddressBookEntry = function(address){
  delete this._address_book[address];
  MyWallet.syncWallet();
};

Wallet.prototype.getNote = function(txHash){
  return this._tx_notes[txHash];
};

Wallet.prototype.setNote = function(txHash, text){
  assert(text, 'Error: note must have message text')
  this._tx_notes[txHash] = text;
  MyWallet.syncWallet();
};

Wallet.prototype.deleteNote = function(txHash){
  delete this._tx_notes[txHash];
  MyWallet.syncWallet();
};

Wallet.prototype.getMnemonic = function(password){
  var seedHex = this.isDoubleEncrypted ?
    WalletCrypto.decryptSecretWithSecondPassword(
      this.hdwallet.seedHex, password, this.sharedKey, this.pbkdf2_iterations) : this.hdwallet.seedHex;
  return BIP39.entropyToMnemonic(seedHex);
};

Wallet.prototype.changePbkdf2Iterations = function(newIterations, password){
  assert(Helpers.isNumber(newIterations), "wallet.pbkdf2_iterations must be a number");
  if (newIterations !== this._pbkdf2_iterations) {
    if (this.isDoubleEncrypted) {
      this.decrypt(password);
      this._pbkdf2_iterations = newIterations;         // sec pass iterations
      WalletStore.setPbkdf2Iterations(newIterations);  // main pass iterations
      this.encrypt(password);
    }
    else { // no double encrypted wallet
      this._pbkdf2_iterations = newIterations;        // sec pass iterations
      WalletStore.setPbkdf2Iterations(newIterations); // main pass iterations
      MyWallet.syncWallet();
    };
  };
  return true;
};

Wallet.prototype.getPrivateKeyForAddress = function(address, secondPassword) {
  assert(address, 'Error: address must be defined');
  var pk = null;
  if (!address.isWatchOnly) {
    pk = this.isDoubleEncrypted ?
      WalletCrypto.decryptSecretWithSecondPassword(
        address.priv, secondPassword, this.sharedKey, this.pbkdf2_iterations) : address.priv;
  };
  return pk;
};

Wallet.prototype._getPrivateKey = function(accountIndex, path, secondPassword) {
  assert(this.hdwallet.isValidAccountIndex(accountIndex), "Error: account non-existent");
  assert(Helpers.isString(path), "Error: path must be an string of the form 'M/0/27'");
  var maybeXpriv = this.hdwallet.accounts[accountIndex].extendedPrivateKey;
  var xpriv = this.isDoubleEncrypted ?
    WalletCrypto.decryptSecretWithSecondPassword(
      maybeXpriv , secondPassword, this.sharedKey, this.pbkdf2_iterations) : maybeXpriv;
  var kr = new KeyRing(xpriv, null);
  return kr.privateKeyFromPath(path).toWIF();
};
