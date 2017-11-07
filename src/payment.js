'use strict';

var Bitcoin = require('bitcoinjs-lib');
// var WalletCrypto = require('./wallet-crypto');
// var Transaction = require('./transaction');
var API = require('./api');
var Helpers = require('./helpers');
// var KeyRing = require('./keyring');
var EventEmitter = require('events');
var util = require('util');
var constants = require('./constants');
// var mapObjIndexed = require('ramda/src/mapObjIndexed');
const Coin = require('./bch/coin.js');
const { descentDraw, selectAll, addDustIfNecessary, isDustSelection } = require('./bch/coin-selection');
const { is, prop, lensProp, compose, assoc, over, map, zipWith, sum, lensIndex, not, forEach } = require('ramda');
const { mapped } = require('ramda-lens');
const { sign, signDust } = require('./btc/signer');
const BigInteger = require('bigi');

let sumCoins = compose(sum, map(c => c.value));

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
    lockSecret: undefined,
    fees: serverFeeFallback,  // fallback for fee-service
    coins: [],  // original set of unspents (set by .from)

    from: null, // origin
    amounts: [], // list of amounts to spend entered in the form
    to: [], // list of destinations entered in the form
    feePerByte: serverFeeFallback.regular, // default fee-per-kb used
    extraFeeConsumption: 0, // if there is change consumption to fee will be reflected here
    changeAmount: 0, // final change
    maxFees: {limits: { 'min': 0, 'max': 0 }, regular: 0, priority: 0}, // each fee-per-kb (regular, priority)
    maxSpendableAmounts: {limits: { 'min': 0, 'max': 0 }, regular: 0, priority: 0},  // max amount for each fee-per-kb
    selection: { fee: 0, inputs: [], outputs: [] },

    get sweepSelection () {
      return selectAll(this.feePerByte, this.coins, this.to);
    },
    get sweepFee () { // computed fee to sweep an account in basic send (depends on fee-per-kb)
      return this.sweepSelection.fee;
    },
    get sweepAmount () { // computed max spendable amount depending on fee-per-kb
      return sumCoins(this.sweepSelection.outputs);
    },
    get balance () { // sum of all unspents values with any filtering     [ payment.sumOfCoins ]
      return sumCoins(this.coins);
    },
    get finalFee () { // final absolute fee that it is going to be used no matter how was obtained (advanced or regular send)
      return this.selection.fee;
    },
    get txSize () { // transaction size
      let s = this.selection;
      return Helpers.guessSize(s.inputs.length, s.outputs.length);
    }
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
  this.sideEffect(this.emit.bind(this, 'update'));
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
    let sweepAmount = payment.sweepAmount;
    payment.amounts = sweepAmount ? [sweepAmount] : [];
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
    let toCoin = (to, amount) => new Coin({ address: to, value: amount });
    let targets = zipWith(toCoin, payment.to || [], payment.amounts || []);
    payment.selection = descentDraw(targets, payment.feePerByte, payment.coins, payment.change);
    return Promise.resolve(payment);
  };
};

Payment.sign = function (password) {
  var wallet = this._wallet;
  return function (payment) {
    console.log('going to sign')
    const getDustData = () => {
      if (isDustSelection(payment.selection)) {
        return API.getDust().then(
          (dust) => {
            payment.selection.outputs.push(Coin.dust());
            const f = (c) => { if(c.dust) { c.index = dust.tx_output_n; c.txHash = dust.tx_hash_big_endian; }; };
            const g = (c) => { if(c.dust) { c.index = dust.tx_index; c.script = new Buffer(dust.output_script, 'hex'); }; };
            forEach(f, payment.selection.inputs);
            forEach(g, payment.selection.outputs);
            payment.lockSecret = dust.lock_secret;
            return payment;
          }
        )
      } else {
        payment.lockSecret = undefined;
        return Promise.resolve(payment)
      }
    }
    const asyncSign = () => {
      if (payment.lockSecret) {
        payment.transaction = signDust(password, wallet, payment.selection);
        return payment;
      } else {
        payment.transaction = sign(password, wallet, payment.selection);
        return payment;
      }
    }
    return getDustData().then(asyncSign);
  };
};

Payment.publish = function () {
  return function (payment) {
    console.log('going to publish')
    var success = function () {
      payment.txid = payment.transaction.getId();
      return payment;
    };

    var handleError = function (e) {
      throw e.message || e.responseText || e;
    };

    return API.pushTx(payment.transaction.toHex(), payment.lockSecret)
      .then(success).catch(handleError);
  };
};


module.exports = Payment;


const scriptToAddress = coin => {
  const scriptBuffer = Buffer.from(coin.script, 'hex');
  let network = constants.getNetwork(Bitcoin);
  const address = Bitcoin.address.fromOutputScript(scriptBuffer, network).toString();
  return assoc('priv', address, coin);
};

const getUnspents = (wallet, source, notify) => {
  switch (true) {
    case Helpers.isXpubKey(prop(0, source)):
      const index = prop('index', wallet.hdwallet.account(source[0]));
      return API.getUnspent(source, -1)
                .then(prop('unspent_outputs'))
                .then(over(compose(mapped, lensProp('xpub')), assoc('index', index)))
                // uncomment for some coins replayable and some non replayable
                // .then(over(compose(lensIndex(0), lensProp('replayable')), not))
                // .then(over(compose(lensIndex(2), lensProp('replayable')), not))
                // .then(over(compose(lensIndex(4), lensProp('replayable')), not))
                // .then(over(compose(lensIndex(8), lensProp('replayable')), not))
                // uncomment for all coins replayable
                .then(over(compose(mapped, lensProp('replayable')), not))  // REMOVE THAT (FOR TEST)
                .then(map(Coin.fromJS)).then(addDustIfNecessary)
    case is(Array, source):
      return API.getUnspent(source, -1)
                .then(prop('unspent_outputs'))
                .then(over(mapped, scriptToAddress))
                .then(map(Coin.fromJS)).then(addDustIfNecessary)
    default:
      return Promise.reject('WRONG_SOURCE_FOR_UNSPENTS');
  }
};
