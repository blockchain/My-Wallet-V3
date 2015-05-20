'use strict';

module.exports = HDWallet;
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = require('bitcoinjs-lib');
var assert  = require('assert');
var Helpers = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// Address class
function HDWallet(object){
  // private members
  this.o = object;
  // var obj = object || {};
  // this._addr  = obj.addr;
  // this._priv  = obj.priv;
  // this._label = obj.label;
  // this._tag   = obj.tag || 0;  //default is non-archived
  // this._created_time           = obj.created_time;
  // this._created_device_name    = obj.created_device_name;
  // this._created_device_version = obj.created_device_version;
}
