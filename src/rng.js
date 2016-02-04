'use strict';

module.exports = new RNG();

var randomBytes = require('randombytes');
var API         = require('./api');
var Buffer      = require('buffer').Buffer;
var assert      = require('assert');
var Helpers     = require('./helpers');

function RNG() {
  this.ACTION    = 'GET';
  this.URL       = 'https://api.blockchain.info/v2/randombytes';
  this.FORMAT    = 'hex';  // raw, hex, base64
  this.BYTES     = 32;
}


// xor :: Buffer -> Buffer -> Buffer
RNG.prototype.xor = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Expected arguments to be buffers');
  assert(a.byteLength === b.byteLength, 'Expected arguments to have equal length');

  var xorBytes = Array.prototype.map.call(a, function (aByte, index) {
    return aByte ^ b[index];
  });

  return new Buffer(xorBytes);
};

// run :: Int -> Buffer
RNG.prototype.run = function (nBytes) {
  try {
    nBytes = !isNaN(nBytes) && nBytes > 0 ? nBytes : this.BYTES;
    var serverH = this.getServerEntropy(nBytes);

    assert(
      !Array.prototype.every.call(serverH, function (b) { return b === serverH[0] }),
      'The server entropy should not be the same byte repeated.'
    );

    var localH = randomBytes(nBytes);

    assert(
      !Array.prototype.every.call(localH, function (b) { return b === localH[0] }),
      'The browser entropy should not be the same byte repeated.'
    );
    assert(
      serverH.byteLength === localH.byteLength,
      'Both entropies should be same of the length.'
    );

    var combinedH = this.xor(localH, serverH);

    assert(
      !Array.prototype.every.call(combinedH, function (b) { return b === combinedH[0] }),
      'The combined entropy should not be the same byte repeated.'
    );
    assert(
      combinedH.byteLength === nBytes,
      'Combined entropy should be of requested length.'
    );

    return combinedH;

  } catch (e) {
    console.log('Error: RNG.run');
    console.log(e);
    throw 'Error generating the entropy';
  }
};

// getServerEntropy :: int -> Buffer
RNG.prototype.getServerEntropy = function (sizeBytes) {

  var request = new XMLHttpRequest();
  assert(this.FORMAT === 'hex', 'Only supported hex format.')
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
    throw 'network connection error';
  }
}
