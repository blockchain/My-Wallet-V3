'use strict';

module.exports = HDAccount;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
var KeyRing  = require('./keyring');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
////////////////////////////////////////////////////////////////////////////////
// HDAccount Class

function HDAccount(object){

  var self = this;
  var obj = object || {};
  obj.cache = obj.cache || {};
  obj.address_labels = obj.address_labels || [];
  // serializable data
  this._label    = obj.label;
  this._archived = obj.archived || false;
  this._xpriv    = obj.xpriv;
  this._xpub     = obj.xpub;
  this._network  = obj.network || Bitcoin.networks.bitcoin;

  this._address_labels = [];
  obj.address_labels.map(function(e){self._address_labels[e.index] = e.label;});

  // computed properties
  this._keyRing       = new KeyRing(obj.xpub, obj.cache);
  this._receiveIndex  = 0;
  // The highest receive index with transactions, as returned by the server:
  this._lastUsedReceiveIndex = 0;
  this._changeIndex   = 0;
  this._n_tx          = 0;
  this._balance       = null;
  this._index         = Helpers.isPositiveInteger(obj.index) ? obj.index : null;
}

////////////////////////////////////////////////////////////////////////////////
// PUBLIC PROPERTIES

Object.defineProperties(HDAccount.prototype, {

  "label": {
    configurable: false,
    get: function() { return this._label;},
    set: function(str) {
      if(Helpers.isValidLabel(str)){
        this._label = str;
        MyWallet.syncWallet();
      }else{
        throw 'Error: account.label must be an alphanumeric string';
      }
    }
  },
  "balance": {
    configurable: false,
    get: function() { return this._balance;},
    set: function(num) {
      if(Helpers.isPositiveNumber(num))
        this._balance = num;
      else
        throw 'Error: account.balance must be a positive number';
    }
  },
  "n_tx": {
    get: function() { return this._n_tx;},
    set: function(num) {
      if(Helpers.isPositiveInteger(num))
        this._n_tx = num;
      else
        throw 'Error: account.n_tx must be a positive integer';
    }
  },
  "archived": {
    configurable: false,
    get: function() { return this._archived;},
    set: function(value) {
      if(Helpers.isBoolean(value)){
        this._archived = value;
        MyWallet.syncWallet();
        if(!value) { // Unarchive
          // we should define a way to update only the account, not the whole wallet
          MyWallet.wallet.getHistory();
        }
      }
      else{
        throw 'Error: account.archived must be a boolean';
      }
    }
  },
  "active": {
    configurable: false,
    get: function() { return !this.archived;},
    set: function(value) { this.archived = !value; }
  },
  "receiveIndex": {
    configurable: false,
    get: function() { return this._receiveIndex;},
    set: function(value) {
      if(Helpers.isPositiveInteger(value))
        this._receiveIndex = value;
      else
        throw 'Error: account.receiveIndex must be a number';
    }
  },
  "lastUsedReceiveIndex": {
    configurable: false,
    get: function() { return this._lastUsedReceiveIndex;},
    set: function(value) {
      if(Helpers.isPositiveInteger(value))
        this._lastUsedReceiveIndex = value;
      else
        throw 'Error: account.lastUsedReceiveIndex must be a number';
    }
  },
  "maxLabeledReceiveIndex" : {
    configurable: false,
    get: function() {
      var keys = Object.keys(this._address_labels).map(function(k) {
        return parseInt(k);
      });
      if (keys.length == 0) {
        return -1;
      } else {
        return Math.max.apply(null, keys);
      }
    }
  },
  "changeIndex": {
    configurable: false,
    get: function() { return this._changeIndex;},
    set: function(value) {
      if(Helpers.isPositiveInteger(value))
        this._changeIndex = value;
      else
        throw 'Error: account.changeIndex must be a number';
    }
  },
  "receivingAddressesLabels": {
    configurable: false,
    get: function() {
      var denseArray = [];
      this._address_labels
        .map(function(lab,ind){denseArray.push({"index": ind, "label": lab})});
      return denseArray;
    }
  },
  "labeledReceivingAddresses": {
    configurable: false,
    get: function() {
      var denseArray = [];
      var outerThis = this;
      this._address_labels
        .map(function(lab,i){denseArray.push(outerThis.receiveAddressAtIndex(i))});
      return denseArray;
    }
  },
  "extendedPublicKey": {
     configurable: false,
     get: function() { return this._xpub;}
   },
  "extendedPrivateKey": {
    configurable: false,
    get: function() { return this._xpriv;}
  },
  "keyRing": {
    configurable: false,
    get: function() { return this._keyRing;}
  },
  "receiveAddress": {
    configurable: false,
    get: function() { return this._keyRing.receive.getAddress(this._receiveIndex);}
  },
  "changeAddress": {
    configurable: false,
    get: function() { return this._keyRing.change.getAddress(this._changeIndex);}
  },
  "isEncrypted": {
    configurable: false,
    get: function() { return Helpers.isBase64(this._xpriv) && !Helpers.isXprivKey(this._xpriv);}
  },
  "isUnEncrypted": {
    configurable: false,
    get: function() { return Helpers.isXprivKey(this._xpriv);}
  },
  "index": {
    configurable: false,
    get: function() { return this._index;}
  }
});

////////////////////////////////////////////////////////////////////////////////
// CONSTRUCTORS

/* BIP 44 defines the following 5 levels in BIP32 path:
 * m / purpose' / coin_type' / account' / change / address_index
 * Apostrophe in the path indicates that BIP32 hardened derivation is used.
 *
 * Purpose is a constant set to 44' following the BIP43 recommendation
 * Registered coin types: 0' for Bitcoin
 */
HDAccount.fromAccountMasterKey = function(accountZero, index, label){

  assert(accountZero, "Account MasterKey must be given to create an account.");
  var account    = new HDAccount();
  account._index = Helpers.isPositiveInteger(index) ? index : null;
  account._label  = label;
  account._xpriv = accountZero.toBase58();
  account._xpub  = accountZero.neutered().toBase58();
  account._keyRing.init(account._xpub, null);
  return account;
};

HDAccount.fromWalletMasterKey = function(masterkey, index, label) {

  assert(masterkey, "Wallet MasterKey must be given to create an account.");
  assert(Helpers.isPositiveInteger(index), "Derivation index must be a positive integer.");
  var accountZero = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(index);
  return HDAccount.fromAccountMasterKey(accountZero, index, label);
};

HDAccount.fromExtPublicKey = function(extPublicKey, index, label){
  // this is creating a read-only account
  assert(Helpers.isXpubKey(extPublicKey)
      , "Extended public key must be given to create an account.");
  var accountZero = Bitcoin.HDNode.fromBase58(extPublicKey);
  var a = HDAccount.fromAccountMasterKey(accountZero, index, label);
  a._xpriv = null;
  return a;
};

HDAccount.fromExtPrivateKey = function(extPrivateKey, index, label){

  assert(Helpers.isXprivKey(extPrivateKey)
      , "Extended private key must be given to create an account.");
  var accountZero = Bitcoin.HDNode.fromBase58(extPrivateKey);
  return HDAccount.fromAccountMasterKey(accountZero, index, label);
};

HDAccount.factory = function(o){
  if (o instanceof Object && !(o instanceof HDAccount)) {
    return new HDAccount(o);
  }
  else { return o; }
};
////////////////////////////////////////////////////////////////////////////////
// JSON SERIALIZER

HDAccount.prototype.toJSON = function(){

  // should we add checks on the serializer too?
  var hdaccount = {
    label         : this._label,
    archived      : this._archived,
    xpriv         : this._xpriv,
    xpub          : this._xpub,
    address_labels: this.receivingAddressesLabels,
    cache         : this._keyRing
  };

  return hdaccount;
};

HDAccount.reviver = function(k,v){
  if (k === '') return new HDAccount(v);
  return v;
};

////////////////////////////////////////////////////////////////////////////////

HDAccount.prototype.incrementReceiveIndex = function() {
  this._receiveIndex++;
  return this;
};
HDAccount.prototype.incrementReceiveIndexIfLast = function(index) {
  if (this._receiveIndex === index){
    this.incrementReceiveIndex();
  }
  return this;
};
////////////////////////////////////////////////////////////////////////////////
// address labels
HDAccount.prototype.setLabelForReceivingAddress = function(index, label) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');

  if(!Helpers.isValidLabel(label)) {
    return Promise.reject('NOT_ALPHANUMERIC');
    // Error: address label must be alphanumeric
  } else if (index - this.lastUsedReceiveIndex >= 20) {
    // Exceeds BIP 44 unused address gap limit
    return Promise.reject('GAP');
  } else {
    this._address_labels[index] = label;
    this.incrementReceiveIndexIfLast(index);
    MyWallet.syncWallet();
    return Promise.resolve();
  }
};

HDAccount.prototype.removeLabelForReceivingAddress = function(index) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  delete this._address_labels[index];
  MyWallet.syncWallet();
  return this;
};

HDAccount.prototype.getLabelForReceivingAddress = function(index) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  return this._address_labels[index];
};

HDAccount.prototype.receiveAddressAtIndex = function(index) {
  assert(Helpers.isPositiveInteger(index), 'Error: address index must be a positive integer');
  return this._keyRing.receive.getAddress(index);
};

HDAccount.prototype.encrypt = function(cipher){
  if(!this._xpriv) return this;
  var xpriv = cipher? cipher(this._xpriv) : this._xpriv;
  if (!xpriv) { throw 'Error Encoding account extended private key'; }
  this._temporal_xpriv = xpriv;
  return this;
};

HDAccount.prototype.decrypt = function(cipher){
  if(!this._xpriv) return this;
  var xpriv = cipher? cipher(this._xpriv) : this._xpriv;
  if (!xpriv) { throw 'Error Decoding account extended private key'; }
  this._temporal_xpriv = xpriv;
  return this;
};

HDAccount.prototype.persist = function(){
  if (!this._temporal_xpriv) return this;
  this._xpriv = this._temporal_xpriv;
  delete this._temporal_xpriv;
  return this;
};
