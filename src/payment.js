'use strict';

var Bitcoin       = require('bitcoinjs-lib');
var q             = require('q');
var MyWallet      = require('./wallet');
var WalletCrypto  = require('./wallet-crypto');
var Transaction   = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

////////////////////////////////////////////////////////////////////////////////
//// Payment Class
////////////////////////////////////////////////////////////////////////////////

function Payment() {
  this.payment = Payment.empty();
  // type definitions
  // payment.from           :: [bitcoin address || xpub]
  // payment.change         :: [bitcoin address]
  // payment.wifKeys        :: [WIF]
  // payment.fromAccountIdx :: Integer
  // payment.sweepAmount    :: Integer
  // payment.sweepFee       :: Integer
  // payment.forcedFee      :: Integer
  // payment.coins          :: [coins]
  // payment.to             :: [bitcoin address]
  // payment.amounts        :: [Integer]
  // payment.transaction    :: Transaction
  // payment.listener       :: {Functions}
}
////////////////////////////////////////////////////////////////////////////////
// Payment instance methods (can be chained)
Payment.prototype.to = function(destinations) {
  this.payment = this.payment.then(Payment.to(destinations));
  return this;
};

Payment.prototype.from = function(origin) {
  this.payment = this.payment.then(Payment.from(origin));
  return this;
};

Payment.prototype.amount = function(amounts) {
  this.payment = this.payment.then(Payment.amount(amounts));
  return this;
};

Payment.prototype.listener = function(listener) {
  this.payment = this.payment.then(Payment.listener(listener));
  return this;
};

Payment.prototype.sweep = function() {
  this.payment = this.payment.then(Payment.sweep());
  return this;
};

Payment.prototype.fee = function(fee) {
  this.payment = this.payment.then(Payment.fee(fee));
  return this;
};

Payment.prototype.sign = function(password) {
  this.payment = this.payment.then(Payment.sign(password));
  return this;
};

Payment.prototype.publish = function() {
  this.payment = this.payment.then(Payment.publish());
  return this;
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
Payment.empty = function() {
  return q({});
};

Payment.to = function(destinations) {
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
  return function(payment) {
    payment.to = formatDest;
    return q(payment);
  };
};

Payment.listener = function(listener) {
  return function(payment) {
    payment.listener = listener
    return q(payment);
  };
};

Payment.sweep = function(amount) {
  return function(payment) {
    payment.amounts = payment.sweepAmount ? [payment.sweepAmount] : undefined;
    payment.forcedFee = payment.sweepFee;
    return q(payment);
  };
};

Payment.fee = function(amount) {
  var forcedFee = Helpers.isNumber(amount) ? amount : null;
  return function(payment) {
    payment.forcedFee = forcedFee;
    return q(payment);
  };
};

Payment.amount = function(amounts) {
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
  return function(payment) {
    payment.amounts = formatAmo;
    return q(payment);
  };
};

Payment.from = function(origin) {
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
  return function(payment) {
    payment.from           = addresses;
    payment.change         = change;
    payment.wifKeys        = wifs;
    payment.fromAccountIdx = fromAccId;
    return getUnspentCoins(addresses).then(
      function(coins) {
        var sweep = computeSuggestedSweep(coins);
        payment.sweepAmount = sweep[0];
        payment.sweepFee    = sweep[1];
        payment.coins       = coins;
        return payment;
      }
    );
  };
};

Payment.sign = function(password) {
  function build (payment) {
    return new Transaction(payment.coins, payment.to, payment.amounts,
                           payment.forcedFee, payment.change, payment.listener);
  };
  function importWIF (WIF) {
    MyWallet.wallet.importLegacyAddress(WIF, "Redeemed code.", password)
      .then(function(A){A.archived = true;});
  };
  return function(payment) {
    if (Array.isArray(payment.wifKeys)) payment.wifKeys.forEach(importWIF);
    payment.transaction = build(payment);
    payment.transaction.addPrivateKeys(getPrivateKeys(password, payment));
    payment.transaction.randomizeOutputs();
    payment.transaction = payment.transaction.sign();
    return q(payment);
  };
};

Payment.publish = function() {
  return function(payment) {
    var defer = q.defer();
    var success = function(tx_hash) {
      console.log("published");
      payment.txid = tx_hash;
      defer.resolve(payment);
    };
    var error = function(e) {
      defer.reject(e.message || e.responseText);
    };
    BlockchainAPI.push_tx(payment.transaction, undefined, success, error);
    return defer.promise;
  };
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
module.exports = Payment;
////////////////////////////////////////////////////////////////////////////////
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
// getPrivateKeys :: password -> payment -> [private key]
function getPrivateKeys(password, payment) {
  var transaction = payment.transaction;
  var privateKeys = [];
  // if from Account
  if (Helpers.isNumber(payment.fromAccountIdx)) {
    var xpriv = getXPRIV(password, payment.fromAccountIdx);
    privateKeys = transaction.pathsOfNeededPrivateKeys.map(getKeyForPath.bind(this, xpriv));
  };
  // if from Addresses
  if (payment.from && payment.from.every(Helpers.isBitcoinAddress)) {
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

// example (syntax 1)

// var Payment = Blockchain.Payment;
// Payment.empty()
//   .then(Payment.from(undefined))
//   .then(Payment.amount(11000))
//   .then(Payment.to("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"))
//   .then(Payment.sign("hola"))
//   .then(Payment.publish())
//   .then(function(p){console.log( "result: " +  JSON.stringify(p, null, 2));})
//   .catch(function(e){console.log( "error: " + e);});

// example (syntax 2)

// var payment = new Payment();
// payment
//   .from(undefined)
//   .amount(10000)
//   .to("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX")
//   .sign("hola")
//   .publish()
//   .payment.then(function(p){console.log( "result: " +  JSON.stringify(p, null, 2));})
//           .catch(function(e){console.log( "error: " + e);});
