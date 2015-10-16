'use strict';

module.exports = new RNG();
////////////////////////////////////////////////////////////////////////////////
var randomBytes = require('randombytes');
var Q           = require('q');
var API         = require('./api');
// var assert      = require('assert');
// var Helpers     = require('./helpers');
// var CryptoJS    = require('crypto-js');
////////////////////////////////////////////////////////////////////////////////
// API class
function RNG(){
  // private members
  this.ACTION    = "GET";
  this.URL       = "https://api.blockchain.info/v2/randombytes";
  this.TIMEOUT   = 60000;
  this.FORMAT    = 'hex';  // raw, hex, base64
  this.BYTES     = 32;
  // this.API_CODE    = "1770d5d9-bcea-4d28-ad21-6cbd5be018a8";
  }

// run :: Int -> Func -> Buffer
RNG.prototype.run = function (sizeBytes, callback) {
  // try {
  //   var H =
  // } catch (e) {
  //   console.log("There was an error collecting entropy from the browser:");
  //   console.log(e);
  //   throw e;
  // }
  // return H;

  return randomBytes(sizeBytes, callback);
};

RNG.prototype.runServer = function () {

  var defer = Q.defer();
  var request = new XMLHttpRequest();
  var data = { bytes: this.BYTES, format: this.FORMAT };
  var url = this.URL +  '?' + API.encodeFormData(data);
  request.open(this.ACTION, url , true);
  request.timeout = this.TIMEOUT;
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.withCredentials = true;

  request.onload = function (e) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        defer.resolve(request);
      } else {
        defer.reject(request);
      }
    }
  };
  request.onerror = function (e) {
    defer.reject(request);
  };
  request.ontimeout = function() {
    defer.reject("timeout request");
  };
  request.send();
  return defer.promise;
}
