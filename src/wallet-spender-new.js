'use strict';

var assert        = require('assert');
var Bitcoin       = require('bitcoinjs-lib');
var q             = require('q');
var MyWallet      = require('./wallet');
var WalletCrypto  = require('./wallet-crypto');
var HDAccount     = require('./hd-account');
var Address       = require('./address');
var Transaction   = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

////////////////////////////////////////////////////////////////////////////////
//// Spender Class
////////////////////////////////////////////////////////////////////////////////

function Spender() {
  this.tx = null;
  this.pTx = Spender.emptyTx();
  return this;
}


Spender.to = function(destinations) {
  return function(tx) {
    tx.to = destinations;
    return q(tx);
  };
};

Spender.amount = function(amounts) {
  amounts = toArrayFormat(amounts);
  return function(tx) {
    tx.amounts = amounts;
    return q(tx);
  };
};

Spender.fromAddress = function(address) {
  var deferredTx = q.defer(),
      addresses = toArrayFormat(address) || MyWallet.wallet.spendableActiveAddresses,
      changeAddress = addresses[0];
  return function(tx) {
    tx.from = address;
    tx.change = changeAddress;
    getUnspentCoins(addresses)
      .then(function(coins) {
        tx.coins = coins;
        deferredTx.resolve(tx);
      });
    return deferredTx.promise;
  };
};

Spender.fromAccount = function(accountIdx) {
  var account = MyWallet.wallet.hdwallet.accounts[accountIdx];
  assert(account instanceof HDAccount, 'Account must be an HDAccount object');
  var deferredTx = q.defer(),
      changeAddress = account.changeAddress,
      xpub = account.extendedPublicKey;
  return function(tx) {
    tx.from = account;
    tx.change = changeAddress;
    getUnspentCoins([xpub])
      .then(function(coins) {
        tx.coins = coins;
        deferredTx.resolve(tx);
      });
    return deferredTx.promise;
  };
};

Spender.publish = function() {
  return function(tx) {
    var defer = q.defer();
    var success = function(tx_hash) {
      tx.id = tx_hash;
      defer.resolve(tx);
    };
    var error = function(e) {
      defer.reject(e.message || e.responseText);
    };
    BlockchainAPI.push_tx(tx.transaction, undefined, success, error);
    return defer.promise;
  };
};

Spender.emptyTx = function() {
  return q({});
};

module.exports = Spender;

// Helper functions
function getUnspentCoins(addressList) {
  var defer = q.defer();
  var processCoins = function (obj) {
    var processCoin = function(utxo) {
      var txBuffer = new Buffer(utxo.tx_hash, "hex");
      Array.prototype.reverse.call(txBuffer);
      utxo.hash = txBuffer.toString("hex");
      utxo.index = utxo.tx_output_n;
    };
    obj.unspent_outputs.forEach(processCoin);
    defer.resolve(obj.unspent_outputs);
  }
  var errorCoins = function(e) {
    defer.reject(e.message || e.responseText);
  }
  BlockchainAPI.get_unspent(addressList, processCoins, errorCoins, 0, true);
  return defer.promise;
}

Spender.sign = function(secondPassword) {
  function build(tx) {
    return new Transaction(tx.coins, tx.to, tx.amounts, 10000, tx.change);
  }
  return function(tx) {
    tx.transaction = build(tx);
    tx.transaction.addPrivateKeys(getPrivateKeys(tx));
    tx.transaction.randomizeOutputs();
    tx.transaction = tx.transaction.sign();
    return q(tx);
  };
};

function getPrivateKeys(tx) {
  var transaction = tx.transaction;
  var extendedPrivateKey = tx.from.extendedPrivateKey;
  function getKeyForAddress(addr) {
    var k = MyWallet.wallet.key(addr).priv;
    var privateKeyBase58 = k;
    var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
    var key = MyWallet.privateKeyStringToKey(privateKeyBase58, format);
    if (MyWallet.getCompressedAddressString(key) === addr) {
      key = new Bitcoin.ECKey(key.d, true);
    }
    else if (MyWallet.getUnCompressedAddressString(key) === addr) {
      key = new Bitcoin.ECKey(key.d, false);
    }
    return key;
  }
  function getKeyForPath(neededPrivateKeyPath) {
    var keyring = new KeyRing(extendedPrivateKey);
    return keyring.privateKeyFromPath(neededPrivateKeyPath);
  };
  var privateKeys = transaction.addressesOfNeededPrivateKeys.map(getKeyForAddress);
  privateKeys = privateKeys.concat(transaction.pathsOfNeededPrivateKeys.map(getKeyForPath));
  return privateKeys;
}

function toArrayFormat(x) {
  return Array.isArray(x) ? x : [x];
}

