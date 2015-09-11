'use strict';

var assert        = require('assert');
var Bitcoin       = require('bitcoinjs-lib');
var RSVP          = require('rsvp');
var MyWallet      = require('./wallet');
var WalletCrypto  = require('./wallet-crypto');
var HDAccount     = require('./hd-account');
var Transaction   = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var Helpers       = require('./helpers');
var KeyRing       = require('./keyring');

var Payment = function(){
  this.origins       = null;
  this.destinations  = null;
  this.changeAddress = null;
  this.amount        = null;
  this.fee           = null;
  this.listener      = null;
  this.sweepAmount   = null;
  this.sweepFee      = null;
  this.coins         = null;
};


//////////////////////////////////////////////////////////////////////////////
// Public Methods
//////////////////////////////////////////////////////////////////////////////
// printPayment :: Payment -> ()
function print(payment) {
  console.log(JSON.stringify(payment, null, 2));
};
//////////////////////////////////////////////////////////////////////////////
// from :: Origin -> Payment -> Promise Payment
function from(origin) {

  var pristine = null;
  var change   = null;
  switch (true) {
    // assume origin all the legacy addresses
    case origin === null || origin === undefined || origin === '':
      pristine = MyWallet.wallet.activeAddresses;
      change   = pristine[0];
      break;
    // single bitcoin address
    case Helpers.isBitcoinAddress(origin):
      pristine = [origin];
      change   = pristine;
      break;
    // single account index
    case Helpers.isNumber(origin) &&
         (0 <= origin) &&
         (origin < MyWallet.wallet.hdwallet.accounts.length):
      var fromAccount = MyWallet.wallet.hdwallet.accounts[origin];
      pristine = [fromAccount.extendedPublicKey];
      change   = fromAccount.changeAddress;
      break;
    // multiple legacy addresses
    case Array.isArray(origin) &&
         origin.length > 0 &&
         origin.every(Helpers.isBitcoinAddress):
      pristine = origin;
      change   = pristine[0];
      break;
    default:
      // return a function returning a rejected promise
      return function(payment){
                var defer = RSVP.defer();
                defer.reject("non-recognized origin");
                return defer.promise;
             };
  } // fi switch

  var coinsP  = getUnspentCoins(pristine);
  return function(payment){
    return coinsP.then(
      function(coins){
        var original    = (payment instanceof Payment) ? payment : new Payment();
        var p           = Helpers.merge({},original);
        var sweep       = computeSuggestedSweep(coins);
        p.sweepAmount   = sweep[0];
        p.sweepFee      = sweep[1];
        p.coins         = coins;
        p.origins       = pristine;
        p.changeAddress = change;
        return p;
      }
    );
  };
};

//////////////////////////////////////////////////////////////////////////////
// to :: destination -> Payment -> Promise Payment
function to(destination) {

  var recipient = null;
  switch (true) {
    // single bitcoin address
    case Helpers.isBitcoinAddress(destination):
      recipient = destination;
      break;
      // single account index
    case Helpers.isNumber(destination) &&
         (0 <= destination) &&
         (destination < MyWallet.wallet.hdwallet.accounts.length):
      var account = MyWallet.wallet.hdwallet.accounts[destination];
      recipient   = account.receiveAddress;
      break;
    default:
  } // fi switch
  return function(payment){
      var defer = RSVP.defer();
      // var original    = (payment instanceof Payment) ? payment : new Payment();
      var p           = Helpers.merge({},payment);
      p.destinations  = recipient;
      defer.resolve(p);
      return defer.promise;
    };
};
//////////////////////////////////////////////////////////////////////////////
// Private Methods
//////////////////////////////////////////////////////////////////////////////
// getUnspentCoins :: [address] -> Promise [coins]
function getUnspentCoins(addressList) {
  var defer = RSVP.defer();
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



module.exports = {
  Payment: Payment,
  print: print,
  from: from,
  to: to
};



// var p = new Blockchain.Spencer.Payment()
// var f = Blockchain.Spencer.fromAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF");
// var pp = f(p);
