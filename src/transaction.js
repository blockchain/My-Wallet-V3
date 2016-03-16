'use strict';

var assert      = require('assert');
var Bitcoin     = require('bitcoinjs-lib');
var randomBytes = require('randombytes');
var Helpers     = require('./helpers');
var Buffer      = require('buffer').Buffer;

// Error messages that can be seen by the user should take the form of:
// {error: "NOT_GOOD", some_param: 1}
// Error messages that should only appear during development can be any string.

var Transaction = function (unspentOutputs, toAddresses, amounts, fee, feePerKb, changeAddress, listener) {

  if (!Array.isArray(toAddresses) && toAddresses != null) {toAddresses = [toAddresses];}
  if (!Array.isArray(amounts) && amounts != null) {amounts = [amounts];}
  var network = Bitcoin.networks.bitcoin;
  assert(toAddresses, 'Missing destination address');
  assert(amounts,     'Missing amount to pay');

  this.amount = amounts.reduce(function (a, b) {return a + b;},0);
  this.listener = listener;
  this.addressesOfInputs = [];
  this.privateKeys = null;
  this.addressesOfNeededPrivateKeys = [];
  this.pathsOfNeededPrivateKeys = [];
  this.fee = 0; // final used fee
  this.unspentOutputs = unspentOutputs;
  this.toAddresses = toAddresses;
  var BITCOIN_DUST = 5460;
  var forcedFee = Helpers.isNumber(fee) ? fee : null;
  this.feePerKb = Helpers.isNumber(feePerKb) ? feePerKb : 10000;

  assert(toAddresses.length == amounts.length, 'The number of destiny addresses and destiny amounts should be the same.');
  assert(this.amount > BITCOIN_DUST, {error: 'BELOW_DUST_THRESHOLD', amount: this.amount, threshold: BITCOIN_DUST});
  assert(unspentOutputs && unspentOutputs.length > 0, {error: 'NO_UNSPENT_OUTPUTS'});

  var transaction = new Bitcoin.Transaction();
  // add all outputs
  function addOutput (e, i) {transaction.addOutput(toAddresses[i],amounts[i]);}
  toAddresses.map(addOutput);

  // Choose inputs
  var unspent = sortUnspentOutputs(unspentOutputs);
  var accum = 0;
  var subTotal = 0;

  var nIns = 0;
  var nOuts = toAddresses.length + 1; // assumed one change output

  for (var i = 0; i < unspent.length; i++) {
    var output = unspent[i];
    transaction.addInput(output.hash, output.index);
    nIns += 1;
    this.sizeEstimate = Helpers.guessSize(nIns, nOuts);
    this.fee = Helpers.isPositiveNumber(forcedFee) ? forcedFee : Helpers.guessFee(nIns, nOuts, this.feePerKb);

    // Generate address from output script and add to private list so we can check if the private keys match the inputs later

    var script = Bitcoin.Script.fromHex(output.script);
    assert.notEqual(Bitcoin.scripts.classifyOutput(script), 'nonstandard', {error: 'STRANGE_SCRIPT'});
    var address = Bitcoin.Address.fromOutputScript(script).toString();
    assert(address, {error: 'CANNOT_DECODE_OUTPUT_ADDRESS', tx_hash: output.tx_hash});
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

Transaction.prototype.addPrivateKeys = function (privateKeys) {
  assert.equal(privateKeys.length, this.addressesOfInputs.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], privateKeys[i].pub.getAddress().toBase58Check(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + privateKeys[i].pub.getAddress().toBase58Check());
  }

  this.privateKeys = privateKeys;
};

/**
 * Shuffles the outputs of a transaction so that they receive and change
 * addresses are in random order.
 */
Transaction.prototype.randomizeOutputs = function () {
  function randomNumberBetweenZeroAnd (i) {
    assert(i < Math.pow(2, 16), 'Cannot shuffle more outputs than one transaction can handle');

    var randArray = randomBytes(2);
    var rand = randArray[0] << 8 | randArray[1];

    return rand%i;
  }

  function shuffle (o){
    for(var j, x, i = o.length; i > 1; j = randomNumberBetweenZeroAnd(i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }
  shuffle(this.transaction.outs);
};

/**
 * BIP69: Sort outputs lexicographycally
 */

Transaction.prototype.sortBIP69 = function (){

  var compareInputs = function (a, b) {
    var hasha = new Buffer(a[0].hash);
    var hashb = new Buffer(b[0].hash);
    var x = [].reverse.call(hasha);
    var y = [].reverse.call(hashb);
    return x.compare(y) || a[0].index - b[0].index
  };
  var compareOutputs = function (a, b) {
    return (a.value - b.value) || (a.script.buffer).compare(b.script.buffer)
  };
  var mix = Helpers.zip3(this.transaction.ins, this.privateKeys, this.addressesOfInputs);
  mix.sort(compareInputs);
  this.transaction.ins   = mix.map(function (a){return a[0];});
  this.privateKeys       = mix.map(function (a){return a[1];});
  this.addressesOfInputs = mix.map(function (a){return a[2];});
  this.transaction.outs.sort(compareOutputs);
};
/**
 * Sign the transaction
 * @return {Object} Signed transaction
 */
Transaction.prototype.sign = function () {
  assert(this.privateKeys, 'Need private keys to sign transaction');

  assert.equal(this.privateKeys.length, this.transaction.ins.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < this.privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], this.privateKeys[i].pub.getAddress().toBase58Check(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + this.privateKeys[i].pub.getAddress().toBase58Check());
  }

  var listener = this.listener;

  listener && typeof(listener.on_begin_signing) === 'function' && listener.on_begin_signing();

  var transaction = this.transaction;

  for (var i = 0; i < transaction.ins.length; i++) {
    listener && typeof(listener.on_sign_progress) === 'function' && listener.on_sign_progress(i+1);

    var key = this.privateKeys[i];

    transaction.sign(i, key);

    assert(transaction.ins[i].script, 'Error creating input script');
  }

  listener && typeof(listener.on_finish_signing) === 'function' && listener.on_finish_signing();

  return transaction;
};

Transaction.prototype.estimateSizeForAmount = function (amount) {
  var sizeEstimate, accum = 0, nIns = 0;
  var nOuts = this.toAddresses.length + 1;
  var unspent = sortUnspentOutputs(this.unspentOutputs);

  for (var i = 0; i < unspent.length; i++) {
    nIns += 1;
    sizeEstimate = Helpers.guessSize(nIns, nOuts);
    accum += unspent[i].value;
    if (accum >= amount) break;
  }

  return sizeEstimate;
};

function sortUnspentOutputs (unspentOutputs) {
  var unspent = [];

  for (var key in unspentOutputs) {
    var output = unspentOutputs[key];
    if (!output.pending) {
      unspent.push(output);
    }
  }

  unspent.sort(function (o1, o2){
    return o2.value - o1.value;
  });

  return unspent;
}

module.exports = Transaction;
