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
var RSVP = require('rsvp');

var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDWallet = require('./hd-wallet');
var HDAccount = require('./hd-account');
var Address = require('./address');
var Helpers = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var ImportExport = require('./import-export');

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
  this._fee_policy               = obj.options.fee_policy;
  this._enable_multiple_accounts = obj.options.enable_multiple_accounts;
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
  this._totalSent     = 0;
  this._totalReceived = 0;
  this._finalBalance  = 0;
  this._numberTx      = 0;
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
  "fee_policy": {
    configurable: false,
    get: function() { return this._fee_policy;}
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
  "numberTx": {
    configurable: false,
    get: function() { return this._numberTx;},
    set: function(value) {
      if(Helpers.isNumber(value))
        this._numberTx = value;
      else
        throw 'Error: wallet.numberTx must be a number';
    }
  },
  "addresses": {
    configurable: false,
    get: function(){return Object.keys(this._addresses);}
  },
  "activeAddresses": {
    configurable: false,
    get: function(){return this.activeKeys.map(function(k){return k.address;});}
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
  "isMultipleAccount":{
    configurable: false,
    get: function() {return this._enable_multiple_accounts;}
  },
  "balanceActiveLegacy":{
    configurable: false,
    get: function() {
      return this.activeKeys
               .map(function(k){return k.balance;})
                 .reduce(Helpers.add, 0);
    }
  },
  "addressBook":{
    configurable: false,
    get: function() { return this._address_book;}
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
      fee_policy               : this.fee_policy,
      // enable_multiple_accounts : this.isMultipleAccount,
      html5_notifications      : this._html5_notifications,
      logout_time              : this._logout_time
    },
    address_book      : addressBookToJSON(this._address_book),
    tx_notes          : this._tx_notes,
    // tx_tags           : this._tx_tags,
    tx_names          : this._tx_names,
    keys              : this.keys,
    paidTo            : this._paidTo,
    hd_wallets        : this._hd_wallets
  };
  return wallet;
};

Wallet.prototype.importLegacyAddress = function(addr, label, secPass, bipPass){
  var defer = RSVP.defer();

  var importAddress = (function(key) {
    var ad = Address.import(key, label);
    if (this.containsLegacyAddress(ad)) { defer.reject('presentInWallet'); };
    if (this.double_encryption) {
      assert(secPass, "Error: second password needed");
      ad.encrypt(secPass, this.sharedKey, this.pbkdf2_iterations).persist();
    };
    this._addresses[ad.address] = ad;
    defer.resolve(ad);
    MyWallet.syncWallet();
    MyWallet.get_history();
  }).bind(this)

  if (MyWallet.detectPrivateKeyFormat(addr) === 'bip38') {
    if (bipPass === '') defer.reject('needsBip38');
    else ImportExport.parseBIP38toECKey(
      addr, bipPass,
      function (key) { importAddress(key); },
      function () { defer.reject('wrongBipPass'); },
      function () { defer.reject('importError'); }
    );
  } else {
    importAddress(addr);
  }

  return defer.promise;
};

Wallet.prototype.containsLegacyAddress = function(address) {
  if (address instanceof Address) address = address.address;
  return this._addresses.hasOwnProperty(address);
}

Wallet.prototype.newLegacyAddress = function(label, pw){
  var ad = Address.new(label);
  if (this.double_encryption) {
    assert(pw, "Error: second password needed");
    ad.encrypt(pw, this.sharedKey, this.pbkdf2_iterations).persist();
  };
  this._addresses[ad.address] = ad;
  MyWallet.syncWallet();
  return ad;
};

Wallet.prototype.deleteLegacyAddress = function(a){
  assert(a, "Error: address needed");
  if (typeof this._addresses === 'object') {
    delete this._addresses[a.address];
    MyWallet.syncWallet();
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

Wallet.prototype.encrypt = function(pw, success, error){
  try {
    if (!this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
      var f = function(element) {element.encrypt(g);};
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
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
  MyWallet.syncWallet();
  success && success(this);
  return this;
};

Wallet.prototype.decrypt = function(pw, success, error){
  try {
    if (this.isDoubleEncrypted) {
      var g = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "dec");
      var f = function(element) {element.decrypt(g);};
      this.keys.forEach(f);
      this._hd_wallets.forEach(f);
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
  MyWallet.syncWallet();
  success && success(this)
  return this;
};

// example wallet. This should be the new constructor (ask server data)
Wallet.example = function(){
  var object = {
    guid              : "37f008fe-4456-43b8-8862-d2ac67053f52",
    sharedKey         : "f5c0e85d-b379-4588-ad2b-052360b6e6ec",
    double_encryption : true,
    dpasswordhash     : "9f334a27ba54e317ae351177c5cdb1ec5d1463e7a03ee0da6fb7ae6aada72682",
    options: {
      fee_policy        :  0,
      pbkdf2_iterations : 5000
    }
  };
  return new Wallet(object);
};

Wallet.reviver = function(k,v){

  function reviveHDAccount(o) { return new HDAccount(o);};
  function reviveHDWallet(o)  { return new HDWallet(o);};
  function reviveAddress(o,a) { o[a.address] = new Address(a); return o;};

  if (k === '')
    return new Wallet(v);
  if (k === 'keys')
    return v.reduce(reviveAddress, {})
  if (k === 'hd_wallets')
    return v.map(reviveHDWallet);
  if (k === 'accounts')
    return v.map(reviveHDAccount);

  // default
  return v;
};

Wallet.prototype.restoreHDWallet = function(mnemonic, bip39Password, pw){
  // this should be rethought
  //     1) include failure.
  //     2) not necessary to encrypt while looking for funds in further accounts.
  //     3) progress notification to frontend. (we don't know how many accounts we will find)
  // seedHex computation can fail
  // get_history can fail
  //////////////////////////////////////////////////////////////////////////////
  // wallet restoration
  var seedHex = BIP39.mnemonicToEntropy(mnemonic);
  var pass39  = Helpers.isString(bip39Password) ? bip39Password : "";
  var encoder = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
  var newHDwallet = HDWallet.restore(seedHex, pass39, encoder);
  this._hd_wallets[0] = newHDwallet;
  //////////////////////////////////////////////////////////////////////////////
  // first account creation
  var account       = null;
  account = this.newAccount("Account 1", pw, 0);
  MyWallet.get_history_with_addresses([account.extendedPublicKey]);
  //////////////////////////////////////////////////////////////////////////////
    function isAccountUsed(account, success, error) {
    MyWallet.get_history_with_addresses(
        [account.extendedPublicKey]
      , function(obj){success(obj.addresses[0].account_index === 0 && obj.addresses[0].change_index === 0);}
      , function(){error("get_history_error")}
    );
  };
  //////////////////////////////////////////////////////////////////////////////
  // accounts restoration
  var lookAhead     = true;
  var emptyAccounts = 0;
  var accountIndex  = 1;
  var historyError  = false;

  function ifUsed(used) {
    if (used) { emptyAccounts ++;};
    if (emptyAccounts === 10 ){ lookAhead = false; this.hdwallet._accounts.splice(-10);};
  };
  function ifError() { historyError = true; lookAhead = false;};

  while (lookAhead) {
    accountIndex++;
    account = this.newAccount("Account " + accountIndex.toString(), pw, 0);
    isAccountUsed(account, ifUsed.bind(this), ifError);
  };

  if (historyError) {return false};
  MyWallet.syncWallet();
  return newHDwallet;
};

// creating a new wallet object
Wallet.new = function(guid, sharedKey, firstAccountLabel, success){
  var object = {
    guid              : guid,
    sharedKey         : sharedKey,
    double_encryption : false,
    options: {
      pbkdf2_iterations  : 5000,
      fee_policy         : 0,
      html5_notifications: false,
      logout_time        : 600000
    }
  };
  var newWallet   = new Wallet(object);
  var newHDwallet = HDWallet.new();
  newWallet._hd_wallets.push(newHDwallet);
  var label = firstAccountLabel ? firstAccountLabel : "My Bitcoin Wallet";
  newWallet.newAccount(label, null, newWallet._hd_wallets.length-1);
  MyWallet.wallet = newWallet;
  // MyWallet.syncWallet();
  success(newWallet);
};

// adding and hd wallet to an existing wallet
Wallet.prototype.newHDWallet = function(firstAccountLabel, pw){
  var encoder = WalletCrypto.cipherFunction(pw, this._sharedKey, this._pbkdf2_iterations, "enc");
  var newHDwallet = HDWallet.new(encoder);
  this._hd_wallets.push(newHDwallet);
  var label = firstAccountLabel ? firstAccountLabel : "My Bitcoin Wallet";
  this.newAccount(label, pw, this._hd_wallets.length-1);
  MyWallet.syncWallet();
  return newHDwallet;
};

Wallet.prototype.newAccount = function(label, pw, hdwalletIndex){
  if (!this.isUpgradedToHD) { return false; };
  var index = Helpers.isNumber(hdwalletIndex) ? hdwalletIndex : 0;
  var cipher = undefined;
  if (this.isDoubleEncrypted) {
    cipher = WalletCrypto.cipherFunction.bind(undefined, pw, this._sharedKey, this._pbkdf2_iterations);
  };
  var newAccount = this._hd_wallets[index].newAccount(label, cipher).lastAccount;
  MyWallet.listenToHDWalletAccount(newAccount.extendedPublicKey);
  MyWallet.syncWallet();
  return newAccount;
};

Wallet.prototype.getPaidTo = function(txHash){
  return this._paidTo[txHash];
};

Wallet.prototype.getAddressBookLabel = function(address){
  return this._address_book[address];
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
      this._pbkdf2_iterations = newIterations;
      this.encrypt(password);
    }
    else { // no double encrypted wallet
      this._pbkdf2_iterations = newIterations;
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

// TODO: Remove once beta period is over
Wallet.prototype.whitelistWallet = function (secret, email, name) {
  var defer = RSVP.defer();
  MyWallet.whitelistWallet(
    {
      guid: this._guid,
      name: name,
      email: email,
      secret: secret
    },
    defer.resolve,
    defer.reject
  );
  return defer.promise;
};

// example of serialization
// var x = Blockchain.Wallet.new();
// x.newLegacyAddress();
// x.newLegacyAddress();
// x.newLegacyAddress();
// var j = JSON.stringify(x,null,2);
// var t = JSON.parse(j,Blockchain.Wallet.reviver);

// loading old wallet to new model
// var o = Blockchain.MyWallet.makeWalletJSON();
// var n = JSON.parse(o,Blockchain.Wallet.reviver);
