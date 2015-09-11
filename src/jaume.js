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


var S = function(listener) {

  if(typeof(listener) == "undefined" || listener == null) { listener = {}; };

  var getPrivateKeys    = null;  // function :: tx -> [keys]
  var note              = null;
  var secondPassword    = null;
  var sharedKey         = MyWallet.wallet.sharedKey;
  var pbkdf2_iterations = MyWallet.wallet.pbkdf2_iterations;
  var addressPair       = {};    // uncompressed Addr -> compressed Addr

  this.coins       = RSVP.defer().promise;
  this.destination = RSVP.defer().promise;
  this.change      = RSVP.defer().promise;
  this.sweep       = RSVP.defer().promise;
  this.tx          = RSVP.defer().promise;

  //////////////////////////////////////////////////////////////////////////////
  // Private Methods
  //////////////////////////////////////////////////////////////////////////////
  // buildTransaction :: object(tx info) -> Promise Tx
  function buildTransaction(object){
    console.log("building...");
    var toAddresses = object.destination[0] // destination
    console.log("-----> " + JSON.stringify(object.destination[1]));
    console.log("-----> " + JSON.stringify(object.sweep[0]));
    var amounts     = object.destination[1] ? object.destination[1] : object.sweep[0];   // amount  (if no amount is sweep)
    var forcedFee   = object.destination[2] // forcefee
    console.log("coins: " + JSON.stringify(object.coins, null, 2));
    console.log("to: " + JSON.stringify(toAddresses, null, 2));
    console.log("amounts: " + JSON.stringify(amounts, null, 2));
    console.log("forcedFee: " + JSON.stringify(forcedFee, null, 2));
    console.log("change: " + JSON.stringify(object.change, null, 2));
    return new Transaction(object.coins, toAddresses, amounts, forcedFee, object.change, listener);
  };

  //////////////////////////////////////////////////////////////////////////////
  // waits for all the promises until start building the tx
  // buildTransaction :: () -> Spender
  function build(){
    var promises = { coins: this.coins, destination: this.destination, sweep: this.sweep, change: this.change };
    this.tx      = RSVP.hash(promises).then(buildTransaction);
    return this;
  };
  //////////////////////////////////////////////////////////////////////////////
  // setPromise :: value -> Promise Value
  function setPromise (value){
    var defer = RSVP.defer();
    defer.resolve(value);
    return defer.promise;
  };

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
  ////////////////////////////////////////////////////////////////////////////////
  // publishTransaction :: Transaction -> Transaction
  function signTransaction(transaction) {
    var getValue = function(coin) {return coin.value;};
    var isSmall = function(value) {return value < 500000;};
    var anySmall = transaction.transaction.outs.map(getValue).some(isSmall);
    if(anySmall && note !== undefined && note !== null)
      {throw "There is an output too small to publish a note";}
    var keys = getPrivateKeys(transaction);
    transaction.addPrivateKeys(keys);
    transaction.randomizeOutputs();
    var signedTransaction = transaction.sign();
    return signedTransaction;
  };
  ////////////////////////////////////////////////////////////////////////////////
  // publishTransaction :: String -> Transaction -> Promise ()
  function publishTransaction(signedTransaction) {
    var defer = RSVP.defer();
    var success = function(tx_hash) { defer.resolve(signedTransaction.getId());  };
    var error   = function(e)       { defer.reject (e.message || e.responseText);};
    BlockchainAPI.push_tx(signedTransaction, note, success, error);
    return defer.promise;
  };
  //////////////////////////////////////////////////////////////////////////////
  // Public Methods
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // Spender.fromAddress :: origins -> Spender
  this.fromAddress = function (origin){

    origin = origin === null || origin === undefined || origin === ''
      ? MyWallet.wallet.activeAddresses
      : origin;
    if (!Array.isArray(origin)) {origin = [origin];}
    this.coins  = getUnspentCoins(origin);
    this.sweep  = this.coins.then(computeSuggestedSweep);
    this.change = origin[0] ? setPromise(origin[0]) : setPromise(MyWallet.wallet.activeAddresses[0]);

    getPrivateKeys = function (tx) {
      var getKeyForAddress = function (addr) {
        var searchAddr = addressPair[addr] === undefined ? addr : addressPair[addr];
        var k = MyWallet.wallet.key(searchAddr).priv;
        var privateKeyBase58 = secondPassword == null ? k : WalletCrypto
          .decryptSecretWithSecondPassword(k, secondPassword, sharedKey, pbkdf2_iterations);
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
      return tx.addressesOfNeededPrivateKeys.map(getKeyForAddress);
    };

    return build.bind(this)();
  };
  //////////////////////////////////////////////////////////////////////////////
  // Spender.fromPrivateKey :: privateKeyString -> Spender

  this.fromPrivateKey = function (privateKey){
    var format = MyWallet.detectPrivateKeyFormat(privateKey);
    var key    = MyWallet.privateKeyStringToKey(privateKey, format);
    key.pub.compressed = false;
    var extraAddress   = key.pub.getAddress().toString();
    key.pub.compressed = true;
    var addr = key.pub.getAddress().toString();
    var cWIF = key.toWIF();
    if(MyWallet.wallet.addresses.some(function(a){return a !== addr})){
      var addrPromise = MyWallet.wallet.importLegacyAddress(cWIF, "Redeemed code.", secondPassword);
      addrPromise.then(function(A){A.archived = true;})
    };
    addressPair[extraAddress] = addr;
    return this.fromAddress([addr, extraAddress]);
  };

  this.fromAccount = function (index){
    assert(index !== undefined || index !== null, "from account index required");
    var fromAccount = MyWallet.wallet.hdwallet.accounts[index];

    this.coins  = getUnspentCoins([fromAccount.extendedPublicKey]);
    this.sweep  = this.coins.then(computeSuggestedSweep);
    this.change = setPromise(fromAccount.changeAddress);
    getPrivateKeys  = function (tx) {
      var extendedPrivateKey = fromAccount.extendedPrivateKey === null || secondPassword === null
        ? fromAccount.extendedPrivateKey
        : WalletCrypto.decryptSecretWithSecondPassword( fromAccount.extendedPrivateKey
                                                      , secondPassword
                                                      , sharedKey
                                                      , pbkdf2_iterations);
      var getKeyForPath = function (neededPrivateKeyPath) {
        var keyring = new KeyRing(extendedPrivateKey);
        return keyring.privateKeyFromPath(neededPrivateKeyPath);
      };
      return tx.pathsOfNeededPrivateKeys.map(getKeyForPath);
    };

    return build.bind(this)();
  };

  //////////////////////////////////////////////////////////////////////////////
  // if no amounts, is considered a sweep
  // Spender.toAddress :: origins -> amounts -> fee? -> Spender

  this.toAddress = function (address, amount, fee){
    if (!Array.isArray(address)) {address = [address];}
    if (amount && !Array.isArray(amount)) {amount = [amount];}
    this.destination = setPromise([address, amount, fee]);
    return build.bind(this)();
  };

  //////////////////////////////////////////////////////////////////////////////
  // if no amounts, is considered a sweep
  // Spender.toAccount :: accountIndex -> amount -> fee? -> Spender

  this.toAccount = function (index, amount, fee){
    assert(index !== undefined || index !== null, "to account index required");
    var account = MyWallet.wallet.hdwallet.accounts[index];
    return this.toAddress(account.receiveAddress, amount, fee);
  };

  //////////////////////////////////////////////////////////////////////////////
  // prublic methods:
  this.publish = function(secPass, publicNote){
    secondPassword = secPass;
    note           = publicNote;
    return this.tx.then(signTransaction).then(publishTransaction);
  };





};

module.exports = S;
