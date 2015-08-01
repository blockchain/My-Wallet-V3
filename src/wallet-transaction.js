'use strict';

module.exports = ProcessedTransaction;
////////////////////////////////////////////////////////////////////////////////
// var Base58   = require('bs58');
// var Bitcoin  = require('bitcoinjs-lib');
var Helpers  = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// ProcessedTransaction class
function ProcessedTransaction(object){
  var obj = object || {};
  // original properties
  this._hash             = obj.hash;
  this._size             = obj.size;
  this._txIndex          = objt.txIndex;
  this._time             = obj.time;
  this._inputs           = obj.inputs;
  this._out              = obj.out;
  this._blockIndex       = obj.blockIndex;
  this._blockHeight      = obj.blockHeight;
  this._balance          = obj.balance;
  this._double_spend     = obj.double_spend;
  this._note             = obj.note;
  this._account_indexes  = [];    // should be filled later
  this._confirmations    = null; // should be filled later
  // computed properties
  this._from = {account: null, legacyAddresses: null, externalAddresses: null};
  this._to = to: {account: null, legacyAddresses: null, externalAddresses: null, email: null, mobile: null};
  this._fee = 0;
  this._intraWallet = null;
}

// public members
Object.defineProperties(ProcessedTransaction.prototype, {
  "confirmations": {
    configurable: false,
    get: function() { return this._confirmations;},
    set: function(num) {
      if(Helpers.isNumber(num))
        this._confirmations = num;
      else
        throw 'Error: ProcessedTransaction.confirmations must be a number';
    }
  }
});

// ProcessedTransaction.factory = function(){
// };

// this should be equivalent to old processTransaction
ProcessedTransaction.prototype.import = function(wallet){

  return this;
};
