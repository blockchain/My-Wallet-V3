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
  // type definitions
  // tx.from           :: [bitcoin address || xpub]
  // tx.change         :: [bitcoin address]
  // tx.wifKeys        :: [WIF]
  // tx.fromAccountIdx :: Integer
  // tx.sweepAmount    :: Integer
  // tx.sweepFee       :: Integer
  // tx.forcedFee      :: Integer
  // tx.coins          :: [coins]
  // tx.to             :: [bitcoin address]
  // tx.amounts        :: [Integer]
  // tx.transaction    :: Transaction
  // tx.listener       :: {Functions}
  return this;
}

Spender.emptyTx = function() {
  return q({});
};

Spender.to = function(destinations) {
  var formatDest = null;
  switch (true) {
    // single bitcoin address
    case Helpers.isBitcoinAddress(destinations):
      formatDest = Helpers.toArrayFormat(destinations);
      break;
    // single account index
    case Helpers.isNumber(destinations) &&
         (0 <= destinations) &&
         MyWallet.wallet.isUpgradedToHD &&
         (destinations < MyWallet.wallet.hdwallet.accounts.length):
      var account = MyWallet.wallet.hdwallet.accounts[destinations];
      formatDest   = Helpers.toArrayFormat(account.receiveAddress);
      break;
    // multiple bitcoin addresses
    case Array.isArray(destinations) &&
         destinations.length > 0 &&
         destinations.every(Helpers.isBitcoinAddress):
      formatDest = destinations;
    default:
  } // fi switch
  return function(tx) {
    tx.to = formatDest;
    return q(tx);
  };
};

Spender.listener = function(listener) {
  return function(tx) {
    tx.listener = listener
    return q(tx);
  };
};

Spender.sweep = function(amount) {
  return function(tx) {
    tx.amounts = tx.sweepAmount ? [tx.sweepAmount] : undefined;
    tx.forcedFee = tx.sweepFee;
    return q(tx);
  };
};

Spender.fee = function(amount) {
  var forcedFee = Helpers.isNumber(amount) ? amount : null;
  return function(tx) {
    tx.forcedFee = forcedFee;
    return q(tx);
  };
};

Spender.amount = function(amounts) {
  var formatAmo = null;
  switch (true) {
    // single output
    case Helpers.isNumber(amounts):
      formatAmo = Helpers.toArrayFormat(amounts);
      break;
    // multiple outputs
    case Array.isArray(amounts) &&
         amounts.length > 0 &&
         amounts.every(Helpers.isNumber):
      formatDest = amounts;
    default:
  } // fi switch
  return function(tx) {
    tx.amounts = formatAmo;
    return q(tx);
  };
};

Spender.from = function(origin) {
  var addresses  = null;
  var change     = null;
  var pkFormat   = MyWallet.detectPrivateKeyFormat(origin);
  var wifs       = []; // only used fromPrivateKey
  var fromAccId  = null;

  switch (true) {
    // no origin => assume origin = all the legacy addresses (non - watchOnly)
    case origin === null || origin === undefined || origin === '':
      addresses = MyWallet.wallet.spendableActiveAddresses;
      change    = addresses[0];
      break;
    // single bitcoin address
    case Helpers.isBitcoinAddress(origin):
      addresses = [origin];
      change    = addresses;
      break;
    // single account index
    case Helpers.isNumber(origin) &&
         (0 <= origin) &&
         (origin < MyWallet.wallet.hdwallet.accounts.length):
      var fromAccount = MyWallet.wallet.hdwallet.accounts[origin];
      addresses = [fromAccount.extendedPublicKey];
      change    = fromAccount.changeAddress;
      fromAccId = origin;
      break;
    // multiple legacy addresses
    case Array.isArray(origin) &&
         origin.length > 0 &&
         origin.every(Helpers.isBitcoinAddress):
      addresses = origin;
      change    = addresses[0];
      break;
    // from PrivateKey
    case (pkFormat !== null):
      var key    = MyWallet.privateKeyStringToKey(origin, pkFormat);
      key.pub.compressed = false;
      var addrUncomp = key.pub.getAddress().toString();
      var uWIF = key.toWIF();
      key.pub.compressed = true;
      var addrComp = key.pub.getAddress().toString();
      var cWIF = key.toWIF();
      wifs      = [cWIF, uWIF];
      addresses = [addrComp, addrUncomp];
      change    = addrComp;
      // 5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYB9KF
      // L53fCHmQhbNp1B4JipfBtfeHZH7cAibzG9oK19XfiFzxHgAkz6JK
      break;
    default:
  } // fi switch
  return function(tx) {
    tx.from           = addresses;
    tx.change         = change;
    tx.wifKeys        = wifs;
    tx.fromAccountIdx = fromAccId;
    return getUnspentCoins(addresses).then(
      function(coins) {
        var sweep = computeSuggestedSweep(coins);
        tx.sweepAmount = sweep[0];
        tx.sweepFee    = sweep[1];
        tx.coins       = coins;
        return tx;
      }
    );
  };
};

Spender.sign = function(password) {
  function build (tx) {
    return new Transaction(tx.coins, tx.to, tx.amounts, tx.forcedFee, tx.change, tx.listener);
  };
  function importWIF (WIF) {
    MyWallet.wallet.importLegacyAddress(WIF, "Redeemed code.", password)
      .then(function(A){A.archived = true;});
  };
  return function(tx) {
    if (Array.isArray(tx.wifKeys)) tx.wifKeys.forEach(importWIF);
    tx.transaction = build(tx);
    tx.transaction.addPrivateKeys(getPrivateKeys(password, tx));
    tx.transaction.randomizeOutputs();
    tx.transaction = tx.transaction.sign();
    return q(tx);
  };
};

Spender.publish = function() {
  return function(tx) {
    var defer = q.defer();
    var success = function(tx_hash) {
      console.log("published");
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

module.exports = Spender;

////////////////////////////////////////////////////////////////////////////////
// Helper functions


//////////////////////////////////////////////////////////////////////////////
// getUnspentCoins :: [address] -> Promise [coins]
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

////////////////////////////////////////////////////////////////////////////////
// obtain private key for an address
// from Address
function getKeyForAddress(password, addr) {
  var k = MyWallet.wallet.key(addr).priv;
  var privateKeyBase58 = password == null ? k :
    WalletCrypto.decryptSecretWithSecondPassword( k
                                                , password
                                                , MyWallet.wallet.sharedKey
                                                , MyWallet.wallet.pbkdf2_iterations);
  var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
  var key    = MyWallet.privateKeyStringToKey(privateKeyBase58, format);
  if (MyWallet.getCompressedAddressString(key) === addr) {
    key = new Bitcoin.ECKey(key.d, true);
  }
  else if (MyWallet.getUnCompressedAddressString(key) === addr) {
    key = new Bitcoin.ECKey(key.d, false);
  };
  return key;
}
////////////////////////////////////////////////////////////////////////////////
// getXPRIV :: password -> index -> xpriv
function getXPRIV(password, accountIndex) {
  var fromAccount = MyWallet.wallet.hdwallet.accounts[accountIndex];
  var xpriv = fromAccount.extendedPrivateKey === null || password === null
    ? fromAccount.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword( fromAccount.extendedPrivateKey
                                                  , password
                                                  , MyWallet.wallet.sharedKey
                                                  , MyWallet.wallet.pbkdf2_iterations);
  return xpriv;
};
////////////////////////////////////////////////////////////////////////////////
// getKeyForPath :: xpriv -> path -> [private key]
function getKeyForPath(extendedPrivateKey, neededPrivateKeyPath) {
  var keyring = new KeyRing(extendedPrivateKey);
  return keyring.privateKeyFromPath(neededPrivateKeyPath);
};

////////////////////////////////////////////////////////////////////////////////
// getPrivateKeys :: password -> tx -> [private key]
function getPrivateKeys(password, tx) {
  var transaction = tx.transaction;
  var privateKeys = [];
  // if from Account
  if (Helpers.isNumber(tx.fromAccountIdx)) {
    var xpriv = getXPRIV(password, tx.fromAccountIdx);
    privateKeys = transaction.pathsOfNeededPrivateKeys.map(getKeyForPath.bind(this, xpriv));
  };
  // if from Addresses
  if (tx.from && tx.from.every(Helpers.isBitcoinAddress)) {
    privateKeys = transaction.addressesOfNeededPrivateKeys.map(getKeyForAddress.bind(this, password));
  };
  return privateKeys;
};

////////////////////////////////////////////////////////////////////////////////
// computeSuggestedSweep :: [coins] -> [maxSpendeableAmount - fee, fee]
function computeSuggestedSweep(coins){
  var getValue = function(coin) {return coin.value;};
  var sortedCoinValues = coins.map(getValue).sort(function(a, b){return b-a});
  var accumulatedValues = sortedCoinValues
    .map(function(element,index,array){
      var fee = Helpers.guessFee(index+1, 2, MyWallet.wallet.fee_per_kb);
      return [array.slice(0,index+1).reduce(Helpers.add,0) - fee, fee];  //[total-fee, fee]
    }).sort(function(a,b){return b[0]-a[0]});
  return accumulatedValues[0];
};

// var Spender = Blockchain.Spencer;
//
// Spender.emptyTx()
//   .then(Spender.to('asdf'))
//   .then(Spender.from('hjkl'))
//   .then(Spender.amount(10000))
//   .then(Spender.to('qwerty'))
//   .then(function(tx) {
//     console.log(tx);
//     return tx;
//   })
//   .then(Spender.from('zxcv'))
//   .then(Spender.amount(5000))
  // .then(function(tx) {
  //   console.log(tx);
  // });

// var Spender = Blockchain.Spencer;
// var x = Spender.emptyTx()
//           .then(Spender.from(undefined))
//           .then(Spender.sweep())
//           .then(Spender.to("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"))
//           .then(Spender.sign("hola"))
//           .then(function(tx){console.log( "resultat: " +  JSON.stringify(tx, null, 2));})
//           .catch(function(e){console.log( "error: " + e);});


// var Spender = Blockchain.Spencer;
// var x = Spender.emptyTx()
//           .then(Spender.from(undefined))
//           .then(Spender.amount(12345))
//           .then(Spender.to("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"))
//           .then(Spender.sign("hola"))
//           .then(function(tx){console.log( "resultat: " +  JSON.stringify(tx, null, 2));})
//           .catch(function(e){console.log( "error: " + e);});
