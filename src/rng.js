'use strict';

module.exports = new RNG();
////////////////////////////////////////////////////////////////////////////////
var randomBytes = require('randombytes');
var Q           = require('q');
var API         = require('./api');
var Buffer      = require('buffer').Buffer;
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

function xor(a, b) {
  if (!Buffer.isBuffer(a)) a = new Buffer(a)
  if (!Buffer.isBuffer(b)) b = new Buffer(b)
  var res = []
  if (a.length > b.length) {
    for (var i = 0; i < b.length; i++) {
      res.push(a[i] ^ b[i])
    }
  } else {
    for (var i = 0; i < a.length; i++) {
      res.push(a[i] ^ b[i])
    }
  }
  return new Buffer(res);
}

// run :: Int -> Func -> Buffer
RNG.prototype.run = function (sizeBytes, callback) {

  var serverH = this.getServerEntropy(sizeBytes);
  function combine(sH) {
    var localH  = randomBytes(sizeBytes, callback);
    return xor(sH, localH);
  }
  return serverH.then(combine);
};

// getServerEntropy :: int -> Buffer
RNG.prototype.getServerEntropy = function (sizeBytes) {

  var defer = Q.defer();
  var request = new XMLHttpRequest();
  var b = sizeBytes ? sizeBytes : this.BYTES;
  var data = { bytes: b, format: this.FORMAT };
  var url = this.URL +  '?' + API.encodeFormData(data);
  request.open(this.ACTION, url , true);
  request.timeout = this.TIMEOUT;
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

  request.onload = function (e) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        var B = new Buffer(request.responseText, this.FORMAT);
        defer.resolve(B);
      } else {
        defer.reject(request.responseText);
      }
    }
  };
  request.onerror = function (e) {
    defer.reject(request.responseText);
  };
  request.ontimeout = function() {
    defer.reject("timeout request");
  };
  request.send();
  return defer.promise;
}
