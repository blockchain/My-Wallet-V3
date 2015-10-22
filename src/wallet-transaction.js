'use strict';

module.exports = Tx;
////////////////////////////////////////////////////////////////////////////////
// var Base58   = require('bs58');
// var Bitcoin  = require('bitcoinjs-lib');
var Helpers  = require('./helpers');
var MyWallet = require('./wallet');
////////////////////////////////////////////////////////////////////////////////
function Tx(object){
  var obj = object || {};
  // original properties
  this.balance          = obj.balance;
  this.block_height     = obj.block_height;
  this.hash             = obj.hash;
  this.inputs           = obj.inputs || [];
  this.lock_time        = obj.lock_time;
  this.out              = obj.out  || [];
  this.relayed_by       = obj.relayed_by;
  this.result           = obj.result;
  this.size             = obj.size;
  this.time             = obj.time;
  this.tx_index         = obj.tx_index;
  this.ver              = obj.ver;
  this.vin_sz           = obj.vin_sz;
  this.vout_sz          = obj.vout_sz;
  this.double_spend     = obj.double_spend;
  this.note             = obj.note;

  // computed properties
  this._processed_ins    = this.inputs.map(process.compose(unpackInput));
  this._processed_outs   = this.out.map(process);
  this._confirmations    = null; // should be filled later
}

Object.defineProperties(Tx.prototype, {
  "confirmations": {
    configurable: false,
    get: function() { return this._confirmations;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._confirmations = num;
      else
        throw 'Error: Tx.confirmations must be a number';
    }
  },
  "processedInputs": {
    configurable: false,
    get: function() { return this._processed_ins.map(function(x){return x;});}
  },
  "processedOutputs": {
    configurable: false,
    get: function() { return this._processed_outs.map(function(x){return x;});}
  },
  "totalIn": {
    configurable: false,
    get: function() {
      return this._processed_ins.map(function(x){return x.amount;})
                                 .reduce(Helpers.add, 0);
    }
  },
  "totalOut": {
    configurable: false,
    get: function() {
      return this._processed_outs.map(function(x){return x.amount;})
                                 .reduce(Helpers.add, 0);
    }
  },
  "fee": {
    configurable: false,
    get: function() {
      return this.totalIn - this.totalOut;
    }
  }
});

function isAccount(x) {
  if (x.xpub) { return true;}
  else {return false;}
};

function accountPath(x){
  var accIdx = MyWallet.wallet.hdwallet.account(x.xpub.m).index;
  return accIdx + x.xpub.path.substr(1);
};

function process(x) {
  var ad = x.addr;
  var am = x.value;
  var tg = null;

  switch (true) {
    case MyWallet.wallet.containsLegacyAddress(ad):
      tg = "legacy";
      break;
    case isAccount(x):
      tg = accountPath(x);
      break;
    default:
      tg = "external";
  }
  return {address: ad, amount: am, tag: tg};
};

function unpackInput(input) {
  return input.prev_out;
};
