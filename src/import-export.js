'use strict';

var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var Base58 = require('bs58');
var Unorm = require('unorm');
var WalletCrypto = require('./wallet-crypto');
var Buffer = require('buffer').Buffer;
var constants = require('./constants');

var hash256 = Bitcoin.crypto.hash256;

var ImportExport = new function () {
  this.parseBIP38toECPair = function (base58Encrypted, passphrase, success, wrongPassword, error) {
    var hex;

    // Unicode NFC normalization
    passphrase = Unorm.nfc(passphrase);

    try {
      hex = Base58.decode(base58Encrypted);
    } catch (e) {
      error('Invalid Private Key');
      return;
    }

    if (hex.length !== 43) {
      error('Invalid Private Key');
      return;
    } else if (hex[0] !== 0x01) {
      error('Invalid Private Key');
      return;
    }

    var expChecksum = hex.slice(-4);
    hex = hex.slice(0, -4);

    var checksum = hash256(hex);

    if (checksum[0] !== expChecksum[0] || checksum[1] !== expChecksum[1] || checksum[2] !== expChecksum[2] || checksum[3] !== expChecksum[3]) {
      error('Invalid Private Key');
      return;
    }

    var isCompPoint = false;
    var isECMult = false;
    var hasLotSeq = false;
    if (hex[1] === 0x42) {
      if (hex[2] === 0xe0) {
        isCompPoint = true;
      } else if (hex[2] !== 0xc0) {
        error('Invalid Private Key');
        return;
      }
    } else if (hex[1] === 0x43) {
      isECMult = true;
      isCompPoint = (hex[2] & 0x20) !== 0;
      hasLotSeq = (hex[2] & 0x04) !== 0;
      if ((hex[2] & 0x24) !== hex[2]) {
        error('Invalid Private Key');
        return;
      }
    } else {
      error('Invalid Private Key');
      return;
    }

    var decrypted;
    var AESopts = { mode: WalletCrypto.AES.ECB, padding: WalletCrypto.pad.NoPadding };

    var verifyHashAndReturn = function () {
      var tmpkey = new Bitcoin.ECPair(decrypted, null, {compressed: isCompPoint, network: constants.getNetwork()});

      var base58Address = tmpkey.getAddress();

      checksum = hash256(base58Address);

      if (checksum[0] !== hex[3] || checksum[1] !== hex[4] || checksum[2] !== hex[5] || checksum[3] !== hex[6]) {
        wrongPassword();
        return;
      }
      success(tmpkey, isCompPoint);
    };

    if (!isECMult) {
      var addresshash = Buffer(hex.slice(3, 7));

      WalletCrypto.scrypt(passphrase, addresshash, 16384, 8, 8, 64, function (derivedBytes) {
        var k = derivedBytes.slice(32, 32 + 32);

        var decryptedBytes = WalletCrypto.AES.decrypt(Buffer(hex.slice(7, 7 + 32)), k, null, AESopts);
        for (var x = 0; x < 32; x++) { decryptedBytes[x] ^= derivedBytes[x]; }

        decrypted = BigInteger.fromBuffer(decryptedBytes);

        verifyHashAndReturn();
      });
    } else {
      var ownerentropy = hex.slice(7, 7 + 8);
      var ownersalt = Buffer(!hasLotSeq ? ownerentropy : ownerentropy.slice(0, 4));

      WalletCrypto.scrypt(passphrase, ownersalt, 16384, 8, 8, 32, function (prefactorA) {
        var passfactor;

        if (!hasLotSeq) {
          passfactor = prefactorA;
        } else {
          var prefactorB = Buffer.concat([prefactorA, Buffer(ownerentropy)]);
          passfactor = hash256(prefactorB);
        }

        var kp = new Bitcoin.ECPair(BigInteger.fromBuffer(passfactor), null, {network: constants.getNetwork()});

        var passpoint = kp.getPublicKeyBuffer();

        var encryptedpart2 = Buffer(hex.slice(23, 23 + 16));

        var addresshashplusownerentropy = Buffer(hex.slice(3, 3 + 12));

        WalletCrypto.scrypt(passpoint, addresshashplusownerentropy, 1024, 1, 1, 64, function (derived) {
          var k = derived.slice(32);

          var unencryptedpart2Bytes = WalletCrypto.AES.decrypt(encryptedpart2, k, null, AESopts);

          for (var i = 0; i < 16; i++) { unencryptedpart2Bytes[i] ^= derived[i + 16]; }

          var encryptedpart1 = Buffer.concat([Buffer(hex.slice(15, 15 + 8)), Buffer(unencryptedpart2Bytes.slice(0, 0 + 8))]);

          var unencryptedpart1Bytes = WalletCrypto.AES.decrypt(encryptedpart1, k, null, AESopts);

          for (var ii = 0; ii < 16; ii++) { unencryptedpart1Bytes[ii] ^= derived[ii]; }

          var seedb = Buffer.concat([Buffer(unencryptedpart1Bytes.slice(0, 0 + 16)), Buffer(unencryptedpart2Bytes.slice(8, 8 + 8))]);

          var factorb = hash256(seedb);

          // secp256k1: N
          var N = BigInteger.fromHex('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

          decrypted = BigInteger.fromBuffer(passfactor).multiply(BigInteger.fromBuffer(factorb)).remainder(N);

          verifyHashAndReturn();
        });
      });
    }
  };
};

module.exports = ImportExport;
