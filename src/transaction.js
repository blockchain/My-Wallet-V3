var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var assert = require('assert');
var Base58 = require('bs58');

var Transaction = function (unspentOutputs, toAddress, amount, fee, changeAddress, listener) {
  var network = Bitcoin.networks.bitcoin;
  var defaultFee = Bitcoin.networks.bitcoin.feePerKb;

  this.listener = listener;
  this.amount = amount;
  this.privateKeys = null;
  this.addressesOfNeededPrivateKeys = [];
  this.pathsOfNeededPrivateKeys = [];

  fee = fee || defaultFee;

  assert(amount > network.dustThreshold, amount + ' must be above dust threshold (' + network.dustThreshold + ' Satoshis)');

  var transaction = new Bitcoin.Transaction();
  transaction.addOutput(toAddress, amount);

  // Choose inputs
  var unspent = sortUnspentOutputs(unspentOutputs);
  var accum = 0;
  var subTotal = 0;

  for (var i = 0; i < unspent.length; i++) {
    var output = unspent[i];

    transaction.addInput(output.hash, output.index);

    // Add to list of needed private keys
    if (output.xpub) {
      this.pathsOfNeededPrivateKeys.push(output.xpub.path);
    }
    else {
      var address = Bitcoin.Address.fromOutputScript(output.script).toString();
      assert.notEqual(address, null, 'Unable to decode output address from transaction hash ' + output.tx_hash);

      this.pathsOfNeededPrivateKeys.push(address);
    }

    var estimatedFee = network.estimateFee(transaction);
    var currentFee = fee > estimatedFee ? fee : estimatedFee;

    accum += output.value;
    subTotal = amount + currentFee;
    if (accum >= subTotal) {
      var change = accum - subTotal;

      // Consume the change if it would create a very small none standard output
      if (change > network.dustThreshold) {
        // TODO if changeAddress is not specified, return to one of the unspents
        transaction.addOutput(changeAddress, change);
      }

      break;
    }
  }

  assert(accum >= subTotal, 'Insufficient funds. Value Needed ' +  subTotal + '. Available amount ' + accum);

  this.transaction = transaction;
};

Transaction.prototype.addressesOfNeededPrivateKeys = function() {
  return this.addressesOfNeededPrivateKeys;
};

Transaction.prototype.pathsOfNeededPrivateKeys = function() {
  return this.pathsOfNeededPrivateKeys;
};

Transaction.prototype.addPrivateKeys = function(privateKeys) {
  this.privateKeys = privateKeys;
};

/** Sign the transaction
 * @return {Object} Signed transaction
 */
Transaction.prototype.sign = function() {
  assert.notEqual(this.privateKeys, null, 'Need private keys to sign transaction');

  var listener = this.listener;

  typeof(listener.on_begin_signing) === 'function' && listener.on_begin_signing();

  var transaction = this.transaction;

  for (var i = 0; i < transaction.ins.length; i++) {
    typeof(listener.on_sign_progress) === 'function' && listener.on_sign_progress(i+1);

    var key = this.privateKeys[i];

    transaction.sign(i, key);
  }

  typeof(listener.on_finish_signing) === 'function' && listener.on_finish_signing();

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

  var sortByValueDesc = unspent.sort(function(o1, o2){
    return o2.value - o1.value;
  });

  return sortByValueDesc;
}

module.exports = Transaction;
