'use strict';

module.exports = Tx;

var Helpers = require('./helpers');
var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');

function Tx (object) {
  var obj = object || {};
  // original properties
  var setConfirmations = function (tx_block_height) {
    var lastBlock = MyWallet.wallet.latestBlock;
    var conf = 0;
    if (lastBlock && tx_block_height != null && tx_block_height > 0) {
      conf = lastBlock.height - tx_block_height + 1;
    }
    return conf;
  }

  this.balance = obj.balance;
  this.block_height = obj.block_height;
  this.hash = obj.hash;
  this.inputs = obj.inputs || [];
  this.lock_time = obj.lock_time;
  this.out = obj.out  || [];
  this.relayed_by = obj.relayed_by;
  this._result = obj.result;
  this.size = obj.size;
  this.time = obj.time;
  this.tx_index = obj.tx_index;
  this.ver = obj.ver;
  this.vin_sz = obj.vin_sz;
  this.vout_sz = obj.vout_sz;
  this.double_spend = obj.double_spend;
  this.publicNote = obj.note;
  this.note = MyWallet.wallet.getNote(this.hash);
  this.confirmations = setConfirmations(this.block_height);

  // computed properties
  var initialOut = {
    taggedOuts: [],
    toWatchOnly: false,
    totalOut: 0,
    internalReceive: 0,
    changeAmount: 0
  };
  var pouts = this.out.reduce(procOuts, initialOut);
  this.processedOutputs = pouts.taggedOuts;
  this.toWatchOnly = pouts.toWatchOnly;
  this.totalOut = pouts.totalOut;
  this.internalReceive = pouts.internalReceive;
  this.changeAmount = pouts.changeAmount;

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

  this.fee = isCoinBase(this.inputs[0]) ? 0 : this.totalIn - this.totalOut;
  this.result = this._result ? this._result : this.internalReceive - this.internalSpend;
  this.txType = computeTxType(this);
  this.amount = computeAmount(this);
}

Tx.prototype.toString = function () {
  return this.hash;
};

Object.defineProperties(Tx.prototype, {
  'belongsTo': {
    configurable: false,
    value: function (identity) { return belongsTo(this, identity); }
  }
});

function procOuts(acc, output) {
  var tagOut = tagCoin(output);
  acc.taggedOuts.push(tagOut);
  if (tagOut.isWatchOnly) {
    acc.toWatchOnly = true;
  }
  acc.toWatchOnly = acc.toWatchOnly || tagOut.isWatchOnly || false;
  if (tagOut.coinType !== 'external') {
    acc.internalReceive = acc.internalReceive + tagOut.amount;
    if (tagOut.change === true) {
      acc.changeAmount = acc.changeAmount + tagOut.amount;
    }
  }
  acc.totalOut = acc.totalOut + tagOut.amount;
  return acc;
}

function procIns(acc, input) {
  var f = tagCoin.compose(unpackInput.bind(this));
  var tagIn = f(input);
  acc.taggedIns.push(tagIn);
  acc.fromWatchOnly =  acc.fromWatchOnly || tagIn.isWatchOnly || false;
  if (tagIn.coinType !== 'external') {
    acc.internalSpend = acc.internalSpend + tagIn.amount;
  }
  acc.totalIn = acc.totalIn + tagIn.amount;
  return acc;
}

function belongsTo(tx, id) {
  return tx.processedInputs.concat(tx.processedOutputs).some(function (p) { return p.identity == id; });
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

function tagCoin (x) {
  var ad = x.addr;
  var am = x.value;
  var coinType = null;
  var change = false;
  var id;
  var label = null;
  var isWatchOnly = null;

  switch (true) {
    case isLegacy(x):
      coinType = 'legacy';
      id = 'imported';
      var addr = address(x);
      label = addr.label;
      isWatchOnly = addr.isWatchOnly;
      break;
    case isAccount(x):
      coinType = accountPath(x);
      change = isAccountChange(x);
      id = account(x).index;
      label = account(x).label;
      break;
    default:
      coinType = 'external';
  }
  return {
    address: ad,
    amount: am,
    coinType: coinType,
    change: change,
    label: label,
    identity: id,
    isWatchOnly: isWatchOnly
  };
}

function unpackInput (input) {
  if (isCoinBase(input)) {
    return {addr: 'Coinbase', value: this.totalOut};
  } else {
    return input.prev_out;
  }
}

function computeAmount(Tx) {
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

function computeTxType(Tx) {
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
      v = 'complex'
  }
  return v;
}

function isCoinBase (input) {
  return (input == null || input.prev_out == null || input.prev_out.addr == null);
}

Tx.factory = function (o) {
  if (o instanceof Object && !(o instanceof Tx)) {
    return new Tx(o);
  }
  else { return o; }
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
    toWatchOnly: tx.toWatchOnly
  };
};
