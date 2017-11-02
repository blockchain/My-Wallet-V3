'use strict';

var Bitcoin = require('bitcoinjs-lib');
var WalletCrypto = require('./wallet-crypto');
var Transaction = require('./transaction');
var API = require('./api');
var Helpers = require('./helpers');
var KeyRing = require('./keyring');
var EventEmitter = require('events');
var util = require('util');
var constants = require('./constants');
var mapObjIndexed = require('ramda/src/mapObjIndexed');
const Coin = require('./bch/coin.js');
const { selectAll, descentDraw, ascentDraw, effectiveBalance, filteredEffectiveBalance } = require('./bch/coin-selection')
const { curry, is, prop, lensProp, compose, assoc, over, map, zipWith } = require('ramda');
const { mapped } = require('ramda-lens');
const { sign } = require('./btc/signer');
// Payment Class

function Payment (wallet, payment) {
  EventEmitter.call(this);
  this._wallet = wallet;

  var serverFeeFallback = {
    'limits': {
      'min': 50,
      'max': 450
    },
    'regular': 240,
    'priority': 300
  };

  var initialState = {
    fees: serverFeeFallback,  // fallback for fee-service
    coins: [],  // original set of unspents (set by .from)
    selectedCoins: [], // set of coins that are going to be passed to new Transaction
    from: null, // origin
    amounts: [], // list of amounts to spend entered in the form
    to: [], // list of destinations entered in the form
    // feePerKb: Helpers.toFeePerKb(serverFeeFallback.regular), // default fee-per-kb used
    feePerByte: serverFeeFallback.regular, // default fee-per-kb used
    extraFeeConsumption: 0, // if there is change consumption to fee will be reflected here
    sweepFee: 0,  // computed fee to sweep an account in basic send (depends on fee-per-kb)
    sweepAmount: 0, // computed max spendable amount depending on fee-per-kb
    balance: 0, // sum of all unspents values with any filtering     [ payment.sumOfCoins ]
    finalFee: 0, // final absolute fee that it is going to be used no matter how was obtained (advanced or regular send)
    changeAmount: 0, // final change
    maxFees: {limits: { 'min': 0, 'max': 0 }, regular: 0, priority: 0}, // each fee-per-kb (regular, priority)
    maxSpendableAmounts: {limits: { 'min': 0, 'max': 0 }, regular: 0, priority: 0},  // max amount for each fee-per-kb
    txSize: 0, // transaction size

    selection: { fee: 0, inputs: [], outputs: [] }
  };

  var p = payment || initialState;
  this.payment = Payment.return(p);
  this.updateFees();

  // more definitions
  // payment.from           :: [bitcoin address || xpub || privateKey]
  // payment.change         :: [bitcoin address]
  // payment.wifKeys        :: [WIF]
  // payment.fromAccountIdx :: Integer
  // payment.fromWatchOnly  :: Boolean
  // payment.transaction    :: Transaction
}
util.inherits(Payment, EventEmitter);

// Payment instance methods (can be chained)
Payment.prototype.to = function (destinations) {
  this.payment = this.payment.then(Payment.to.call(this, destinations));
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.from = function (origin, absoluteFee) {
  this.payment = this.payment.then(Payment.from.call(this, origin));
  this.then(Payment.prebuild(absoluteFee));
  return this;
};

// Payment.prototype.fee = function (absoluteFee) {
//   this.then(Payment.prebuild(absoluteFee));
//   this.sideEffect(this.emit.bind(this, 'update'));
//   return this;
// };

Payment.prototype.amount = function (amounts, absoluteFee, bFeeParams) {
  this.payment = this.payment.then(Payment.amount(amounts, absoluteFee, bFeeParams));
  this.then(Payment.prebuild(absoluteFee));
  return this;
};

Payment.prototype.then = function (myFunction) {
  this.payment = this.payment.then(myFunction);
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.catch = function (errorHandler) {
  this.payment = this.payment.catch(errorHandler);
  return this;
};

Payment.prototype.sideEffect = function (myFunction) {
  this.payment = this.payment.then(Payment.sideEffect(myFunction));
  return this;
};

Payment.prototype.useAll = function () {
  this.payment = this.payment.then(Payment.useAll());
  this.then(Payment.prebuild());
  // this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.updateFees = function () {
  this.payment = this.payment.then(Payment.updateFees());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.updateFeePerKb = function (fee) {
  this.payment = this.payment.then(Payment.updateFeePerKb(fee));
  this.then(Payment.prebuild());
  return this;
};

Payment.prototype.prebuild = function () {
  this.payment = this.payment.then(Payment.prebuild());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.build = function () {
  this.payment = this.payment.then(Payment.build());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.sign = function (password) {
  this.payment = this.payment.then(Payment.sign.call(this, password));
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.publish = function () {
  this.payment = this.payment.then(Payment.publish());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.printJSON = function () {
  var printJSON = function (p) { console.log(JSON.stringify(p, null, 2)); };
  this.sideEffect(printJSON);
  return this;
};

Payment.return = function (payment) {
  var p = payment || {};
  return Promise.resolve(p);
};

// myFunction :: payment -> ()
Payment.sideEffect = function (myFunction) {
  return function (payment) {
    myFunction(payment);
    return Promise.resolve(payment);
  };
};

Payment.to = function (destinations) {
  var wallet = this._wallet;
  var formatDest = null;
  var isValidIndex = function (i) {
    return Helpers.isPositiveInteger(i) && wallet.isUpgradedToHD && (i < wallet.hdwallet.accounts.length);
  };
  var accountToAddress = function (i) {
    if (Helpers.isPositiveInteger(i)) {
      return wallet.hdwallet.accounts[i].receiveAddress;
    } else {
      return i;
    }
  };
  switch (true) {
    // single bitcoin address
    case Helpers.isBitcoinAddress(destinations):
      formatDest = Helpers.toArrayFormat(destinations);
      break;
    // single account index
    case isValidIndex(destinations):
      formatDest = Helpers.toArrayFormat(accountToAddress(destinations));
      break;
    // multiple bitcoin addresses or accounts
    case Array.isArray(destinations) &&
         destinations.length > 0 &&
         destinations.every(Helpers.o(Helpers.isBitcoinAddress, isValidIndex)):
      formatDest = destinations.map(accountToAddress);
      break;
    default:
      console.log('No destination set.');
  } // fi switch
  return function (payment) {
    payment.to = formatDest;
    return Promise.resolve(payment);
  };
};

Payment.useAll = function () {
  return function (payment) {
    // if (Helpers.isPositiveNumber(absoluteFee)) {
    //   var balance = payment.balance ? payment.balance : 0;
    //   payment.amounts = (balance - absoluteFee) > 0 ? [balance - absoluteFee] : [];
    // } else {
    //   payment.amounts = payment.sweepAmount ? [payment.sweepAmount] : [];
    // }
    return Promise.resolve(payment);
  };
};

Payment.amount = function (amounts) {
  var formatAmo = null;
  switch (true) {
    // single output
    case Helpers.isPositiveNumber(amounts):
      formatAmo = Helpers.toArrayFormat(amounts);
      break;
    // multiple outputs
    case Array.isArray(amounts) &&
         amounts.length > 0 &&
         amounts.every(Helpers.isPositiveNumber):
      formatAmo = amounts;
      break;
    default:
      console.log('No amounts set.');
  } // fi switch
  return function (payment) {
    payment.amounts = formatAmo;
    return Promise.resolve(payment);
  };
};

Payment.from = function (origin) {
  var that = this;
  var wallet = this._wallet;
  var addresses = null;
  var change = null;
  var pkFormat = Helpers.detectPrivateKeyFormat(origin);
  var wifs = []; // only used fromPrivateKey
  var fromAccId = null;
  var watchOnly = false;

  switch (true) {
    // no origin => assume origin = all the legacy addresses (non - watchOnly)
    case origin === null || origin === undefined || origin === '':
      addresses = wallet.spendableActiveAddresses;
      change = addresses[0];
      break;
    // single bitcoin address
    case Helpers.isBitcoinAddress(origin):
      addresses = [origin];
      change = origin;
      break;
    // single account index
    case Helpers.isPositiveInteger(origin) &&
         (origin < wallet.hdwallet.accounts.length):
      var fromAccount = wallet.hdwallet.accounts[origin];
      addresses = [fromAccount.extendedPublicKey];
      change = fromAccount.changeAddress;
      fromAccId = origin;
      break;
    // multiple legacy addresses
    case Array.isArray(origin) &&
         origin.length > 0 &&
         origin.every(Helpers.isBitcoinAddress):
      addresses = origin;
      change = addresses[0];
      break;
    // from PrivateKey
    case (pkFormat !== null):
      var key = Helpers.privateKeyStringToKey(origin, pkFormat);
      key.compressed = false;
      var addrUncomp = key.getAddress();
      var uWIF = key.toWIF();
      key.compressed = true;
      var addrComp = key.getAddress();
      var cWIF = key.toWIF();

      var ukey = wallet.key(addrUncomp);
      var ckey = wallet.key(addrComp);

      if (ukey && ukey.isWatchOnly) {
        wifs = [uWIF];
        addresses = [addrUncomp];
        change = addrUncomp;
        watchOnly = true;
      } else if (ckey && ckey.isWatchOnly) {
        wifs = [cWIF];
        addresses = [addrComp];
        change = addrComp;
        watchOnly = true;
      } else {
        wifs = [cWIF, uWIF];
        addresses = [addrComp, addrUncomp];
        change = addrComp;
      }
      break;
    default:
      console.log('No origin set.');
  } // fi switch
  return function (payment) {
    payment.from = addresses;
    payment.change = change;
    payment.wifKeys = wifs;
    payment.fromAccountIdx = fromAccId;
    payment.fromWatchOnly = watchOnly;

    return getUnspents(wallet, addresses, function onNotice (notice) {
      that.emit('message', { text: notice });
    }).then(
      function (coins) {
        payment.coins = coins;
        return payment;
      }
    ).catch(
      // this could fail for network issues or no-balance
      function (error) {
        if (error !== 'No free outputs to spend') {
          that.emit('error', { error: 'ERR_FETCH_UNSPENT' });
        }
        console.log(error);
        payment.coins = [];
        return payment;
      }
    );
  };
};

Payment.updateFees = function () {
  return function (payment) {
    return API.getFees().then(
      function (fees) {
        payment.fees = fees;
        payment.feePerByte = fees.regular;
        return payment;
      }
    ).catch(
      // this could fail for network issues - fallback default fee
      function (error) {
        console.log(error);
        return payment;
      }
    );
  };
};

Payment.updateFeePerKb = function (fee) {
  return function (payment) {
    if (['regular', 'priority'].indexOf(fee) > -1) {
      fee = payment.fees[fee];
    }
    payment.feePerByte = fee;
    return Promise.resolve(payment);
  };
};

Payment.prebuild = function () {
  return function (payment) {
    let toCoin = (to, amount) => new Coin({ address: to, value: amount })
    let targets = zipWith(toCoin, payment.to || [], payment.amounts || [])
    // console.log('effectiveBalance: ', effectiveBalance(payment.feePerByte, payment.coins).value)
    // console.log('realEffectiveBalance: ', filteredEffectiveBalance(payment.feePerByte, payment.coins))
    payment.selection = descentDraw(targets, payment.feePerByte, payment.coins, payment.change)
    // payment.selection = ascentDraw(targets, payment.feePerByte, payment.coins, payment.change)
    return Promise.resolve(payment);
  };
};

// Payment.build = function (feeToMiners) {
//   // feeToMiners :: boolean (if true blockchain fee is given to the miners)
//   return function (payment) {
//     try {
//       // payment.transaction = new Transaction(payment, this);
//       return Promise.resolve(payment);
//     } catch (e) {
//       return Promise.reject({ error: e, payment: payment });
//     }
//   }.bind(this);
// };

Payment.sign = function (password) {
  var wallet = this._wallet;
  return function (payment) {
    payment.transaction = sign(password, wallet, payment.selection)    
    console.log(payment.transaction.getId())
    console.log(payment.transaction.toHex())
    // var importWIF = function (WIF) {
    //   wallet.importLegacyAddress(WIF, 'Redeemed code.', password)
    //     .then(function (A) { A.archived = true; });
    // };

    // if (!payment.transaction) throw new Error('This transaction hasn\'t been built yet');
    // if (Array.isArray(payment.wifKeys) && !payment.fromWatchOnly) payment.wifKeys.forEach(importWIF);

    // payment.transaction.addPrivateKeys(getPrivateKeys(wallet, password, payment));
    // payment.transaction.sortBIP69();
    // payment.transaction = payment.transaction.sign();
    return Promise.resolve(payment);
  };
};

Payment.publish = function () {
  return function (payment) {
    var success = function () {
      payment.txid = payment.transaction.getId();
      return payment;
    };

    var handleError = function (e) {
      throw e.message || e.responseText || e;
    };

    return API.pushTx(payment.transaction.toHex())
      .then(success).catch(handleError);
  };
};

module.exports = Payment;

// Helper functions
// function getKey (priv, addr) {
//   var format = Helpers.detectPrivateKeyFormat(priv);
//   var key = Helpers.privateKeyStringToKey(priv, format);
//   var network = constants.getNetwork();
//   var ckey = new Bitcoin.ECPair(key.d, null, {compressed: true, network: network});
//   var ukey = new Bitcoin.ECPair(key.d, null, {compressed: false, network: network});
//   if (ckey.getAddress() === addr) {
//     return ckey;
//   } else if (ukey.getAddress() === addr) {
//     return ukey;
//   }
//   return key;
// }

// obtain private key for an address
// from Address
// function getKeyForAddress (wallet, password, addr) {
//   var k = wallet.key(addr).priv;
//   var privateKeyBase58 = password == null ? k
//       : WalletCrypto.decryptSecretWithSecondPassword(k, password, wallet.sharedKey, wallet.pbkdf2_iterations);
//   return getKey(privateKeyBase58, addr);
// }

// getXPRIV :: wallet -> password -> index -> xpriv
// function getXPRIV (wallet, password, accountIndex) {
//   var fromAccount = wallet.hdwallet.accounts[accountIndex];
//   return fromAccount.extendedPrivateKey == null || password == null
//     ? fromAccount.extendedPrivateKey
//     : WalletCrypto.decryptSecretWithSecondPassword(fromAccount.extendedPrivateKey, password, wallet.sharedKey, wallet.pbkdf2_iterations);
// }

// getKeyForPath :: xpriv -> path -> ECPair
// function getKeyForPath (extendedPrivateKey, neededPrivateKeyPath) {
//   var keyring = new KeyRing(extendedPrivateKey);
//   return keyring.privateKeyFromPath(neededPrivateKeyPath).keyPair;
// }

// getPrivateKeys :: wallet -> password -> payment -> [private key]
// function getPrivateKeys (wallet, password, payment) {
//   var transaction = payment.transaction;
//   var privateKeys = [];
//   // if from Account
//   if (Helpers.isPositiveInteger(payment.fromAccountIdx)) {
//     var xpriv = getXPRIV(wallet, password, payment.fromAccountIdx);
//     privateKeys = transaction.pathsOfNeededPrivateKeys.map(getKeyForPath.bind(this, xpriv));
//   }
//   // if from Addresses or redeem code (private key)
//   if (payment.from && payment.from.every(Helpers.isBitcoinAddress) && !payment.fromWatchOnly) {
//     privateKeys = payment.wifKeys.length
//       ? transaction.addressesOfNeededPrivateKeys.map(function (a, i) { return getKey(payment.wifKeys[i], a); })
//       : transaction.addressesOfNeededPrivateKeys.map(getKeyForAddress.bind(null, wallet, password));
//   }
//   // if from Watch Only
//   if (payment.from && Helpers.isBitcoinAddress(payment.from[0]) && payment.fromWatchOnly) {
//     privateKeys = transaction.addressesOfNeededPrivateKeys.map(getKey.bind(null, payment.wifKeys[0]));
//   }
//   return privateKeys;
// }

////////////////////////////////////////////////////////////////////////////////
// new functions

const scriptToAddress = coin => {
  const scriptBuffer = Buffer.from(coin.script, 'hex');
  let network = constants.getNetwork(Bitcoin);
  const address = Bitcoin.address.fromOutputScript(scriptBuffer, network).toString();
  return assoc('priv', address, coin)
}


const getUnspents = (wallet, source, notify) => {
  switch (true) {
    case Helpers.isXpubKey(prop(0, source)):
      const index = prop('index', wallet.hdwallet.account(source[0]))
      return API.getUnspent(source, -1)
                .then(prop('unspent_outputs'))
                .then(over(compose(mapped, lensProp('xpub')), assoc('index', index)))
                .then(map(Coin.fromJS));
    case is(Array, source):
      return API.getUnspent(source, -1)
                .then(prop('unspent_outputs'))
                .then(over(mapped, scriptToAddress))
                .then(map(Coin.fromJS));
    default:
      return Promise.reject('WRONG_SOURCE_FOR_UNSPENTS');
  }
}
