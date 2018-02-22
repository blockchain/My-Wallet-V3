'use strict';

var crypto = require('crypto');
var assert = require('assert');
var scrypt = require('scryptsy');
var { pbkdf2Sync } = require('pbkdf2');

var SUPPORTED_ENCRYPTION_VERSION = 3;
var SALT_BYTES = 16;
var KEY_BIT_LEN = 256;
var BLOCK_BIT_LEN = 128;

var ALGO = {
  SHA1: 'sha1',
  SHA256: 'sha256'
};

var NoPadding = {
  /*
  *   Literally does nothing...
  */

  pad: function (dataBytes) {
    return dataBytes;
  },

  unpad: function (dataBytes) {
    return dataBytes;
  }
};

var ZeroPadding = {
  /*
  *   Fills remaining block space with 0x00 bytes
  *   May cause issues if data ends with any 0x00 bytes
  */

  pad: function (dataBytes, nBytesPerBlock) {
    var nPaddingBytes = nBytesPerBlock - dataBytes.length % nBytesPerBlock;
    var zeroBytes = new Buffer(nPaddingBytes).fill(0x00);
    return Buffer.concat([ dataBytes, zeroBytes ]);
  },

  unpad: function (dataBytes) {
    var unpaddedHex = dataBytes.toString('hex').replace(/(00)+$/, '');
    return new Buffer(unpaddedHex, 'hex');
  }
};

var Iso10126 = {
  /*
  *   Fills remaining block space with random byte values, except for the
  *   final byte, which denotes the byte length of the padding
  */

  pad: function (dataBytes, nBytesPerBlock) {
    var nPaddingBytes = nBytesPerBlock - dataBytes.length % nBytesPerBlock;
    var paddingBytes = crypto.randomBytes(nPaddingBytes - 1);
    var endByte = new Buffer([ nPaddingBytes ]);
    return Buffer.concat([ dataBytes, paddingBytes, endByte ]);
  },

  unpad: function (dataBytes) {
    var nPaddingBytes = dataBytes[dataBytes.length - 1];
    return dataBytes.slice(0, -nPaddingBytes);
  }
};

var Iso97971 = {
  /*
  *   Fills remaining block space with 0x00 bytes following a 0x80 byte,
  *   which serves as a mark for where the padding begins
  */

  pad: function (dataBytes, nBytesPerBlock) {
    var withStartByte = Buffer.concat([ dataBytes, new Buffer([ 0x80 ]) ]);
    return ZeroPadding.pad(withStartByte, nBytesPerBlock);
  },

  unpad: function (dataBytes) {
    var zeroBytesRemoved = ZeroPadding.unpad(dataBytes);
    return zeroBytesRemoved.slice(0, zeroBytesRemoved.length - 1);
  }
};

var AES = {
  CBC: 'aes-256-cbc',
  OFB: 'aes-256-ofb',
  ECB: 'aes-256-ecb',

  /*
  *   Encrypt / Decrypt with aes-256
  *   - dataBytes, key, and salt are expected to be buffers
  *   - default options are mode=CBC and padding=auto (PKCS7)
  */

  encrypt: function (dataBytes, key, salt, options) {
    options = options || {};
    assert(Buffer.isBuffer(dataBytes), 'expected `dataBytes` to be a Buffer');
    assert(Buffer.isBuffer(key), 'expected `key` to be a Buffer');
    assert(Buffer.isBuffer(salt) || salt === null, 'expected `salt` to be a Buffer or null');

    var cipher = crypto.createCipheriv(options.mode || AES.CBC, key, salt || '');
    cipher.setAutoPadding(!options.padding);

    if (options.padding) dataBytes = options.padding.pad(dataBytes, BLOCK_BIT_LEN / 8);
    var encryptedBytes = Buffer.concat([ cipher.update(dataBytes), cipher.final() ]);

    return encryptedBytes;
  },

  decrypt: function (dataBytes, key, salt, options) {
    options = options || {};
    assert(Buffer.isBuffer(dataBytes), 'expected `dataBytes` to be a Buffer');
    assert(Buffer.isBuffer(key), 'expected `key` to be a Buffer');
    assert(Buffer.isBuffer(salt) || salt === null, 'expected `salt` to be a Buffer or null');

    var decipher = crypto.createDecipheriv(options.mode || AES.CBC, key, salt || '');
    decipher.setAutoPadding(!options.padding);

    var decryptedBytes = Buffer.concat([ decipher.update(dataBytes), decipher.final() ]);
    if (options.padding) decryptedBytes = options.padding.unpad(decryptedBytes);

    return decryptedBytes;
  }
};

function encryptWallet (data, password, pbkdf2Iterations, version) {
  assert(data, 'data missing');
  assert(password, 'password missing');
  assert(pbkdf2Iterations, 'pbkdf2Iterations missing');
  assert(version, 'version missing');

  return JSON.stringify({
    pbkdf2_iterations: pbkdf2Iterations,
    version: version,
    payload: encryptDataWithPassword(data, password, pbkdf2Iterations)
  });
}

function decryptWallet (data, password, success, error) {
  try {
    success(decryptWalletSync(data, password));
  } catch (e) {
    error(e && e.message || e);
  }
}

function decryptWalletSync (data, password) {
  assert(data, 'function `decryptWallet` requires encrypted wallet data');
  assert(password, 'function `decryptWallet` requires a password');

  var wrapper, version, decrypted;

  try {
    wrapper = JSON.parse(data);
  } catch (e) {
    version = 1;
  }

  if (wrapper) {
    assert(wrapper.payload, 'v2 Wallet error: missing payload');
    assert(wrapper.pbkdf2_iterations, 'v2 Wallet error: missing pbkdf2 iterations');
    assert(wrapper.version, 'v2 Wallet error: missing version');
    version = wrapper.version;
  }

  if (version > SUPPORTED_ENCRYPTION_VERSION) {
    throw new Error('Wallet version ' + version + ' not supported.');
  }

  try {
    // v2/v3: CBC, ISO10126, iterations in wrapper
    decrypted = decryptDataWithPassword(wrapper.payload, password, wrapper.pbkdf2_iterations);
    decrypted = JSON.parse(decrypted);
  } catch (e) {
    decrypted = decryptWalletV1(data, password);
  } finally {
    assert(decrypted, 'Error decrypting wallet, please check that your password is correct');
    return decrypted; // eslint-disable-line no-unsafe-finally
  }
}

function decryptWalletV1 (data, password) {
  // Possible decryption methods for v1 wallets
  var decryptFns = [
    // v1: CBC, ISO10126, 10 iterations
    decryptDataWithPassword.bind(null, data, password, 10),

    // v1: OFB, nopad, 1 iteration
    decryptDataWithPassword.bind(null, data, password, 1, {
      mode: AES.OFB,
      padding: NoPadding
    }),

    // v1: OFB, ISO7816, 1 iteration
    // ISO/IEC 9797-1 Padding method 2 is the same as ISO/IEC 7816-4:2005
    decryptDataWithPassword.bind(null, data, password, 1, {
      mode: AES.OFB,
      padding: Iso97971
    }),

    // v1: CBC, ISO10126, 1 iteration
    decryptDataWithPassword.bind(null, data, password, 1, {
      mode: AES.CBC,
      padding: Iso10126
    })
  ];

  return decryptFns.reduce(function (acc, decrypt) {
    if (acc) return acc;
    try {
      return JSON.parse(decrypt());
    } catch (e) {
      return null;
    }
  }, null);
}

function cipherFunction (password, sharedKey, pbkdf2Iterations, operation) {
  // operation can be 'enc' or 'dec'
  var id = function (msg) { return msg; };
  if (!password || !sharedKey || !pbkdf2Iterations) {
    return id;
  } else {
    switch (operation) {
      case 'enc':
        return function (msg) {
          return encryptSecretWithSecondPassword(msg, password, sharedKey, pbkdf2Iterations);
        };
      case 'dec':
        return function (msg) {
          return decryptSecretWithSecondPassword(msg, password, sharedKey, pbkdf2Iterations);
        };
      default:
        return id;
    }
  }
}

function encryptSecretWithSecondPassword (base58, password, sharedKey, pbkdf2Iterations) {
  return encryptDataWithPassword(base58, sharedKey + password, pbkdf2Iterations);
}

function decryptSecretWithSecondPassword (secret, password, sharedKey, pbkdf2Iterations) {
  return decryptDataWithPassword(secret, sharedKey + password, pbkdf2Iterations);
}

function decryptPasswordWithProcessedPin (data, password, pbkdf2Iterations) {
  return decryptDataWithPassword(data, password, pbkdf2Iterations);
}

// data: e.g. JSON.stringify({...})
// key: AES key (256 bit Buffer)
// iv: optional initialization vector
// returns: concatenated and Base64 encoded iv + payload
function encryptDataWithKey (data, key, iv) {
  iv = iv || crypto.randomBytes(SALT_BYTES);

  var dataBytes = new Buffer(data, 'utf8');
  var options = { mode: AES.CBC, padding: Iso10126 };

  var encryptedBytes = AES.encrypt(dataBytes, key, iv, options);
  var payload = Buffer.concat([ iv, encryptedBytes ]);

  return payload.toString('base64');
}

function encryptDataWithPassword (data, password, iterations) {
  assert(data, 'data missing');
  assert(password, 'password missing');
  assert(iterations, 'iterations missing');

  var salt = crypto.randomBytes(SALT_BYTES);
  // Expose stretchPassword for iOS to override
  var key = module.exports.stretchPassword(password, salt, iterations, KEY_BIT_LEN);

  return encryptDataWithKey(data, key, salt);
}

// payload: Base64 encoded concatenated payload + iv
// key: AES key (256 bit Buffer)
// returns: decrypted payload (e.g. a JSON string)
function decryptDataWithKey (data, key) {
  var dataHex = new Buffer(data, 'base64');

  var iv = dataHex.slice(0, SALT_BYTES);
  var payload = dataHex.slice(SALT_BYTES);

  return this.decryptBufferWithKey(payload, iv, key);
}

// payload: (Buffer)
// iv: initialization vector (Buffer)
// key: AES key (256 bit Buffer)
// options: (optional)
// returns: decrypted payload (e.g. a JSON string)
function decryptBufferWithKey (payload, iv, key, options) {
  options = options || {};
  options.padding = options.padding || Iso10126;

  var decryptedBytes = AES.decrypt(payload, key, iv, options);
  return decryptedBytes.toString('utf8');
}

function decryptDataWithPassword (data, password, iterations, options) {
  assert(data, 'data missing');
  assert(password, 'password missing');
  assert(iterations, 'iterations missing');

  var dataHex = new Buffer(data, 'base64');

  var iv = dataHex.slice(0, SALT_BYTES);
  var payload = dataHex.slice(SALT_BYTES);

  //  AES initialization vector is also used as the salt in password stretching
  var salt = iv;
  // Expose stretchPassword for iOS to override
  var key = module.exports.stretchPassword(password, salt, iterations, KEY_BIT_LEN);

  var res = module.exports.decryptBufferWithKey(payload, iv, key, options);
  return res;
}

function stretchPassword (password, salt, iterations, keyLenBits) {
  assert(salt, 'salt missing');
  assert(password && typeof password === 'string', 'password string required');
  assert(typeof iterations === 'number' && iterations > 0, 'positive iterations number required');
  assert(keyLenBits == null || keyLenBits % 8 === 0, 'key length must be evenly divisible into bytes');

  var saltBuffer = new Buffer(salt, 'hex');
  var keyLenBytes = (keyLenBits || 256) / 8;
  return pbkdf2(password, saltBuffer, iterations, keyLenBytes, ALGO.SHA1);
}

function pbkdf2 (password, salt, iterations, keyLenBytes, algorithm) {
  algorithm = algorithm || ALGO.SHA1;
  return pbkdf2Sync(password, salt, iterations, keyLenBytes, algorithm);
}

function hashNTimes (data, iterations) {
  assert(iterations > 0, '`iterations` must be a number greater than 0');
  while (iterations--) data = sha256(data);
  return data.toString('hex');
}

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest();
}

module.exports = {
  encryptWallet: encryptWallet,
  decryptWallet: decryptWallet,
  decryptWalletSync: decryptWalletSync,
  cipherFunction: cipherFunction,
  encryptDataWithKey: encryptDataWithKey,
  decryptBufferWithKey: decryptBufferWithKey,
  decryptDataWithKey: decryptDataWithKey,
  decryptSecretWithSecondPassword: decryptSecretWithSecondPassword,
  encryptSecretWithSecondPassword: encryptSecretWithSecondPassword,
  decryptPasswordWithProcessedPin: decryptPasswordWithProcessedPin,
  decrypt: decryptDataWithPassword,
  encrypt: encryptDataWithPassword,
  stretchPassword: stretchPassword,
  pbkdf2: pbkdf2,
  hashNTimes: hashNTimes,
  sha256: sha256,
  scrypt: scrypt,
  AES: AES,
  algo: ALGO,
  pad: {
    NoPadding: NoPadding,
    ZeroPadding: ZeroPadding,
    Iso10126: Iso10126,
    Iso97971: Iso97971
  },
  // For test purposes:
  Buffer: Buffer
};
