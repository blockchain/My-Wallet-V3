'use strict';

var Bitcoin       = require('bitcoinjs-lib');
var MyWallet      = require('./wallet');
var WalletCrypto  = require('./wallet-crypto');
var Transaction   = require('./transaction');
var API           = require('./api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

////////////////////////////////////////////////////////////////////////////////
//// Payment Class
////////////////////////////////////////////////////////////////////////////////

function Payment (payment) {
  this.payment = Payment.return(payment);
  // type definitions
  // payment.from           :: [bitcoin address || xpub]
  // payment.change         :: [bitcoin address]
  // payment.wifKeys        :: [WIF]
  // payment.fromAccountIdx :: Integer
  // payment.sweepAmount    :: Integer
  // payment.sweepFee       :: Integer
  // payment.forcedFee      :: Integer
  // payment.feePerKb       :: Integer
  // payment.coins          :: [coins]
  // payment.to             :: [bitcoin address]
  // payment.amounts        :: [Integer]
  // payment.transaction    :: Transaction
  // payment.note           :: String
  // payment.listener       :: {Functions}
}
////////////////////////////////////////////////////////////////////////////////
// Payment instance methods (can be chained)
Payment.prototype.to = function (destinations) {
  this.payment = this.payment.then(Payment.to(destinations));
  return this;
};

Payment.prototype.from = function (origin) {
  this.payment = this.payment.then(Payment.from(origin));
  return this;
};

Payment.prototype.amount = function (amounts) {
  this.payment = this.payment.then(Payment.amount(amounts));
  return this;
};

Payment.prototype.then = function (myFunction) {
  this.payment = this.payment.then(myFunction);
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

Payment.prototype.listener = function (listener) {
  this.payment = this.payment.then(Payment.listener(listener));
  return this;
};

Payment.prototype.sweep = function () {
  this.payment = this.payment.then(Payment.sweep());
  return this;
};

Payment.prototype.fee = function (fee) {
  this.payment = this.payment.then(Payment.fee(fee));
  return this;
};

Payment.prototype.feePerKb = function (feePerKb) {
  this.payment = this.payment.then(Payment.feePerKb(feePerKb));
  return this;
};

Payment.prototype.note = function (note) {
  this.payment = this.payment.then(Payment.note(note));
  return this;
};

Payment.prototype.build = function () {
  this.payment = this.payment.then(Payment.build());
  return this;
};

Payment.prototype.buildbeta = function () {
  this.payment = this.payment.then(Payment.buildbeta());
  return this;
};

Payment.prototype.sign = function (password) {
  this.payment = this.payment.then(Payment.sign(password));
  return this;
};

Payment.prototype.publish = function () {
  this.payment = this.payment.then(Payment.publish());
  return this;
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
Payment.return = function (payment) {
  var p = payment ? payment : {}
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
      return MyWallet.wallet.hdwallet.accounts[i].receiveAddress;}
    else {
      return i;}
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
      console.log('No destination set.')
  } // fi switch
  return function (payment) {
    payment.to = formatDest;
    return Promise.resolve(payment);
  };
};

Payment.listener = function (listener) {
  return function (payment) {
    payment.listener = listener
    return Promise.resolve(payment);
  };
};

Payment.sweep = function () {
  return function (payment) {
    payment.amounts = payment.sweepAmount ? [payment.sweepAmount] : undefined;
    payment.forcedFee = payment.sweepFee;
    return Promise.resolve(payment);
  };
};

Payment.note = function (note) {
  var publicNote = Helpers.isString(note) ? note : null;
  return function (payment) {
    payment.note = publicNote;
    return Promise.resolve(payment);
  };
};

Payment.fee = function (amount) {
  var forcedFee = Helpers.isPositiveNumber(amount) ? amount : null;
  return function (payment) {
    payment.forcedFee = forcedFee;
    return Promise.resolve(payment);
  };
};

Payment.feePerKb = function (amount) {
  var feePerKb = Helpers.isPositiveNumber(amount) ? amount : null;
  return function(payment) {
    payment.feePerKb = feePerKb;
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
      console.log('No amounts set.')
  } // fi switch
  return function (payment) {
    payment.amounts = formatAmo;
    payment.forcedFee = null;
    return Promise.resolve(payment);
  };
};

Payment.from = function (origin) {
  var addresses  = null;
  var change     = null;
  var pkFormat   = Helpers.detectPrivateKeyFormat(origin);
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
      change    = origin;
      break;
    // single account index
    case Helpers.isPositiveInteger(origin) &&
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
      var key    = Helpers.privateKeyStringToKey(origin, pkFormat);
      key.pub.compressed = false;
      var addrUncomp = key.pub.getAddress().toString();
      var uWIF = key.toWIF();
      key.pub.compressed = true;
      var addrComp = key.pub.getAddress().toString();
      var cWIF = key.toWIF();
      wifs      = [cWIF, uWIF];
      addresses = [addrComp, addrUncomp];
      change    = addrComp;
      break;
    default:
      console.log('No origin set.')
  } // fi switch
  return function (payment) {
    payment.from           = addresses;
    payment.change         = change;
    payment.wifKeys        = wifs;
    payment.fromAccountIdx = fromAccId;
    payment.forcedFee      = null;

    return getUnspentCoins(addresses).then(
      function (coins) {
        var sweep = computeSuggestedSweep(coins, payment.feePerKb);
        payment.sweepAmount = sweep[0];
        payment.sweepFee    = sweep[1];
        payment.coins       = coins;
        return payment;
      }
    ).catch(
      // this could fail for network issues or no-balance
      function (error) {
        console.log(error);
        payment.sweepAmount = 0;
        payment.sweepFee    = 0;
        payment.coins       = [];
        return payment;
      }
    );
  };
};

Payment.build = function () {

  return function (payment) {
    try {
      payment.transaction = new Transaction(payment.coins, payment.to,
                                            payment.amounts, payment.forcedFee,
                                            payment.feePerKb, payment.change,
                                            payment.listener);
      payment.fee = payment.transaction.fee;
    } catch (err) {
      console.log('Error Building: ' + err);
    }
    return Promise.resolve(payment);
  };
};

Payment.buildbeta = function () {
  // I should check for all the payment needed fields and reject with the wrong payment
  // then the frontend can show the error and recreate the payment with the same state
  return function (payment) {
    try {
      payment.transaction = new Transaction(payment.coins, payment.to,
                                            payment.amounts, payment.forcedFee,
                                            payment.feePerKb, payment.change,
                                            payment.listener);
      payment.fee = payment.transaction.fee;
      return Promise.resolve(payment);
    } catch (e) {
      return Promise.reject({ error: e, payment: payment });
    }
  };
};

Payment.sign = function (password) {
  return function (payment) {
    function importWIF (WIF) {
      MyWallet.wallet.importLegacyAddress(WIF, 'Redeemed code.', password)
        .then(function (A){A.archived = true;});
    };
    if (Array.isArray(payment.wifKeys)) payment.wifKeys.forEach(importWIF);
    if (!payment.transaction) throw 'You cannot sign a non-build transaction.'
    payment.transaction.addPrivateKeys(getPrivateKeys(password, payment));
    payment.transaction.sortBIP69();
    payment.transaction = payment.transaction.sign();
    return Promise.resolve(payment);
  };
};

Payment.publish = function () {
  return function (payment) {

    var success = function (tx_hash) {
      console.log('published');
      payment.txid = tx_hash;
      return payment;
    };

    var handleError = function (e) {
      throw e.message || e.responseText || e;
    };

    var getValue = function (coin) {return coin.value;};
    var isSmall = function (value) {return value < 500000;};
    var anySmall = payment.transaction.outs.map(getValue).some(isSmall);
    if(anySmall && payment.note !== undefined && payment.note !== null)
      {throw 'There is an output too small to publish a note';}

    return API.pushTx(payment.transaction, payment.note)
      .then(success).catch(handleError);
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
  }

  return API.getUnspent(addressList, 0).then(processCoins);
}

////////////////////////////////////////////////////////////////////////////////
// obtain private key for an address
// from Address
function getKeyForAddress (password, addr) {
  var k = MyWallet.wallet.key(addr).priv;
  var privateKeyBase58 = password == null ? k :
    WalletCrypto.decryptSecretWithSecondPassword( k
                                                , password
                                                , MyWallet.wallet.sharedKey
                                                , MyWallet.wallet.pbkdf2_iterations);
  var format = Helpers.detectPrivateKeyFormat(privateKeyBase58);
  var key    = Helpers.privateKeyStringToKey(privateKeyBase58, format);
  var ckey = new Bitcoin.ECKey(key.d, true);
  var ukey = new Bitcoin.ECKey(key.d, false);
  if (ckey.pub.getAddress().toString() === addr) {return ckey;}
  else if (ukey.pub.getAddress().toString() === addr) {return ukey;}
  return key;
}
////////////////////////////////////////////////////////////////////////////////
// getXPRIV :: password -> index -> xpriv
function getXPRIV (password, accountIndex) {
  var fromAccount = MyWallet.wallet.hdwallet.accounts[accountIndex];
  return fromAccount.extendedPrivateKey == null || password == null
    ? fromAccount.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword( fromAccount.extendedPrivateKey
                                                  , password
                                                  , MyWallet.wallet.sharedKey
                                                  , MyWallet.wallet.pbkdf2_iterations);
};
////////////////////////////////////////////////////////////////////////////////
// getKeyForPath :: xpriv -> path -> [private key]
function getKeyForPath (extendedPrivateKey, neededPrivateKeyPath) {
  var keyring = new KeyRing(extendedPrivateKey);
  return keyring.privateKeyFromPath(neededPrivateKeyPath);
};

////////////////////////////////////////////////////////////////////////////////
// getPrivateKeys :: password -> payment -> [private key]
function getPrivateKeys (password, payment) {
  var transaction = payment.transaction;
  var privateKeys = [];
  // if from Account
  if (Helpers.isPositiveInteger(payment.fromAccountIdx)) {
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
function computeSuggestedSweep(coins, feePerKb){
  feePerKb = Helpers.isNumber(feePerKb) ? feePerKb : MyWallet.wallet.fee_per_kb;
  var getValue = function (coin) { return coin.value; };
  var sortedCoinValues = coins.map(getValue).sort(function (a, b) { return b - a });
  var accumulatedValues = sortedCoinValues
    .map(function (element, index, array) {
      var fee = Helpers.guessFee(index + 1, 2, feePerKb);
      return [array.slice(0, index + 1).reduce(Helpers.add, 0) - fee, fee];  //[total-fee, fee]
    }).sort(function (a, b) { return b[0] - a[0] });
  // dont return negative max spendable
  if (accumulatedValues[0][0] < 0) { accumulatedValues[0][0] = 0; }
  return accumulatedValues[0];
};


// example of usage

// 1PHHtxKAgbpwvK3JfwDT1Q5WbGmGrqm8gf
// 1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN
//
//
// var payment = new Blockchain.Payment();
// payment
//   .from('1PHHtxKAgbpwvK3JfwDT1Q5WbGmGrqm8gf')
//   .from('1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN')
//   .amount(10000)
//   .to('1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF')
//   .build()
//   .sign('hola')
//   .payment.then(function (p){console.log( 'result: ' +  JSON.stringify(p, null, 2));})
//           .catch(function (e){console.log( 'error: ' + e);});

//
// var error = function (e) {console.log('error: ' + e);}
// var success = function (p) {console.log('final: '); console.log(p); return p;}
// var op1Fail = function (p) {throw 'I failed!!';}
// var op2Good = function (p) {console.log('op'); console.log(p); p.op2 = true; return p;}
// var op3Good = function (p) {console.log('op'); console.log(p);p.op3 = true; return p;}
// var print   = function (p) {console.log('from: '+ p.from);}
//
// var payment = new Blockchain.Payment();
// payment
//   .from('1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN')
//   .then(op2Good)
//   .amount(10000)
//   .sideEffect(print)
//   .then(op3Good)
//   .then(op1Fail)
//   .then(success)
//   .catch(error)
//
// var error        = function (e) {console.log('error: ' + JSON.stringify(e, null, 2));}
// var buildFailure = function (e) {console.log(e.error); return e.payment;}
// var success      = function (p) {console.log('final: '); console.log(p); return p;}
// var print        = function (p) {console.log('promise: '); console.log(p);}
//
// var payment = new Blockchain.Payment();
// payment
//   .from(1)
//   .amount([10000,20000,30000])
//   .to(['13kFBeNZMptwvP9LXEvRdG5W5WWPhc6eaG', 0, 2])
//   .sideEffect(print)
//   .buildbeta()
//   .catch(buildFailure)
//   .sign()
//   .publish()
//   .then(success)
//   .catch(error)
