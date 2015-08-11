'use strict';

var assert = require('assert');
var $ = require('jquery');
var CryptoJS = require('crypto-js');
var sjcl = require('sjcl');
var uuid = require('uuid');

var SUPPORTED_ENCRYPTION_VERSION = 3.0;

function decryptSecretWithSecondPassword(secret, password, sharedKey, pbkdf2_iterations) {
  assert(secret, "secret missing");
  assert(password, "password missing");
  assert(sharedKey, "sharedKey missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");

  var result = decryptAes(secret, sharedKey + password, pbkdf2_iterations);
  if (result === "") {
    throw 'Second password decryption failure.';
  }
  return result;
}

function encryptSecretWithSecondPassword(base58, password, sharedKey, pbkdf2_iterations) {
  assert(base58, "base58 missing");
  assert(password, "password missing");
  assert(sharedKey, "sharedKey missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");
  return encrypt(base58, sharedKey + password, pbkdf2_iterations);
}

function cipherFunction(password, sharedKey, pbkdf2Iterations, operation) {
  // operation can be "enc" or "dec"
  var id = function (msg) {return msg;};
  if (!password || !sharedKey || !pbkdf2Iterations) { return id;}
  else{
    switch(operation) {
      case "enc":
        return function (msg) {return encryptSecretWithSecondPassword(msg, password, sharedKey, pbkdf2Iterations);};
        break;
      case "dec":
        return function (msg) {return decryptSecretWithSecondPassword(msg, password, sharedKey, pbkdf2Iterations);};
        break;
      default:
        return id;
    };
  };
}

function decrypt(data, password, pbkdf2_iterations) {
  assert(data, "data missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");

  var decrypted;

  // Default encryption mode
  // v2 and v3 wallet format encryption with pkbdf2_iterations from json
  // v1 wallet encryption with 10 iterations
  // v1: CBC, ISO10126, 10 iterations
  try {
    decrypted = decryptAes(data, password, pbkdf2_iterations);

    if (decrypted !== null && decrypted.length > 0) {
      return decrypted;
    }
  } catch (e) {
    console.log('Decryption error for CBC, ISO10126, 10 iterations');
  }

  // v1: OFB, nopad, 1 iteration
  try {
    decrypted = decryptAes(data, password, 1, {
      mode: CryptoJS.mode.OFB,
      padding: CryptoJS.pad.NoPadding});

    if (decrypted !== null && decrypted.length > 0) {
      return decrypted;
    }
  } catch (e) {
    console.log('Decryption error for  OFB, nopad, 1 iteration');
  }

  // v1: OFB, ISO7816, 1 iteration
  // ISO/IEC 9797-1 Padding method 2 is the same as ISO/IEC 7816-4:2005
  try {
    decrypted = decryptAes(data, password, 1, {
      mode: CryptoJS.mode.OFB,
      padding: CryptoJS.pad.Iso97971});

    if (decrypted !== null && decrypted.length > 0) {
      return decrypted;
    }
  } catch (e) {
    console.log('Decryption error');
  }

    // v1: CBC, ISO10126, 1 iteration
  try {
    decrypted = decryptAes(data, password, 1, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126});

    if (decrypted !== null && decrypted.length > 0) {
      return decrypted;
    }
  } catch (e) {
    console.log('Decryption error');
  }

  throw 'Decryption failed';
}

function encrypt(data, password, pbkdf2_iterations) {
  assert(data, "data missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");

  var salt = CryptoJS.lib.WordArray.random(16);
  var stretched_password = stretchPassword(password, salt, pbkdf2_iterations);
  var iv = salt;
  var payload = CryptoJS.enc.Utf8.parse(data);
  var encrypted = CryptoJS.AES.encrypt(payload, stretched_password, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126,
    iv: iv
  });
  var res = iv.toString() + encrypted.ciphertext.toString();
  return CryptoJS.enc.Hex.parse(res).toString(CryptoJS.enc.Base64);
}

function decryptAes(data, password, pbkdf2_iterations, options) {
  /* There are two steps to decrypting with AES. The first step is to
   stretch the password using PBKDF2. This essentially generates
   an AES key which we need for the second step, which is to decrypt
   the payload using AES.

   Strechting the password requires a salt. AES requires an IV. We use
   the same for both. It's the first 32 hexadecimals characters (i.e.
   16 bytes). */

   // The conversions between different encodings can probably be achieved
   // with fewer methods.

  assert(data, "data missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");

  // Default wallet encryption options (as of 2014-11-28)
  options = options || {};
  var mode = options.mode || CryptoJS.mode.CBC;
  var padding = options.padding || CryptoJS.pad.Iso10126;

  var data_hex_string = CryptoJS.enc.Base64.parse(data).toString();
  var iv = CryptoJS.enc.Hex.parse(data_hex_string.slice(0, 32));
  var salt = iv;
  var stretched_password = stretchPassword(password, salt, pbkdf2_iterations);
  var payload_hex_string = data_hex_string.slice(32);
  var payload = CryptoJS.enc.Hex.parse(payload_hex_string);

  var decrypted = CryptoJS.AES.decrypt({
    ciphertext: payload,
    salt: ''
  }, stretched_password, {
    mode: mode,
    padding: padding,
    iv: iv
  });
  var decoded = decrypted.toString(CryptoJS.enc.Utf8);
  return decoded;
}

function encryptWallet(data, password, pbkdf2_iterations, version, encryptedPassword)  {
  assert(data, "data missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");
  assert(version, "version missing");

  var payload = {
    pbkdf2_iterations: pbkdf2_iterations,
    version: version,
    payload: encrypt(data, password, pbkdf2_iterations),
  };

  if(encryptedPassword != undefined && encryptedPassword != null) {
    payload.encryptedPassword = encryptedPassword;
  }

  return JSON.stringify(payload);
}

function decryptWallet(data, password, success, error) {
  assert(data, 'Encrypted wallet data missing');
  assert(password, 'Password missing or empty');
  assert(success, 'Success callback required');
  assert(error, 'Error callback required');

  var walletVersion = null;
  var jsonWrapper = null;
  try {
    jsonWrapper = $.parseJSON(data);
    if (jsonWrapper) {
      assert(jsonWrapper.payload, 'v2 Wallet error: missing payload');
      assert(jsonWrapper.pbkdf2_iterations, 'v2 Wallet error: missing pbkdf2 iterations');
      assert(jsonWrapper.version, 'v2 Wallet error: missing version');

      walletVersion = jsonWrapper.version;
    }
  } catch (e) {
    // v1 Wallet format does not have a json wrapper, just the encrypted wallet.json
    walletVersion = 1;
  }

  var decryptedWallet, jsonWallet;
  if (walletVersion > SUPPORTED_ENCRYPTION_VERSION) {
    error('Wallet version ' + walletVersion + ' not supported. Please upgrade to the newest Blockchain Wallet.');
  }
  else if (walletVersion >= 2) {
    try {
      decryptedWallet = decryptAes(jsonWrapper.payload, password, jsonWrapper.pbkdf2_iterations);
      jsonWallet = $.parseJSON(decryptedWallet);


    } catch (e) {
      error('Error Decrypting Wallet. Please check your password is correct.');
      return;
    }
    success(jsonWallet, jsonWrapper);
  } else {
    try {
      decryptedWallet = decrypt(data, password, 10);
      jsonWallet = $.parseJSON(decryptedWallet);


    } catch (e) {
      error('Error Decrypting Wallet. Please check your password is correct.');
      return;
    }
    success(jsonWallet);
  }
}

/**
 * Reencrypt data with password.
 * The decrypt call uses the currently set number of iterations, the encrypt call uses the new number of iterations we're just setting
 #
 * @param {!string} data The data to encrypt.
 * @param {!string} pw The password used for encryption.
 */
function reencrypt(pw, sharedKey, previous_pbkdf2_iterations, new_pbkdf2_iterations) {
  var enc;
  assert(pw, "password missing");
  assert(sharedKey, "password missing");
  assert(previous_pbkdf2_iterations, "previous_pbkdf2_iterations missing");
  assert(new_pbkdf2_iterations, "new_pbkdf2_iterations missing");

  enc = function(data) {
    return encrypt(decryptSecretWithSecondPassword(data, pw, sharedKey, previous_pbkdf2_iterations), sharedKey + pw, new_pbkdf2_iterations);
  };
  return enc;
}

function decryptPasswordWithProcessedPin(data, password, pbkdf2_iterations) {
  assert(data, "data missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");
  return decryptAes(data, password, pbkdf2_iterations);
}

function stretchPassword(password, salt, pbkdf2_iterations) {
  assert(salt, "salt missing");
  assert(password, "password missing");
  assert(pbkdf2_iterations, "pbkdf2_iterations missing");

  var hmacSHA1 = function(key) {
    var hasher;
    hasher = new sjcl.misc.hmac(key, sjcl.hash.sha1);
    this.encrypt = function() {
      return hasher.encrypt.apply(hasher, arguments);
    };
  };
  salt = sjcl.codec.hex.toBits(salt.toString(CryptoJS.enc.Hex));
  var stretched_password = sjcl.misc.pbkdf2(password, salt, pbkdf2_iterations, 256, hmacSHA1);
  return CryptoJS.enc.Hex.parse(sjcl.codec.hex.fromBits(stretched_password));
}

function hashNTimes(password, iterations) {
  //N rounds of SHA 256
  var round_data = CryptoJS.SHA256(password);
  for (var i = 1; i < iterations; ++i) {
    round_data = CryptoJS.SHA256(round_data);
  }
  return round_data.toString();
};

// http://stackoverflow.com/a/11893415
function wordToByteArray(wordArray) {
    var byteArray = [], word, i, j;
    for (i = 0; i < wordArray.length; ++i) {
        word = wordArray[i];
        for (j = 3; j >= 0; --j) {
            byteArray.push((word >> 8 * j) & 0xFF);
        }
    }
    return byteArray;
}

function encryptPasswordWithSeed(password, seedHexString, pbkdf2_iterations) {
  assert(seedHexString.length == 128, "Expected a 256 bit seed as a hex string")
  var seed = CryptoJS.enc.Hex.parse(seedHexString);

  return encrypt(password, seed, pbkdf2_iterations);
}

function decryptPasswordWithSeed(encryptedPassword, seedHexString, pbkdf2_iterations) {
  assert(seedHexString.length == 128, "Expected a 512 bit seed as a hex string")
  var seed = CryptoJS.enc.Hex.parse(seedHexString);

  return decryptAes(encryptedPassword, seed, pbkdf2_iterations);
}

function seedToKeys(seedHexString) {
  assert(seedHexString.length == 128, "Expected a 512 bit seed as a hex string")
  var seed = CryptoJS.enc.Hex.parse(seedHexString);
  var doubleHash = CryptoJS.SHA512(CryptoJS.SHA512(seed));

  var doubleHashBuffer = Buffer(wordToByteArray(doubleHash.words));

  var guidBuffer = new Buffer(16);
  var sharedKeyBuffer = new Buffer(16);
  var metaDataKeyBuffer = new Buffer(16);
  var unusedBuffer = new Buffer(16);

  doubleHashBuffer.copy(guidBuffer,0,0,16);
  doubleHashBuffer.copy(sharedKeyBuffer,0,16,32);
  doubleHashBuffer.copy(metaDataKeyBuffer,0,32,48);
  doubleHashBuffer.copy(unusedBuffer,0,48,64);

  return {
    guid: uuid.v4({random: guidBuffer}),
    sharedKey: uuid.v4({random: sharedKeyBuffer}),
    metaDataKey: metaDataKeyBuffer.toString('base64')
  };
};

function encryptMetaData(obj, keyBase64) {
  assert(obj, "object array or dictionary missing");
  assert(keyBase64, "Base64 encoded key missing");

  var payload = JSON.stringify(obj);
  var key = CryptoJS.enc.Base64.parse(keyBase64);

  var iv = CryptoJS.lib.WordArray.random(256/8);

  var encryptedPayload = CryptoJS.AES.encrypt(payload, key, {iv: iv});

  return {
    version: 1,
    iv: iv.toString(CryptoJS.enc.Base64),
    payload: encryptedPayload.ciphertext.toString(CryptoJS.enc.Base64)
  };
}

function decryptMetaData(obj, keyBase64) {
  assert(obj, "dictionary missing");
  assert(obj.iv, "Base 64 encoded IV missing")
  assert(obj.payload, "Base 64 encoded payload missing")
  assert(keyBase64, "Base64 encoded key missing");

  var key = CryptoJS.enc.Base64.parse(keyBase64);
  var encryptedPayload = CryptoJS.enc.Base64.parse(obj.payload);
  var iv = CryptoJS.enc.Base64.parse(obj.iv);

  var decryptedPayload = CryptoJS.AES.decrypt(
    { ciphertext: encryptedPayload, salt: ''},
    key,
    {iv: iv}
  );

  var payloadString = decryptedPayload.toString(CryptoJS.enc.Utf8);
  return JSON.parse(payloadString);
}

module.exports = {
  decryptSecretWithSecondPassword: decryptSecretWithSecondPassword,
  encryptSecretWithSecondPassword: encryptSecretWithSecondPassword,
  decrypt: decrypt,
  encrypt: encrypt,
  encryptWallet: encryptWallet,
  decryptWallet: decryptWallet,
  reencrypt: reencrypt,
  decryptPasswordWithProcessedPin: decryptPasswordWithProcessedPin,
  stretchPassword: stretchPassword,
  hashNTimes: hashNTimes,
  cipherFunction: cipherFunction,
  wordToByteArray: wordToByteArray,
  encryptPasswordWithSeed: encryptPasswordWithSeed,
  decryptPasswordWithSeed: decryptPasswordWithSeed,
  seedToKeys: seedToKeys,
  encryptMetaData: encryptMetaData,
  decryptMetaData: decryptMetaData
};
