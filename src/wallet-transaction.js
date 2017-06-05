'use strict';

module.exports = Tx;

var MyWallet = require('./wallet');

function Tx (object) {
  var obj = object || {};
  // original properties
  this.balance = obj.balance;
  this.block_height = obj.block_height;
  this.hash = obj.hash;
  this.inputs = obj.inputs || [];
  this.lock_time = obj.lock_time;
  this.out = obj.out || [];
  this.relayed_by = obj.relayed_by;
  this._result = obj.result;
  this.size = obj.size;
  this.time = obj.time;
  this.tx_index = obj.tx_index;
  this.ver = obj.ver;
  this.vin_sz = obj.vin_sz;
  this.vout_sz = obj.vout_sz;
  this.double_spend = obj.double_spend;
  this.double_spends = obj.double_spends;
  this.rbf = obj.rbf;
  this.publicNote = obj.note;
  this.note = MyWallet.wallet.getNote(this.hash);
  this.confirmations = Tx.setConfirmations(this.block_height);

  // computed properties
  var initialIn = {
    taggedIns: [],
    fromWatchOnly: false,
    totalIn: 0,
    internalSpend: 0
  };
  var pins = this.inputs.reduce(procIns.bind(this), initialIn);
  this.processedInputs = pins.taggedIns;
  this.totalIn = pins.totalIn;
  this.internalSpend = pins.internalSpend;
  this.fromWatchOnly = pins.fromWatchOnly;

  var initialOut = {
    taggedOuts: [],
    toWatchOnly: false,
    totalOut: 0,
    internalReceive: 0,
    changeAmount: 0
  };
  var pouts = this.out.reduce(procOuts.bind(this), initialOut);
  this.processedOutputs = pouts.taggedOuts;
  this.toWatchOnly = pouts.toWatchOnly;
  this.totalOut = pouts.totalOut;
  this.internalReceive = pouts.internalReceive;
  this.changeAmount = pouts.changeAmount;

  this.fee = isCoinBase(this.inputs[0]) ? 0 : this.totalIn - this.totalOut;
  this.result = this._result ? this._result : this.internalReceive - this.internalSpend;
  this.txType = computeTxType(this);
  this.amount = computeAmount(this);

  this.from = computeFrom(this);
  this.to = computeTo(this);
}

Tx.prototype.toString = function () {
  return this.hash;
};

Tx.prototype.updateConfirmationsOnBlock = function (txIndexes) {
  if (this.confirmations > 0) {
    this.confirmations = this.confirmations + 1;
  } else {
    if (txIndexes.indexOf(this.tx_index) >= 0) {
      // transaction included in the last block
      this.confirmations = this.confirmations + 1;
    }
      // otherwise: Transaction not confirmed
  }
};

Object.defineProperties(Tx.prototype, {
  'belongsTo': {
    configurable: false,
    value: function (identity) { return belongsTo(this, identity); }
  }
});

function procOuts (acc, output) {
  var tagOut = tagCoin(output);
  acc.taggedOuts.push(tagOut);
  if (tagOut.isWatchOnly) {
    acc.toWatchOnly = true;
  }
  acc.toWatchOnly = acc.toWatchOnly || tagOut.isWatchOnly || false;
  if (tagOut.coinType !== 'external') {
    acc.internalReceive = acc.internalReceive + tagOut.amount;
    if (tagOut.coinType === 'legacy' && !tagOut.change) {
      tagOut.change = this.processedInputs.some(function (input) {
        return input.address === tagOut.address;
      });
    }
    if (tagOut.change === true) {
      acc.changeAmount = acc.changeAmount + tagOut.amount;
    }
  }
  acc.totalOut = acc.totalOut + tagOut.amount;
  return acc;
}

function procIns (acc, input) {
  var f = tagCoin.compose(unpackInput.bind(this));
  var tagIn = f(input);
  acc.taggedIns.push(tagIn);
  acc.fromWatchOnly = acc.fromWatchOnly || tagIn.isWatchOnly || false;
  if (tagIn.coinType !== 'external') {
    acc.internalSpend = acc.internalSpend + tagIn.amount;
  }
  acc.totalIn = acc.totalIn + tagIn.amount;
  return acc;
}

function belongsTo (tx, id) {
  return tx.processedInputs.concat(tx.processedOutputs).some(function (p) {
    return (
      (p.identity === 'imported' && id === 'imported') ||
      p.identity === parseInt(id, 10)
    );
  });
}
// var memoizedBelongsTo = Helpers.memoize(belongsTo);

function isAccount (x) {
  return !!x.xpub;
}

function isLegacy (x) {
  return MyWallet.wallet.containsLegacyAddress(x.addr) && !MyWallet.wallet.key(x.addr).archived;
}

function isAccountChange (x) {
  return (isAccount(x) && x.xpub.path.split('/')[1] === '1');
}

function accountPath (x) {
  return account(x).index + x.xpub.path.substr(1);
}

function account (x) {
  return MyWallet.wallet.hdwallet.account(x.xpub.m);
}

function address (x) {
  return MyWallet.wallet.key(x.addr);
}

function receiveIndex (x) {
  if (!x || !x.xpub || !x.xpub.path) return;
  if (!x.xpub.path.split('/').length === 3) return;
  return parseInt(x.xpub.path.substr(1).split('/')[2]);
}

function tagCoin (x) {
  let result = {
    address: x.addr,
    amount: x.value,
    change: false,
    coinType: null,
    label: null,
    isWatchOnly: null,
    identity: undefined
  };

  switch (true) {
    case isLegacy(x):
      result.coinType = 'legacy';
      result.identity = 'imported';
      var addr = address(x);
      result.label = addr.label;
      result.isWatchOnly = addr.isWatchOnly;
      break;
    case isAccount(x):
      result.coinType = accountPath(x);
      result.change = isAccountChange(x);
      result.identity = account(x).index;
      result.label = account(x).label;
      result.accountIndex = account(x).index;
      if (!result.change) {
        result.receiveIndex = receiveIndex(x);
      }
      break;
    default:
      result.coinType = 'external';
  }
  return result;
}

function unpackInput (input) {
  if (isCoinBase(input)) {
    var totalOut = this.out.reduce(function (sum, out) { return sum + out.value; }, 0);
    return {addr: 'Coinbase', value: totalOut};
  } else {
    return input.prev_out;
  }
}

function computeAmount (Tx) {
  var am = 0;
  switch (Tx.txType) {
    case 'transfer':
      am = Tx.internalReceive - Tx.changeAmount;
      break;
    case 'sent':
      am = Tx.internalReceive - Tx.internalSpend;
      break;
    case 'received':
      am = Tx.internalReceive - Tx.internalSpend;
      break;
    default:
      am = Tx.result;
  }
  return am;
}

function computeTxType (Tx) {
  var v = null;
  var impactNoFee = Tx.result + Tx.fee;
  switch (true) {
    case impactNoFee === 0:
      v = 'transfer';
      break;
    case impactNoFee < 0:
      v = 'sent';
      break;
    case impactNoFee > 0:
      v = 'received';
      break;
    default:
      v = 'complex';
  }
  return v;
}

function computeFrom (Tx) {
  var formatted = formatTransactionCoins(Tx);
  return formatted.input;
}

function computeTo (Tx) {
  var formatted = formatTransactionCoins(Tx);
  var recipients = [];

  if (formatted.outputs && formatted.outputs.length > 0) {
    recipients = formatted.outputs.filter(function (output) {
      return Tx.txType === 'sent'
          ? output.coinType === 'external' || output.coinType === 'legacy'
          : output.coinType !== 'external';
    });
  }

  return recipients;
}

function formatTransactionCoins (tx) {
  var input = tx.processedInputs
  .filter(function (input) { return !input.change; })[0] || tx.processedInputs[0];
  var outputs = tx.processedOutputs
  .filter(function (output) { return !output.change && output.address !== input.address; });

  var setLabel = function (inputOrOutput) {
    if (inputOrOutput) {
      inputOrOutput.label = inputOrOutput.label || MyWallet.wallet.getAddressBookLabel(inputOrOutput.address) || inputOrOutput.address;
    }
  };

  setLabel(input);
  outputs.forEach(setLabel);

  return { input: input, outputs: outputs };
}

function isCoinBase (input) {
  return (input == null || input.prev_out == null || input.prev_out.addr == null);
}

Tx.factory = function (o) {
  if (o instanceof Object && !(o instanceof Tx)) {
    return new Tx(o);
  } else { return o; }
};

Tx.IOSfactory = function (tx) {
  return {
    time: tx.time,
    result: tx.result,
    amount: tx.amount,
    confirmations: tx.confirmations,
    myHash: tx.hash,
    txType: tx.txType,
    block_height: tx.block_height,
    fromWatchOnly: tx.fromWatchOnly,
    toWatchOnly: tx.toWatchOnly,
    to: tx.to,
    from: tx.from,
    fee: tx.fee,
    note: tx.note,
    double_spend: tx.double_spend,
    rbf: tx.rbf
  };
};

Tx.setConfirmations = function (txBlockHeight) {
  var lastBlock = MyWallet.wallet.latestBlock;
  var conf = 0;
  if (lastBlock && txBlockHeight != null && txBlockHeight > 0) {
    conf = lastBlock.height - txBlockHeight + 1;
  }
  return conf;
};
