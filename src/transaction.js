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

  assert(unspentOutputs && unspentOutputs.length > 0, 'No Free Outputs To Spend');

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
      assert(address, 'Unable to decode output address from transaction hash ' + output.tx_hash);

      this.addressesOfNeededPrivateKeys.push(address);
    }

    var estimatedFee = network.estimateFee(transaction);
    var currentFee = fee > estimatedFee ? fee : estimatedFee;

    accum += output.value;
    subTotal = amount + currentFee;
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

  assert(accum >= subTotal, 'Insufficient funds. Value Needed ' +  formatBTC(subTotal) + '. Available amount ' + formatBTC(accum));

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
  assert(this.privateKeys, 'Need private keys to sign transaction');

  assert(this.privateKeys.length === this.transaction.ins.length, 'Number of private keys needs to match inputs');

  var listener = this.listener;

  typeof(listener.on_begin_signing) === 'function' && listener.on_begin_signing();

  var transaction = this.transaction;

  for (var i = 0; i < transaction.ins.length; i++) {
    typeof(listener.on_sign_progress) === 'function' && listener.on_sign_progress(i+1);

    var key = this.privateKeys[i];

    // TODO check that input and key belong together
    // assert(key.pub.getAddress());

    transaction.sign(i, key);

    // assert(isCanonicalSignature(signature), 'Signature not canoniacal');
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
