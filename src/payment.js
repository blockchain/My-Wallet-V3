'use strict';

var Bitcoin = require('bitcoinjs-lib');
var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');
var Transaction = require('./transaction');
var API = require('./api');
var Helpers = require('./helpers');
var KeyRing = require('./keyring');
var EventEmitter = require('events');
var util = require('util');

// Payment Class

function Payment (payment) {
  EventEmitter.call(this);

  var serverFeeFallback = {
    'default': {
      'fee': 35000.00,
      'surge': false,
      'ok': true
    },
    'estimate': [{
      'fee': 45000.0,
      'surge': false,
      'ok': true
    }, {
      'fee': 35000.00,
      'surge': false,
      'ok': true
    }, {
      'fee': 22000.0,
      'surge': false,
      'ok': true
    }, {
      'fee': 19000.0,
      'surge': false,
      'ok': true
    }, {
      'fee': 15000.0,
      'surge': false,
      'ok': true
    }, {
      'fee': 12000.0,
      'surge': false,
      'ok': true
    }]
  };

  var initialState = {
    fees: serverFeeFallback,  // fallback for fee-service
    coins: [],  // original set of unspents (set by .from)
    selectedCoins: [], // set of coins that are going to be passed to new Transaction
    from: null, // origin
    amounts: [], // list of amounts to spend entered in the form
    to: [], // list of destinations entered in the form
    feePerKb: serverFeeFallback.default.fee, // default fee-per-kb used in basic send
    extraFeeConsumption: 0, // if there is change consumption to fee will be reflected here
    sweepFee: 0,  // computed fee to sweep an account in basic send (depends on fee-per-kb)
    sweepAmount: 0, // computed max spendable amount depending on fee-per-kb
    balance: 0, // sum of all unspents values with any filtering     [ payment.sumOfCoins ]
    finalFee: 0, // final absolute fee that it is going to be used no matter how was obtained (advanced or regular send)
    changeAmount: 0, // final change
    absoluteFeeBounds: [0, 0, 0, 0, 0, 0], // fee bounds (absolute) per fixed amount
    sweepFees: [0, 0, 0, 0, 0, 0], // sweep absolute fee per each fee per kb (1, 2, 3, 4, 5, 6)
    maxSpendableAmounts: [0, 0, 0, 0, 0, 0],  // max amount per each fee-per-kb
    confEstimation: 'unknown',
    txSize: 0 // transaciton size
  };

  var p = payment ? payment : initialState;
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
  this.payment = this.payment.then(Payment.to(destinations));
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.from = function (origin, absoluteFee) {
  this.payment = this.payment.then(Payment.from.bind(this, origin, absoluteFee)());
  this.then(Payment.prebuild(absoluteFee));
  return this;
};

Payment.prototype.fee = function (absoluteFee) {
  this.then(Payment.prebuild(absoluteFee));
  return this;
};

Payment.prototype.amount = function (amounts, absoluteFee) {
  this.payment = this.payment.then(Payment.amount(amounts, absoluteFee));
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

Payment.prototype.useAll = function (absoluteFee) {
  this.payment = this.payment.then(Payment.useAll(absoluteFee));
  this.then(Payment.prebuild(absoluteFee));
  // this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.updateFees = function () {
  this.payment = this.payment.then(Payment.updateFees());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.prebuild = function (absoluteFee) {
  this.payment = this.payment.then(Payment.prebuild(absoluteFee));
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.build = function () {
  this.payment = this.payment.then(Payment.build.bind(this)());
  this.sideEffect(this.emit.bind(this, 'update'));
  return this;
};

Payment.prototype.sign = function (password) {
  this.payment = this.payment.then(Payment.sign(password));
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
  var p = payment ? payment : {};
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
  var formatDest = null;
  var isValidIndex = function (i) {
    return Helpers.isPositiveInteger(i) && MyWallet.wallet.isUpgradedToHD && (i < MyWallet.wallet.hdwallet.accounts.length);
  };
  var accountToAddress = function (i) {
    if (Helpers.isPositiveInteger(i)) {
      return MyWallet.wallet.hdwallet.accounts[i].receiveAddress;
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

Payment.useAll = function (absoluteFee) {
  return function (payment) {
    if (Helpers.isPositiveNumber(absoluteFee)) {
      var balance = payment.balance ? payment.balance : 0;
      payment.amounts = (balance - absoluteFee) > 0 ? [balance - absoluteFee] : [];
    } else {
      payment.amounts = payment.sweepAmount ? [payment.sweepAmount] : [];
    }
    return Promise.resolve(payment);
  };
};

Payment.amount = function (amounts, absoluteFee) {
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
  var addresses = null;
  var change = null;
  var pkFormat = Helpers.detectPrivateKeyFormat(origin);
  var wifs = []; // only used fromPrivateKey
  var fromAccId = null;
  var watchOnly = false;
  
  switch (true) {
    // no origin => assume origin = all the legacy addresses (non - watchOnly)
    case origin === null || origin === undefined || origin === '':
      addresses = MyWallet.wallet.spendableActiveAddresses;
      change = addresses[0];
      break;
    // single bitcoin address
    case Helpers.isBitcoinAddress(origin):
      addresses = [origin];
      change = origin;
      break;
    // single account index
    case Helpers.isPositiveInteger(origin) &&
         (origin < MyWallet.wallet.hdwallet.accounts.length):
      var fromAccount = MyWallet.wallet.hdwallet.accounts[origin];
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

      var ukey = MyWallet.wallet.key(addrUncomp);
      var ckey = MyWallet.wallet.key(addrComp);

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

    return getUnspentCoins(addresses).then(
      function (coins) {
        payment.coins = coins;
        return payment;
      }
    ).catch(
      // this could fail for network issues or no-balance
      function (error) {
        if (error !== 'No free outputs to spend') {
          that.emit('error', {error:'ERR_FETCH_UNSPENT' });
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
            payment.feePerKb = fees.default.fee;
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

Payment.prebuild = function (absoluteFee) {
  return function (payment) {
    var dust = Bitcoin.networks.bitcoin.dustThreshold;

    var usableCoins = Transaction.filterUsableCoins(payment.coins, payment.feePerKb);
    var max = Transaction.maxAvailableAmount(usableCoins, payment.feePerKb);
    payment.sweepAmount = max.amount;
    payment.sweepFee = max.fee;
    payment.balance = Transaction.sumOfCoins(payment.coins);

    // compute max spendable limits per each fee-per-kb
    var maxSpendablesPerFeePerKb = function (e) {
      var c = Transaction.filterUsableCoins(payment.coins, e.fee);
      var s = Transaction.maxAvailableAmount(c, e.fee);
      return s.amount;
    };
    payment.maxSpendableAmounts = payment.fees.estimate.map(maxSpendablesPerFeePerKb);
    payment.sweepFees = payment.maxSpendableAmounts.map(function (v) { return payment.balance - v; });

    // if amounts defined refresh computations
    if (Array.isArray(payment.amounts) && payment.amounts.length > 0) {
      // coin selection
      var s;
      if (Helpers.isPositiveNumber(absoluteFee)) {
        s = Transaction.selectCoins(payment.coins, payment.amounts, absoluteFee, true);
      } else {
        s = Transaction.selectCoins(usableCoins, payment.amounts, payment.feePerKb, false);
      }
      payment.finalFee = s.fee;
      payment.selectedCoins = s.coins;
      payment.txSize = Helpers.guessSize(payment.selectedCoins.length, payment.amounts.length +1 );
      var c = Transaction.sumOfCoins(payment.selectedCoins) - payment.amounts.reduce(Helpers.add, 0) - payment.finalFee;
      payment.changeAmount = c > 0 ? c : 0;

      // change consumption
      if (payment.changeAmount > 0 && payment.changeAmount < dust) {
        payment.extraFeeConsumption = payment.changeAmount;
        payment.changeAmount = 0;
      } else {
        payment.extraFeeConsumption = 0;
      }

      // compute absolute fee bounds for 1,2,3,4,5,6 block confirmations
      var toAbsoluteFee = function (e) {
        var c = Transaction.filterUsableCoins(payment.coins, e.fee);
        var s = Transaction.selectCoins(c, payment.amounts, e.fee, false);
        return s.fee;
      };
      payment.absoluteFeeBounds = payment.fees.estimate.map(toAbsoluteFee);

      // estimation of confirmation in number of blocks
      payment.confEstimation = Transaction.confirmationEstimation(payment.absoluteFeeBounds, payment.finalFee);
    }

    return Promise.resolve(payment);
  };
};

Payment.build = function () {
  return function (payment) {
    try {
      payment.transaction = new Transaction(payment, this);
      return Promise.resolve(payment);
    } catch (e) {
      return Promise.reject({ error: e, payment: payment });
    }
  }.bind(this);
};

Payment.sign = function (password) {
  return function (payment) {
    var importWIF = function (WIF) {
      MyWallet.wallet.importLegacyAddress(WIF, 'Redeemed code.', password)
        .then(function (A) { A.archived = true; });
    };

    if (!payment.transaction) throw 'This transaction hasn\'t been built yet';
    if (Array.isArray(payment.wifKeys) && !payment.fromWatchOnly) payment.wifKeys.forEach(importWIF);

    payment.transaction.addPrivateKeys(getPrivateKeys(password, payment));
    payment.transaction.sortBIP69();
    payment.transaction = payment.transaction.sign();
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

    payment.transaction = payment.transaction.build();

    return API.pushTx(payment.transaction.toHex())
      .then(success).catch(handleError);
  };
};

module.exports = Payment;

// Helper functions

// getUnspentCoins :: [address] -> Promise [coins]
function getUnspentCoins (addressList) {
  var processCoins = function (obj) {
    var processCoin = function (utxo) {
      var txBuffer = new Buffer(utxo.tx_hash, 'hex');
      Array.prototype.reverse.call(txBuffer);
      utxo.hash = txBuffer.toString('hex');
      utxo.index = utxo.tx_output_n;
    };
    obj.unspent_outputs.forEach(processCoin);
    return obj.unspent_outputs;
  };

  return API.getUnspent(addressList, -1).then(processCoins);
}

function getKey (priv, addr) {
  var format = Helpers.detectPrivateKeyFormat(priv);
  var key = Helpers.privateKeyStringToKey(priv, format);
  var ckey = new Bitcoin.ECPair(key.d, null, {compressed: true});
  var ukey = new Bitcoin.ECPair(key.d, null, {compressed: false});
  if (ckey.getAddress() === addr) {
    return ckey;
  } else if (ukey.getAddress() === addr) {
    return ukey;
  }
  return key;
}

// obtain private key for an address
// from Address
function getKeyForAddress (password, addr) {
  var k = MyWallet.wallet.key(addr).priv;
  var privateKeyBase58 = password == null ? k
      : WalletCrypto.decryptSecretWithSecondPassword(k, password,
          MyWallet.wallet.sharedKey, MyWallet.wallet.pbkdf2_iterations);
  return getKey(privateKeyBase58, addr);
}

// getXPRIV :: password -> index -> xpriv
function getXPRIV (password, accountIndex) {
  var fromAccount = MyWallet.wallet.hdwallet.accounts[accountIndex];
  return fromAccount.extendedPrivateKey == null || password == null
    ? fromAccount.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword(fromAccount.extendedPrivateKey, password,
      MyWallet.wallet.sharedKey, MyWallet.wallet.pbkdf2_iterations);
}

// getKeyForPath :: xpriv -> path -> ECPair
function getKeyForPath (extendedPrivateKey, neededPrivateKeyPath) {
  var keyring = new KeyRing(extendedPrivateKey);
  return keyring.privateKeyFromPath(neededPrivateKeyPath).keyPair;
}

// getPrivateKeys :: password -> payment -> [private key]
function getPrivateKeys (password, payment) {
  var transaction = payment.transaction;
  var privateKeys = [];
  // if from Account
  if (Helpers.isPositiveInteger(payment.fromAccountIdx)) {
    var xpriv = getXPRIV(password, payment.fromAccountIdx);
    privateKeys = transaction.pathsOfNeededPrivateKeys.map(getKeyForPath.bind(this, xpriv));
  }
  // if from Addresses
  if (payment.from && payment.from.every(Helpers.isBitcoinAddress) && !payment.fromWatchOnly) {
    privateKeys = transaction.addressesOfNeededPrivateKeys.map(getKeyForAddress.bind(this, password));
  }
  // if from Watch Only
  if (payment.from && Helpers.isBitcoinAddress(payment.from[0]) && payment.fromWatchOnly) {
    privateKeys = transaction.addressesOfNeededPrivateKeys.map(getKey.bind(null, payment.wifKeys[0]));
  }
  return privateKeys;
}
