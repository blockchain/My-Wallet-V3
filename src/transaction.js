'use strict';

var assert      = require('assert');
var Bitcoin     = require('bitcoinjs-lib');
var randomBytes = require('randombytes');
var Helpers     = require('./helpers');
var MyWallet    = require('./wallet');
var Buffer      = require('buffer').Buffer;

var Transaction = function (unspentOutputs, toAddresses, amounts, fee, changeAddress, listener) {
  if (!Array.isArray(toAddresses) && toAddresses != null) {toAddresses = [toAddresses];}
  if (!Array.isArray(amounts) && amounts != null) {amounts = [amounts];}
  var network = Bitcoin.networks.bitcoin;
  assert(toAddresses, 'Missing destination address');
  assert(amounts,     'Missing amount to pay');

  this.amount = amounts.reduce(function(a, b) {return a + b;},0);
  this.listener = listener;
  this.addressesOfInputs = [];
  this.privateKeys = null;
  this.addressesOfNeededPrivateKeys = [];
  this.pathsOfNeededPrivateKeys = [];
  this.fee = 0; // final used fee
  var BITCOIN_DUST = 5460;
  var forcedFee = (typeof(fee) == "number") ? fee : null;

  assert(toAddresses.length == amounts.length, 'The number of destiny addresses and destiny amounts should be the same.');
  assert(this.amount > BITCOIN_DUST, this.amount + ' must be above dust threshold (' + BITCOIN_DUST + ' Satoshis)');
  assert(unspentOutputs && unspentOutputs.length > 0, 'Missing coins to spend');

  var transaction = new Bitcoin.TransactionBuilder(Bitcoin.networks.bitcoin);
  // add all outputs
  function addOutput(e, i) {
    transaction.addOutput(toAddresses[i],amounts[i]);
  }
  toAddresses.map(addOutput);

  // Choose inputs
  var unspent = sortUnspentOutputs(unspentOutputs);
  var accum = 0;
  var subTotal = 0;

  var nIns = 0;
  var nOuts = toAddresses.length + 1; // assumed one change output

  for (var i = 0; i < unspent.length; i++) {
    var output = unspent[i];
    var transactionHashBuffer = Buffer(output.hash, 'hex');
    transaction.addInput(transactionHashBuffer.reverse(), output.index);
    nIns += 1;
    this.fee = Helpers.isNumber(forcedFee) ? forcedFee : Helpers.guessFee(nIns, nOuts, MyWallet.wallet.fee_per_kb);

    // Generate address from output script and add to private list so we can check if the private keys match the inputs later
    var scriptBuffer = Buffer(output.script, "hex");
    assert.notEqual(Bitcoin.script.classifyOutput(scriptBuffer), 'nonstandard', 'Strange Script');
    var address = Bitcoin.address.fromOutputScript(scriptBuffer).toString();
    assert(address, 'Unable to decode output address from transaction hash ' + output.tx_hash);
    this.addressesOfInputs.push(address);

    // Add to list of needed private keys
    if (output.xpub) {
      this.pathsOfNeededPrivateKeys.push(output.xpub.path);
    }
    else {
      this.addressesOfNeededPrivateKeys.push(address);
    }

    accum += output.value;
    subTotal = this.amount + this.fee;
    if (accum >= subTotal) {
      var change = accum - subTotal;

      // Consume the change if it would create a very small none standard output
      if (change > network.dustThreshold) {
        assert(changeAddress, 'No change address specified');
        transaction.addOutput(changeAddress, change);
      }

      break;
    }
  }

  if (accum < subTotal) {
   throw { error: 500, message: 'Insufficient funds. Value Needed ' +  subTotal / 100000000 + 'BTC' +'. Available amount ' + accum / 100000000 + 'BTC'};
  }

  this.transaction = transaction;
};

Transaction.prototype.addPrivateKeys = function(privateKeys) {
  assert.equal(privateKeys.length, this.addressesOfInputs.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], privateKeys[i].getAddress(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + privateKeys[i].getAddress() + ' while adding private key for input ' + i);
  }

  this.privateKeys = privateKeys;
};

/**
 * BIP69: Sort outputs lexicographycally
 */

Transaction.prototype.sortBIP69 = function (){

  var compareInputs = function(a, b) {
    var hasha = new Buffer(a[0].hash);
    var hashb = new Buffer(b[0].hash);
    var x = [].reverse.call(hasha);
    var y = [].reverse.call(hashb);
    return x.compare(y) || a[0].index - b[0].index
  };
  var compareOutputs = function(a, b) {
    return (a.value - b.value) || (a.script).compare(b.script)
  };
  var mix = Helpers.zip3(this.transaction.tx.ins, this.privateKeys, this.addressesOfInputs);
  mix.sort(compareInputs);
  this.transaction.tx.ins = mix.map(function(a){return a[0];});
  this.privateKeys        = mix.map(function(a){return a[1];});
  this.addressesOfInputs  = mix.map(function(a){return a[2];});
  this.transaction.tx.outs.sort(compareOutputs);
};
/**
 * Sign the transaction
 * @return {Object} Signed transaction
 */
Transaction.prototype.sign = function() {
  assert(this.privateKeys, 'Need private keys to sign transaction');

  assert.equal(this.privateKeys.length, this.transaction.inputs.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < this.privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], this.privateKeys[i].getAddress(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + this.privateKeys[i].getAddress() + ' while signing input ' + i);
  }

  var listener = this.listener;

  listener && typeof(listener.on_begin_signing) === 'function' && listener.on_begin_signing();

  var transaction = this.transaction;

  for (var i = 0; i < transaction.inputs.length; i++) {
    listener && typeof(listener.on_sign_progress) === 'function' && listener.on_sign_progress(i+1);

    var key = this.privateKeys[i];

    transaction.sign(i, key);

    assert(transaction.inputs[i].scriptType === 'pubkeyhash', 'Error creating input script');
  }

  listener && typeof(listener.on_finish_signing) === 'function' && listener.on_finish_signing();

  return transaction;
};


function sortUnspentOutputs(unspentOutputs) {
  var unspent = [];

  for (var key in unspentOutputs) {
    var output = unspentOutputs[key];
    if (!output.pending) {
      unspent.push(output);
    }
  }

  unspent.sort(function(o1, o2){
    return o2.value - o1.value;
  });

  return unspent;
}

module.exports = Transaction;
