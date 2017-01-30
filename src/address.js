'use strict';

module.exports = Address;

var Base58 = require('bs58');
var RNG = require('./rng');
var API = require('./api');
var Bitcoin = require('bitcoinjs-lib');
var Helpers = require('./helpers');
var MyWallet = require('./wallet'); // This cyclic import should be avoided once the refactor is complete
var ImportExport = require('./import-export');
var WalletCrypto = require('./wallet-crypto');
var constants = require('./constants');

// Address class
function Address (object) {
  // private members
  var obj = object || {};
  this._addr = obj.addr;
  this._priv = obj.priv;
  this._label = obj.label;
  this._tag = obj.tag || 0;  // default is non-archived
  this._created_time = obj.created_time;
  this._created_device_name = obj.created_device_name;
  this._created_device_version = obj.created_device_version;
  // non saved properties
  this._balance = null; // updated from the server
  this._totalSent = null;
  this._totalReceived = null;
}

// public members
Object.defineProperties(Address.prototype, {
  'address': {
    configurable: false,
    get: function () { return this._addr; }
  },
  'priv': {
    configurable: false,
    get: function () { return this._priv; }
  },
  'tag': {
    configurable: false,
    get: function () { return this._tag; }
  },
  'label': {
    configurable: false,
    get: function () { return this._label; },
    set: function (str) {
      if (Helpers.isValidLabel(str) || str == null) {
        this._label = str === '' ? undefined : str;
        MyWallet.syncWallet();
      } else {
        throw new Error('address.label must be an alphanumeric string');
      }
    }
  },
  'created_time': {
    configurable: false,
    get: function () { return this._created_time; }
  },
  'created_device_name': {
    configurable: false,
    get: function () { return this._created_device_name; }
  },
  'created_device_version': {
    configurable: false,
    get: function () { return this._created_device_version; }
  },
  'balance': {
    configurable: false,
    get: function () { return this._balance; },
    set: function (num) {
      if (Helpers.isPositiveNumber(num)) {
        this._balance = num;
      } else {
        throw new Error('address.balance must be a positive number');
      }
    }
  },
  'totalSent': {
    configurable: false,
    get: function () { return this._totalSent; },
    set: function (num) {
      if (Helpers.isPositiveNumber(num)) {
        this._totalSent = num;
      } else {
        throw new Error('address.totalSent must be a positive number');
      }
    }
  },
  'totalReceived': {
    configurable: false,
    get: function () { return this._totalReceived; },
    set: function (num) {
      if (Helpers.isPositiveNumber(num)) {
        this._totalReceived = num;
      } else {
        throw new Error('address.totalReceived must be a positive number');
      }
    }
  },
  'isWatchOnly': {
    configurable: false,
    get: function () { return this._priv == null; }
  },
  'isEncrypted': {
    configurable: false,
    get: function () { return Helpers.isBase64(this._priv) && !Helpers.isBase58Key(this._priv); }
  },
  'isUnEncrypted': {
    configurable: false,
    get: function () { return Helpers.isBase58Key(this._priv); }
  },
  'archived': {
    configurable: false,
    get: function () { return this._tag === 2; },
    set: function (value) {
      if (Helpers.isBoolean(value)) {
        this._tag = value ? 2 : 0;
        MyWallet.syncWallet();
        MyWallet.wallet.getHistory();
      } else {
        throw new Error('address.archived must be a boolean');
      }
    }
  },
  'active': {
    configurable: false,
    get: function () { return !this.archived; },
    set: function (value) { this.archived = !value; }
  }
});

Address.factory = function (o, a) {
  if (a instanceof Object && !(a instanceof Address)) {
    o[a.addr] = new Address(a);
  } else {
    o[a.address] = a;
  }
  return o;
};

Address.import = function (key, label) {
  var object = {
    addr: null,
    priv: null,
    created_time: Date.now(),
    created_device_name: constants.APP_NAME,
    created_device_version: constants.APP_VERSION
  };
  switch (true) {
    case Helpers.isBitcoinAddress(key):
      object.addr = key;
      object.priv = null;
      break;
    case Helpers.isKey(key):
      object.addr = key.getAddress();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    case Helpers.isBitcoinPrivateKey(key):
      key = Bitcoin.ECPair.fromWIF(key, constants.getNetwork());
      object.addr = key.getAddress();
      object.priv = Base58.encode(key.d.toBuffer(32));
      break;
    default:
      throw new Error('address import format not supported');
  }

  // initialization
  var address = new Address(object);
  address._label = label;
  address._tag = 0; // non-archived
  return address;
};

Address.fromString = function (keyOrAddr, label, bipPass) {
  if (Helpers.isBitcoinAddress(keyOrAddr)) {
    return Promise.resolve(Address.import(keyOrAddr, label));
  } else {
    // Import private key
    var format = Helpers.detectPrivateKeyFormat(keyOrAddr);
    var okFormats = ['base58', 'base64', 'hex', 'mini', 'sipa', 'compsipa'];
    if (format === 'bip38') {
      if (bipPass === undefined || bipPass === null || bipPass === '') {
        return Promise.reject('needsBip38');
      }

      var parseBIP38Wrapper = function (resolve, reject) {
        ImportExport.parseBIP38toECPair(keyOrAddr, bipPass,
          function (key) { resolve(Address.import(key, label)); },
          function () { reject('wrongBipPass'); },
          function () { reject('importError'); }
        );
      };
      return new Promise(parseBIP38Wrapper);
    } else if (format === 'mini' || format === 'base58') {
      try {
        var myk = Helpers.privateKeyStringToKey(keyOrAddr, format);
      } catch (e) {
        return Promise.reject(e);
      }
      myk.compressed = true;
      var cad = myk.getAddress();
      myk.compressed = false;
      var uad = myk.getAddress();
      return API.getBalances([cad, uad]).then(
        function (o) {
          var compBalance = o[cad].final_balance;
          var ucompBalance = o[uad].final_balance;
          if (compBalance === 0 && ucompBalance > 0) {
            myk.compressed = false;
          } else {
            myk.compressed = true;
          }
          return Address.import(myk, label);
        }
      ).catch(
        function (e) {
          myk.compressed = true;
          return Promise.resolve(Address.import(myk, label));
        }
      );
    } else if (okFormats.indexOf(format) > -1) {
      var k = Helpers.privateKeyStringToKey(keyOrAddr, format);
      return Promise.resolve(Address.import(k, label));
    } else {
      return Promise.reject('unknown key format');
    }
  }
};

Address.new = function (label) {
  var key = Bitcoin.ECPair.makeRandom({
    rng: RNG.run.bind(RNG),
    compressed: true,
    network: constants.getNetwork()
  });
  return Address.import(key, label);
};

Address.reviver = function (k, v) {
  if (k === '') return new Address(v);
  return v;
};

Address.prototype.toJSON = function () {
  var address = {
    addr: this.address,
    priv: this.priv,
    tag: this.tag,
    label: this.label,
    created_time: this.created_time,
    created_device_name: this.created_device_name,
    created_device_version: this.created_device_version
  };
  return address;
};

Address.prototype.signMessage = function (message, secondPassword) {
  if (!Helpers.isString(message)) throw new Error('Expected message to be a string');
  if (this.isWatchOnly) throw new Error('Private key needed for message signing');
  if (this.isEncrypted && secondPassword == null) throw new Error('Second password needed to decrypt key');

  var getDecrypted = WalletCrypto.decryptSecretWithSecondPassword.bind(null,
    this.priv, secondPassword, MyWallet.wallet.sharedKey, MyWallet.wallet.pbkdf2_iterations);

  var priv = this.isEncrypted ? getDecrypted() : this.priv;
  var keyPair = Helpers.privateKeyStringToKey(priv, 'base58');

  if (keyPair.getAddress() !== this.address) keyPair.compressed = false;
  return Bitcoin.message.sign(keyPair, message, constants.getNetwork()).toString('base64');
};

Address.prototype.encrypt = function (cipher) {
  if (!this._priv) return this;
  var priv = cipher ? cipher(this._priv) : this._priv;
  if (!priv) { throw new Error('Error Encoding key'); }
  this._temporal_priv = priv;
  return this;
};

Address.prototype.decrypt = function (cipher) {
  if (!this._priv) return this;
  var priv = cipher ? cipher(this._priv) : this._priv;
  if (!priv) { throw new Error('Error Decoding key'); }
  this._temporal_priv = priv;
  return this;
};

Address.prototype.persist = function () {
  if (!this._temporal_priv) return this;
  this._priv = this._temporal_priv;
  delete this._temporal_priv;
  return this;
};
