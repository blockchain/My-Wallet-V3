'use strict';

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var randomBytes = require('randombytes');

var Transaction = function (unspentOutputs, toAddresses, amounts, fee, changeAddress, listener) {

  if (!Array.isArray(toAddresses)) {toAddresses = [toAddresses];}
  if (!Array.isArray(amounts)) {amounts = [amounts];}
  var network = Bitcoin.networks.bitcoin;
  // var defaultFee = network.feePerKb;

  this.amount = amounts.reduce(function(a, b) {return a + b;},0);
  this.listener = listener;
  this.addressesOfInputs = [];
  this.privateKeys = null;
  this.addressesOfNeededPrivateKeys = [];
  this.pathsOfNeededPrivateKeys = [];
  this.fee = 0; // final used fee
  var forcedFee = (typeof(fee) == "number") ? fee : null;

  assert(toAddresses.length == amounts.length, 'The number of destiny addresses and destiny amounts should be the same.');
  assert(this.amount > network.dustThreshold, this.amount + ' must be above dust threshold (' + network.dustThreshold + ' Satoshis)');
  assert(unspentOutputs && unspentOutputs.length > 0, 'No Free Outputs To Spend');

  var transaction = new Bitcoin.Transaction();
  // add all outputs
  function addOutput(e, i) {transaction.addOutput(toAddresses[i],amounts[i]);}
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
    this.fee = forcedFee !== null ? forcedFee : guessFee(nIns, nOuts);

    // Generate address from output script and add to private list so we can check if the private keys match the inputs later

    var script = Bitcoin.Script.fromHex(output.script);
    assert.notEqual(Bitcoin.scripts.classifyOutput(script), 'nonstandard', 'Strange Script');
    var address = Bitcoin.Address.fromOutputScript(script).toString();
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

  assert(accum >= subTotal, 'Insufficient funds. Value Needed ' +  subTotal + '. Available amount ' + accum);
  this.transaction = transaction;
};

Transaction.prototype.addPrivateKeys = function(privateKeys) {
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
  function randomNumberBetweenZeroAnd(i) {
    assert(i < Math.pow(2, 16), 'Cannot shuffle more outputs than one transaction can handle');

    var randArray = randomBytes(2);
    var rand = randArray[0] << 8 | randArray[1];

    return rand%i;
  }

  function shuffle(o){
    for(var j, x, i = o.length; i > 1; j = randomNumberBetweenZeroAnd(i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

  shuffle(this.transaction.outs);
};

/**
 * Sign the transaction
 * @return {Object} Signed transaction
 */
Transaction.prototype.sign = function() {
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

function guessSize (nInputs, nOutputs) {
  return (nInputs*148 + nOutputs*34 + 10);
}

function guessFee (nInputs, nOutputs) {
  var network  = Bitcoin.networks.bitcoin;
  var feePerKb = network.feePerKb;
  var size  = guessSize(nInputs, nOutputs);
  var thousands = Math.floor(size/1000);
  var remainder = size % 1000;
  var fee = feePerKb * thousands;
  if(remainder > 0) { fee += feePerKb;};
  return fee;
}

module.exports = Transaction;
