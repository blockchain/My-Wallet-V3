'use strict';

var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var Base58 = require('bs58');
var Unorm = require('unorm');
var WalletCrypto = require('./wallet-crypto');

var hash256 = Bitcoin.crypto.hash256;

var ImportExport = new function () {

  this.parseBIP38toECKey = function (base58Encrypted, passphrase, success, wrong_password, error) {
    var hex;

    // Unicode NFC normalization
    passphrase = Unorm.nfc(passphrase);

    try {
      hex = Base58.decode(base58Encrypted);
    } catch (e) {
      error('Invalid Private Key');
      return;
    }

    if (hex.length != 43) {
      error('Invalid Private Key');
      return;
    } else if (hex[0] != 0x01) {
      error('Invalid Private Key');
      return;
    }

    var expChecksum = hex.slice(-4);
    hex = hex.slice(0, -4);

    var checksum = hash256(hex);

    if (checksum[0] != expChecksum[0] || checksum[1] != expChecksum[1] || checksum[2] != expChecksum[2] || checksum[3] != expChecksum[3]) {
      error('Invalid Private Key');
      return;
    }

    var isCompPoint = false;
    var isECMult = false;
    var hasLotSeq = false;
    if (hex[1] == 0x42) {
      if (hex[2] == 0xe0) {
        isCompPoint = true;
      } else if (hex[2] != 0xc0) {
        error('Invalid Private Key');
        return;
      }
    } else if (hex[1] == 0x43) {
      isECMult = true;
      isCompPoint = (hex[2] & 0x20) != 0;
      hasLotSeq = (hex[2] & 0x04) != 0;
      if ((hex[2] & 0x24) != hex[2]) {
        error('Invalid Private Key');
        return;
      }
    } else {
      error('Invalid Private Key');
      return;
    }

    var decrypted;
    var AES_opts = { mode: WalletCrypto.AES.ECB, padding: WalletCrypto.pad.NoPadding };

    var verifyHashAndReturn = function () {
      var tmpkey = new Bitcoin.ECKey(decrypted, isCompPoint);

      var base58Address = tmpkey.pub.getAddress().toBase58Check();

      checksum = hash256(base58Address);

      if (checksum[0] != hex[3] || checksum[1] != hex[4] || checksum[2] != hex[5] || checksum[3] != hex[6]) {
        wrong_password();
        return;
      }

      success(tmpkey, isCompPoint);
    };

    if (!isECMult) {
      var addresshash = Buffer(hex.slice(3, 7));

      ImportExport.Crypto_scrypt(passphrase, addresshash, 16384, 8, 8, 64, function (derivedBytes) {

        var k = derivedBytes.slice(32, 32+32);

        var decryptedBytes = WalletCrypto.AES.decrypt(Buffer(hex.slice(7, 7+32)), k, null, AES_opts);
        for (var x = 0; x < 32; x++) { decryptedBytes[x] ^= derivedBytes[x]; }

        decrypted = BigInteger.fromBuffer(decryptedBytes);

        verifyHashAndReturn();
      });
    } else {
      var ownerentropy = hex.slice(7, 7+8);
      var ownersalt = Buffer(!hasLotSeq ? ownerentropy : ownerentropy.slice(0, 4));

      ImportExport.Crypto_scrypt(passphrase, ownersalt, 16384, 8, 8, 32, function (prefactorA) {

        var passfactor;

        if (!hasLotSeq) {
          passfactor = prefactorA;
        } else {
          var prefactorB = Buffer.concat([prefactorA, Buffer(ownerentropy)]);
          passfactor = hash256(prefactorB);
        }

        var kp = new Bitcoin.ECKey(BigInteger.fromBuffer(passfactor));

        var passpoint = kp.pub.toBuffer();

        var encryptedpart2 = Buffer(hex.slice(23, 23+16));

        var addresshashplusownerentropy = Buffer(hex.slice(3, 3+12));

        ImportExport.Crypto_scrypt(passpoint, addresshashplusownerentropy, 1024, 1, 1, 64, function (derived) {
          var k = derived.slice(32);

          var unencryptedpart2Bytes = WalletCrypto.AES.decrypt(encryptedpart2, k, null, AES_opts);

          for (var i = 0; i < 16; i++) { unencryptedpart2Bytes[i] ^= derived[i+16]; }

          var encryptedpart1 = Buffer.concat([Buffer(hex.slice(15, 15+8)), Buffer(unencryptedpart2Bytes.slice(0, 0+8))]);

          var unencryptedpart1Bytes = WalletCrypto.AES.decrypt(encryptedpart1, k, null, AES_opts);

          for (var i = 0; i < 16; i++) { unencryptedpart1Bytes[i] ^= derived[i]; }

          var seedb = Buffer.concat([Buffer(unencryptedpart1Bytes.slice(0, 0+16)), Buffer(unencryptedpart2Bytes.slice(8, 8+8))]);

          var factorb = hash256(seedb);

          // secp256k1: N
          var N = BigInteger.fromHex('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

          decrypted = BigInteger.fromBuffer(passfactor).multiply(BigInteger.fromBuffer(factorb)).remainder(N);

          verifyHashAndReturn();
        });
      });
    }
  };


  var MAX_VALUE = 2147483647;
  var workerUrl = null;

  this.Crypto_scrypt = function (passwd, salt, N, r, p, dkLen, callback) {
    if (N == 0 || (N & (N - 1)) != 0) throw Error('N must be > 0 and a power of 2');

    if (N > MAX_VALUE / 128 / r) throw Error('Parameter N is too large');
    if (r > MAX_VALUE / 128 / p) throw Error('Parameter r is too large');

    if(!Buffer.isBuffer(passwd)) {
      passwd = new Buffer(passwd, 'utf8');
    }

    if(!Buffer.isBuffer(salt)) {
      salt = new Buffer(salt, 'utf8');
    }

    var B = WalletCrypto.pbkdf2(passwd, salt, 1, (p * 128 * r), WalletCrypto.algo.SHA256);

    // Called in Firefox and IE which don't support Blob web workers with CSP enabled.
    window.setTimeout(function () {
      scryptCore();
      var ret = WalletCrypto.pbkdf2(passwd, B, 1, dkLen, WalletCrypto.algo.SHA256);

      callback(ret);
    }, 0);
    // }

    // using this function to enclose everything needed to create a worker (but also invokable directly for synchronous use)
    function scryptCore () {
      var XY = [], V = [];

      if (typeof B === 'undefined') {
        onmessage = function (event) {
          var data = event.data;
          var N = data[0], r = data[1], p = data[2], B = data[3], i = data[4];

          var Bslice = [];
          arraycopy32(B, i * 128 * r, Bslice, 0, 128 * r);
          smix(Bslice, 0, r, N, V, XY);

          postMessage([i, Bslice]);
        };
      } else {
        for(var i = 0; i < p; i++) {
          smix(B, i * 128 * r, r, N, V, XY);
        }
      }

      function smix (B, Bi, r, N, V, XY) {
        var Xi = 0;
        var Yi = 128 * r;
        var i;

        arraycopy32(B, Bi, XY, Xi, Yi);

        for (i = 0; i < N; i++) {
          arraycopy32(XY, Xi, V, i * Yi, Yi);
          blockmix_salsa8(XY, Xi, Yi, r);
        }

        for (i = 0; i < N; i++) {
          var j = integerify(XY, Xi, r) & (N - 1);
          blockxor(V, j * Yi, XY, Xi, Yi);
          blockmix_salsa8(XY, Xi, Yi, r);
        }

        arraycopy32(XY, Xi, B, Bi, Yi);
      }

      function blockmix_salsa8 (BY, Bi, Yi, r) {
        var X = [];
        var i;

        arraycopy32(BY, Bi + (2 * r - 1) * 64, X, 0, 64);

        for (i = 0; i < 2 * r; i++) {
          blockxor(BY, i * 64, X, 0, 64);
          salsa20_8(X);
          arraycopy32(X, 0, BY, Yi + (i * 64), 64);
        }

        for (i = 0; i < r; i++) {
          arraycopy32(BY, Yi + (i * 2) * 64, BY, Bi + (i * 64), 64);
        }

        for (i = 0; i < r; i++) {
          arraycopy32(BY, Yi + (i * 2 + 1) * 64, BY, Bi + (i + r) * 64, 64);
        }
      }

      function R (a, b) {
        return (a << b) | (a >>> (32 - b));
      }

      function salsa20_8 (B) {
        var B32 = new Array(32);
        var x   = new Array(32);
        var i;

        for (i = 0; i < 16; i++) {
          B32[i]  = (B[i * 4 + 0] & 0xff) << 0;
          B32[i] |= (B[i * 4 + 1] & 0xff) << 8;
          B32[i] |= (B[i * 4 + 2] & 0xff) << 16;
          B32[i] |= (B[i * 4 + 3] & 0xff) << 24;
        }

        arraycopy(B32, 0, x, 0, 16);

        for (i = 8; i > 0; i -= 2) {
          x[ 4] ^= R(x[ 0]+x[12], 7);  x[ 8] ^= R(x[ 4]+x[ 0], 9);
          x[12] ^= R(x[ 8]+x[ 4],13);  x[ 0] ^= R(x[12]+x[ 8],18);
          x[ 9] ^= R(x[ 5]+x[ 1], 7);  x[13] ^= R(x[ 9]+x[ 5], 9);
          x[ 1] ^= R(x[13]+x[ 9],13);  x[ 5] ^= R(x[ 1]+x[13],18);
          x[14] ^= R(x[10]+x[ 6], 7);  x[ 2] ^= R(x[14]+x[10], 9);
          x[ 6] ^= R(x[ 2]+x[14],13);  x[10] ^= R(x[ 6]+x[ 2],18);
          x[ 3] ^= R(x[15]+x[11], 7);  x[ 7] ^= R(x[ 3]+x[15], 9);
          x[11] ^= R(x[ 7]+x[ 3],13);  x[15] ^= R(x[11]+x[ 7],18);
          x[ 1] ^= R(x[ 0]+x[ 3], 7);  x[ 2] ^= R(x[ 1]+x[ 0], 9);
          x[ 3] ^= R(x[ 2]+x[ 1],13);  x[ 0] ^= R(x[ 3]+x[ 2],18);
          x[ 6] ^= R(x[ 5]+x[ 4], 7);  x[ 7] ^= R(x[ 6]+x[ 5], 9);
          x[ 4] ^= R(x[ 7]+x[ 6],13);  x[ 5] ^= R(x[ 4]+x[ 7],18);
          x[11] ^= R(x[10]+x[ 9], 7);  x[ 8] ^= R(x[11]+x[10], 9);
          x[ 9] ^= R(x[ 8]+x[11],13);  x[10] ^= R(x[ 9]+x[ 8],18);
          x[12] ^= R(x[15]+x[14], 7);  x[13] ^= R(x[12]+x[15], 9);
          x[14] ^= R(x[13]+x[12],13);  x[15] ^= R(x[14]+x[13],18);
        }

        for (i = 0; i < 16; ++i) B32[i] = x[i] + B32[i];

        for (i = 0; i < 16; i++) {
          var bi = i * 4;
          B[bi + 0] = (B32[i] >> 0  & 0xff);
          B[bi + 1] = (B32[i] >> 8  & 0xff);
          B[bi + 2] = (B32[i] >> 16 & 0xff);
          B[bi + 3] = (B32[i] >> 24 & 0xff);
        }
      }

      function blockxor (S, Si, D, Di, len) {
        var i = len>>6;
        while (i--) {
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];

          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
          D[Di++] ^= S[Si++]; D[Di++] ^= S[Si++];
        }
      }

      function integerify (B, bi, r) {
        var n;

        bi += (2 * r - 1) * 64;

        n  = (B[bi + 0] & 0xff) << 0;
        n |= (B[bi + 1] & 0xff) << 8;
        n |= (B[bi + 2] & 0xff) << 16;
        n |= (B[bi + 3] & 0xff) << 24;

        return n;
      }

      function arraycopy (src, srcPos, dest, destPos, length) {
        while (length-- ){
          dest[destPos++] = src[srcPos++];
        }
      }

      function arraycopy32 (src, srcPos, dest, destPos, length) {
        var i = length>>5;
        while(i--) {
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];

          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];

          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];

          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
          dest[destPos++] = src[srcPos++]; dest[destPos++] = src[srcPos++];
        }
      }
    } // scryptCore
  };

};

module.exports = ImportExport;
