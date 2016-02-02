'use strict';

module.exports = new RNG();
////////////////////////////////////////////////////////////////////////////////
var randomBytes = require('randombytes');
// var Q           = require('q');
var API         = require('./api');
var Buffer      = require('buffer').Buffer;
var assert      = require('assert');
var Helpers = require('./helpers');
////////////////////////////////////////////////////////////////////////////////
// API class
function RNG(){
  this.ACTION    = "GET";
  this.URL       = "https://api.blockchain.info/v2/randombytes";
  this.FORMAT    = 'hex';  // raw, hex, base64
  this.BYTES     = 32;
  }


RNG.prototype.xor = function (a, b) {
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

// run :: Int -> Fun -> Buffer
RNG.prototype.run = function (sizeBytes, callback) {
  try {
    var b = sizeBytes ? sizeBytes : this.BYTES;
    var serverH = this.getServerEntropy(b);
    assert(!Array.prototype.every.call(serverH, function(byte){return byte === serverH[0]}), 'The server entropy should not be the same byte repeated.');
    var localH = randomBytes(b, callback);
    assert(!Array.prototype.every.call(localH, function(byte){return byte === localH[0]}), 'The browser entropy should not be the same byte repeated.');
    assert(serverH.byteLength === localH.byteLength, 'Error: both entropies should be same of the length.');
    var combinedH = this.xor(localH, serverH);
    assert(!Array.prototype.every.call(combinedH, function(byte){return byte === combinedH[0]}), 'The combined entropy should not be the same byte repeated.');
    assert(combinedH.byteLength === b, 'Error: combined entropy should be of requested length.');
    var zero = new Buffer(serverH.byteLength);
    assert(Buffer.compare(combinedH, zero) !== 0, 'Error: zero array entropy not allowed.');
  } catch (e) {
    console.log("Error: RNG.run");
    console.log(e);
    throw "Error generating the entropy";
  }
  return combinedH;
};

// getServerEntropy :: int -> Buffer
RNG.prototype.getServerEntropy = function (sizeBytes) {

  var request = new XMLHttpRequest();
  assert(this.FORMAT === 'hex', "Only supported hex format.")
  var b = sizeBytes ? sizeBytes : this.BYTES;
  var data = { bytes: b, format: this.FORMAT };
  var url = this.URL +  '?' + API.encodeFormData(data);
  request.open(this.ACTION, url , false);
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.send(null);
  if (request.status === 200) {
    assert(Helpers.isHex(request.responseText), 'Error: non-hex server entropy answer.');
    var B = new Buffer(request.responseText, this.FORMAT);
    assert(B.byteLength === b, 'Error: different entropy length requested.');
    return B;
  }
  else{
    throw "network connection error";
  }
}
