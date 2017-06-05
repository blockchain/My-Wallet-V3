'use strict';

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var Helpers = require('./helpers');
var Buffer = require('buffer').Buffer;
var constants = require('./constants');

// Error messages that can be seen by the user should take the form of:
// {error: "NOT_GOOD", some_param: 1}
// Error messages that should only appear during development can be any string.

var Transaction = function (payment, emitter) {
  var unspentOutputs = payment.selectedCoins;
  var toAddresses = payment.to;
  var amounts = payment.amounts;
  var fee = payment.finalFee;
  var changeAddress = payment.change;
  var BITCOIN_DUST = constants.getNetwork().dustThreshold;

  if (!Array.isArray(toAddresses) && toAddresses != null) { toAddresses = [toAddresses]; }
  if (!Array.isArray(amounts) && amounts != null) { amounts = [amounts]; }

  assert(toAddresses && toAddresses.length, 'Missing destination address');
  assert(amounts && amounts.length, 'Missing amount to pay');

  if (payment.blockchainFee && payment.blockchainAddress) {
    amounts = amounts.concat(payment.blockchainFee);
    toAddresses = toAddresses.concat(payment.blockchainAddress);
  }

  this.emitter = emitter;
  this.amount = amounts.reduce(Helpers.add, 0);
  this.addressesOfInputs = [];
  this.privateKeys = null;
  this.addressesOfNeededPrivateKeys = [];
  this.pathsOfNeededPrivateKeys = [];

  assert(toAddresses.length === amounts.length, 'The number of destination addresses and destination amounts should be the same.');
  assert(this.amount >= BITCOIN_DUST, {error: 'BELOW_DUST_THRESHOLD', amount: this.amount, threshold: BITCOIN_DUST});
  assert(unspentOutputs && unspentOutputs.length > 0, {error: 'NO_UNSPENT_OUTPUTS'});
  var transaction = new Bitcoin.TransactionBuilder(constants.getNetwork());
  // add all outputs
  function addOutput (e, i) { transaction.addOutput(toAddresses[i], amounts[i]); }
  toAddresses.map(addOutput);

  // add all inputs
  var total = 0;
  for (var i = 0; i < unspentOutputs.length; i++) {
    var output = unspentOutputs[i];
    total = total + output.value;
    var transactionHashBuffer = Buffer(output.hash, 'hex');
    transaction.addInput(Array.prototype.reverse.call(transactionHashBuffer), output.index);

    // Generate address from output script and add to private list so we can check if the private keys match the inputs later
    var scriptBuffer = Buffer(output.script, 'hex');
    assert.notEqual(Bitcoin.script.classifyOutput(scriptBuffer), 'nonstandard', {error: 'STRANGE_SCRIPT'});
    var address = Bitcoin.address.fromOutputScript(scriptBuffer, constants.getNetwork()).toString();
    assert(address, {error: 'CANNOT_DECODE_OUTPUT_ADDRESS', tx_hash: output.tx_hash});
    this.addressesOfInputs.push(address);

    // Add to list of needed private keys
    if (output.xpub) {
      this.pathsOfNeededPrivateKeys.push(output.xpub.path);
    } else {
      this.addressesOfNeededPrivateKeys.push(address);
    }
  }
  // Consume the change if it would create a very small none standard output
  var changeAmount = total - this.amount - fee;
  if (changeAmount >= BITCOIN_DUST) {
    assert(changeAddress, 'No change address specified');
    transaction.addOutput(changeAddress, changeAmount);
  }

  this.transaction = transaction;
};

Transaction.prototype.addPrivateKeys = function (privateKeys) {
  assert.equal(privateKeys.length, this.addressesOfInputs.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], privateKeys[i].getAddress(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + privateKeys[i].getAddress() + ' while adding private key for input ' + i);
  }

  this.privateKeys = privateKeys;
};

/**
 * BIP69: Sort outputs lexicographycally
 */

Transaction.prototype.sortBIP69 = function () {
  var compareInputs = function (a, b) {
    var hasha = new Buffer(a[0].hash);
    var hashb = new Buffer(b[0].hash);
    var x = [].reverse.call(hasha);
    var y = [].reverse.call(hashb);
    return x.compare(y) || a[0].index - b[0].index;
  };

  var compareOutputs = function (a, b) {
    return (a.value - b.value) || (a.script).compare(b.script);
  };
  var mix = Helpers.zip3(this.transaction.tx.ins, this.privateKeys, this.addressesOfInputs);
  mix.sort(compareInputs);
  this.transaction.tx.ins = mix.map(function (a) { return a[0]; });
  this.privateKeys = mix.map(function (a) { return a[1]; });
  this.addressesOfInputs = mix.map(function (a) { return a[2]; });
  this.transaction.tx.outs.sort(compareOutputs);
};
/**
 * Sign the transaction
 * @return {Object} Signed transaction
 */
Transaction.prototype.sign = function () {
  assert(this.privateKeys, 'Need private keys to sign transaction');

  assert.equal(this.privateKeys.length, this.transaction.inputs.length, 'Number of private keys needs to match inputs');

  for (var i = 0; i < this.privateKeys.length; i++) {
    assert.equal(this.addressesOfInputs[i], this.privateKeys[i].getAddress(), 'Private key does not match bitcoin address ' + this.addressesOfInputs[i] + '!=' + this.privateKeys[i].getAddress() + ' while signing input ' + i);
  }

  this.emitter.emit('on_begin_signing');

  var transaction = this.transaction;

  for (var ii = 0; ii < transaction.inputs.length; ii++) {
    this.emitter.emit('on_sign_progress', ii + 1);
    var key = this.privateKeys[ii];
    transaction.sign(ii, key);
    assert(transaction.inputs[ii].scriptType === 'pubkeyhash', 'Error creating input script');
  }

  this.emitter.emit('on_finish_signing');
  return transaction;
};

Transaction.inputCost = function (feePerKb) {
  return Math.ceil(feePerKb * 0.148);
};
Transaction.guessSize = function (nInputs, nOutputs) {
  if (nInputs < 1 || nOutputs < 1) { return 0; }
  return (nInputs * 148 + nOutputs * 34 + 10);
};

Transaction.guessFee = function (nInputs, nOutputs, feePerKb) {
  var sizeBytes = Transaction.guessSize(nInputs, nOutputs);
  return Math.ceil(feePerKb * (sizeBytes / 1000));
};

Transaction.filterUsableCoins = function (coins, feePerKb) {
  if (!Array.isArray(coins)) return [];
  var icost = Transaction.inputCost(feePerKb);
  return coins.filter(function (c) { return c.value >= icost; });
};

Transaction.maxAvailableAmount = function (usableCoins, feePerKb) {
  var len = usableCoins.length;
  var fee = Transaction.guessFee(len, 2, feePerKb);
  return {'amount': usableCoins.reduce(function (a, e) { a = a + e.value; return a; }, 0) - fee, 'fee': fee};
};

Transaction.sumOfCoins = function (coins) {
  return coins.reduce(function (a, e) { a = a + e.value; return a; }, 0);
};

Transaction.selectCoins = function (usableCoins, amounts, fee, isAbsoluteFee) {
  var amount = amounts.reduce(Helpers.add, 0);
  var sorted = usableCoins.sort(function (a, b) { return b.value - a.value; });
  var len = sorted.length;
  var sel = [];
  var accAm = 0;
  var accFee = 0;

  if (isAbsoluteFee) {
    for (var i = 0; i < len; i++) {
      var coin = sorted[i];
      accAm = accAm + coin.value;
      sel.push(coin);
      if (accAm >= fee + amount) { return {'coins': sel, 'fee': fee}; }
    }
  } else {
    for (var ii = 0; ii < len; ii++) {
      var coin2 = sorted[ii];
      accAm = accAm + coin2.value;
      accFee = Transaction.guessFee(ii + 1, 2, fee);
      sel.push(coin2);
      if (accAm >= accFee + amount) { return {'coins': sel, 'fee': accFee}; }
    }
  }
  return {'coins': [], 'fee': 0};
};
module.exports = Transaction;
