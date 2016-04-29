'use strict';

var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');
var shared = require('./shared');
var ImportExport = require('./import-export');

var Helpers = {};
Math.log2 = function (x) { return Math.log(x) / Math.LN2; };

Helpers.isString = function (str) {
  return typeof str == 'string' || str instanceof String;
};
Helpers.isKey = function (bitcoinKey) {
  return Helpers.isInstanceOf(bitcoinKey, Bitcoin.ECPair);
};
Helpers.isInstanceOf = function (object, theClass) {
  return object instanceof theClass;
};
Helpers.isBitcoinAddress = function (candidate) {
  try {
    var d = Bitcoin.address.fromBase58Check(candidate);
    var n = Bitcoin.networks.bitcoin;
    return d.version === n.pubKeyHash || d.version === n.scriptHash
  } catch (e) { return false; };
};
Helpers.isBitcoinPrivateKey = function (candidate) {
  try {
    Bitcoin.ECPair.fromWIF(candidate);
    return true;
  } catch (e) { return false; };
};
Helpers.isBase58Key = function (str) {
  return Helpers.isString(str) && /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{40,44}$/.test(str);
};
Helpers.isXprivKey = function (k) {
  return Helpers.isString(k) && k.substring(0, 4) === 'xprv';
};
Helpers.isXpubKey = function (k) {
  return Helpers.isString(k) && k.substring(0, 4) === 'xpub';
};
Helpers.isAlphaNum = function (str) {
  return Helpers.isString(str) && /^[\-+,._\w\d\s]+$/.test(str);
};
Helpers.isHex = function (str) {
  return Helpers.isString(str) && /^[A-Fa-f0-9]+$/.test(str);
};
Helpers.isSeedHex = function (str) {
  return Helpers.isString(str) && /^[A-Fa-f0-9]{32}$/.test(str);
};
Helpers.isBase64 = function (str) {
  return Helpers.isString(str) && /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=+\/]+$/.test(str);
};
Helpers.isNumber = function (num) {
  return typeof num == 'number' && !isNaN(num);
};
Helpers.isPositiveNumber = function (num) {
  return Helpers.isNumber(num) && num >= 0;
};
Helpers.isPositiveInteger = function (num) {
  return Helpers.isPositiveNumber(num) && num % 1 == 0;
};
Helpers.isNotNumber = function (num) {
  return !Helpers.isNumber(num)
};
Helpers.isBoolean = function (value) {
  return typeof (value) === 'boolean';
};
Helpers.isValidLabel = function (text) {
  return Helpers.isString(text);
};
Helpers.isInRange = function (val, min, max) {
  return min <= val && val < max;
};
Helpers.add = function (x, y) {
  return x + y;
};
Helpers.and = function (x, y) {
  return x && y;
};
Helpers.or = function (x, y) {
  return x || y;
};
Helpers.i = function (pred1, pred2) {
  return function (element) {
    return pred1(element) && pred2(element);
  };
};
Helpers.o = function (pred1, pred2) {
  return function (element) {
    return pred1(element) || pred2(element);
  };
};
Helpers.isValidSharedKey = function (sharedKey) {
  return Helpers.isString(sharedKey) && sharedKey.length === 36;
};
Helpers.isValidGUID = function (guid) {
  return Helpers.isString(guid);
};
// Return a memoized version of function f
Helpers.memoize = function (f) {
  var cache = {};
  return function () {
    var key = arguments.length + Array.prototype.join.call(arguments, ',');
    if (key in cache) return cache[key];
    else return cache[key] = f.apply(this, arguments);
  };
};

Helpers.toArrayFormat = function (x) {
  return Array.isArray(x) ? x : [x];
};

Helpers.isEmptyArray = function (x) {
  return Array.isArray(x) && x.length === 0;
};
// Return an async version of f that it will run after miliseconds
// no matter how many times you call the new function, it will run only once
Helpers.asyncOnce = function (f, milliseconds, before) {
  var timer = null;
  var oldArguments = new Array();
  return function () {
    before && before()
    if (timer) {
      clearTimeout(timer);
      timer = null;
    };
    var myArgs = new Array();
    // this is needed because arguments is not an 'Array' instance
    for (var i = 0; i < arguments.length; i++) { myArgs[i] = arguments[i]; };
    var myArgs = Helpers.zipLong(Helpers.maybeCompose, myArgs, oldArguments);
    oldArguments = myArgs;
    timer = setTimeout(function () {
      f.apply(this, myArgs);
      oldArguments = new Array();
    }, milliseconds);
  };
};

// merges the properties of two objects
Helpers.merge = function (o, p) {
  var prop = undefined;
  for(prop in p) {
    if (!o.hasOwnProperty(prop)) {
      o[prop] = p[prop];
    }
  }
  return o;
};

Helpers.zipLong = function (f, xs, ys) {
  if (!(f instanceof Function && xs instanceof Array && ys instanceof Array)) {
    return null;
  } else {
    var zs = xs.length > ys.length ? xs : ys;
    return zs.map(function (v, i) { return f(xs[i], ys[i]); });
  };
};

Helpers.zip3 = function (xs, ys, zs) {
  if (!(xs instanceof Array && ys instanceof Array && zs instanceof Array)) {
    return null;
  } else {
    return xs.map(function (v, i) { return [xs[i], ys[i], zs[i]]; });
  };
};

Helpers.maybeCompose = function (f, g) {
  if (f instanceof Function && g instanceof Function) {
    return f.compose(g);
  } else {
    if (f instanceof Function) { return f};
    if (g instanceof Function) { return g};
    // otherwise
    return f;
  };
};

Function.prototype.compose = function (g) {
  var fn = this;
  return function () {
    return fn.call(this, g.apply(this, arguments));
  };
};

Helpers.guessSize = function (nInputs, nOutputs) {
  return (nInputs*148 + nOutputs*34 + 10);
};

Helpers.guessFee = function (nInputs, nOutputs, feePerKb) {
  var sizeBytes = Helpers.guessSize(nInputs, nOutputs);
  return Math.ceil(feePerKb * (sizeBytes / 1000));
};

// password scorer
Helpers.scorePassword = function (password) {
  if (!Helpers.isString(password)) { return 0};

  var patternsList = [
     [0.25, /^[\d\s]+$/]
    ,[0.25, /^[a-z\s]+\d$/]
    ,[0.25, /^[A-Z\s]+\d$/]
    ,[0.5, /^[a-zA-Z\s]+\d$/]
    ,[0.5, /^[a-z\s]+\d+$/]
    ,[0.25, /^[a-z\s]+$/]
    ,[0.25, /^[A-Z\s]+$/]
    ,[0.25, /^[A-Z][a-z\s]+$/]
    ,[0.25, /^[A-Z][a-z\s]+\d$/]
    ,[0.5, /^[A-Z][a-z\s]+\d+$/]
    ,[0.25, /^[a-z\s]+[._!\- @*#]$/]
    ,[0.25, /^[A-Z\s]+[._!\- @*#]$/]
    ,[0.5, /^[a-zA-Z\s]+[._!\- @*#]$/]
    ,[0.25, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$/]
    ,[1, /^.*$/]
  ];

  var hasDigits = function (str) { return /[0-9]/.test(str); };
  var hasLowerCase = function (str) { return /[a-z]/.test(str); };
  var hasUpperCase = function (str) { return /[A-Z]/.test(str); };
  var hasSymbol = function (str) { return /[^0-9a-zA-z]/.test(str); };
  var computeSet = function (str) {
    var maxChar = Math.max.apply(Math, str.split('').map(function (c) { return c.charCodeAt(0); }));
    return maxChar + 256 - maxChar % 256;
  };

  var base = function (str) {
    var tuples = [[10, hasDigits(str)], [26, hasLowerCase(str)], [26, hasUpperCase(str)]];
    var bases = tuples.filter(function (t) { return t[1]}).map(function (t) { return t[0]});
    var setSize = hasSymbol(str) ? computeSet(str) : bases.reduce(Helpers.add, 0);
    var ret = setSize === 0 ? 1 : setSize;
    return ret;
  };

  var entropy = function (str) {
    return Math.log2(Math.pow(base(str), str.length));
  };

  var quality = function (str) {
    var pats = patternsList.filter(function (p) { return p[1].test(str); }).map(function (p) { return p[0]});
    return Math.min.apply(Math, pats);
  };

  var entropyWeighted = function (str) {
    return quality(str)*entropy(str);
  };

  return entropyWeighted(password);
};

Helpers.getHostName = function () {
  if ((typeof window === 'undefined')) {
    return null;
  }

  if (typeof window.location === 'undefined' || window.location.hostname === 'undefined') {
    return null;
  }

  return window.location.hostname;
};

Helpers.tor = function () {
  var hostname = Helpers.getHostName();

  // NodeJS TOR detection not supported:
  if ('string' !== typeof hostname) return null;

  return hostname.slice(-6) === '.onion';
};

Helpers.buffertoByteArray = function (value) {
  return BigInteger.fromBuffer(value).toByteArray();
};

function parseMiniKey (miniKey) {
  var check = Bitcoin.crypto.sha256(miniKey + '?');
  if (check[0] !== 0x00) {
    throw 'Invalid mini key';
  }
  return Bitcoin.crypto.sha256(miniKey);
}

Helpers.privateKeyStringToKey = function (value, format) {
  var key_bytes = null;

  if (format == 'base58') {
    key_bytes = Helpers.buffertoByteArray(Base58.decode(value));
  } else if (format == 'base64') {
    key_bytes = Helpers.buffertoByteArray(new Buffer(value, 'base64'));
  } else if (format == 'hex') {
    key_bytes = Helpers.buffertoByteArray(new Buffer(value, 'hex'));
  } else if (format == 'mini') {
    key_bytes = Helpers.buffertoByteArray(parseMiniKey(value));
  } else if (format == 'sipa') {
    var tbytes = Helpers.buffertoByteArray(Base58.decode(value));
    tbytes.shift(); // extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
    tbytes.shift();
    key_bytes = tbytes.slice(0, tbytes.length - 4);
  } else if (format == 'compsipa') {
    var tbytes = Helpers.buffertoByteArray(Base58.decode(value));
    tbytes.shift(); // extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
    tbytes.shift();
    tbytes.pop();
    key_bytes = tbytes.slice(0, tbytes.length - 4);
  } else {
    throw 'Unsupported Key Format';
  }

  return new Bitcoin.ECPair(new BigInteger.fromByteArrayUnsigned(key_bytes), null, {compressed: format !== 'sipa'});
};

Helpers.detectPrivateKeyFormat = function (key) {
  // 51 characters base58, always starts with a '5'
  if (/^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key)) {
    return 'sipa';
  }

  // 52 character compressed starts with L or K
  if (/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key)) {
    return 'compsipa';
  }

  // 40-44 characters base58
  if (Helpers.isBase58Key(key)) {
    return 'base58';
  }

  if (/^[A-Fa-f0-9]{64}$/.test(key)) {
    return 'hex';
  }

  if (/^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=+\/]{44}$/.test(key)) {
    return 'base64';
  }

  if (/^6P[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{56}$/.test(key)) {
    return 'bip38';
  }

  if (/^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{21}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}$/.test(key) ||
      /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{30}$/.test(key)) {
    var testBytes = Bitcoin.crypto.sha256(key + '?');

    if (testBytes[0] === 0x00 || testBytes[0] === 0x01)
      return 'mini';
  }
  return null;
};

Helpers.isValidBIP39Mnemonic = function (mnemonic) {
  return BIP39.validateMnemonic(mnemonic);
};

Helpers.isValidPrivateKey = function (candidate) {
  try {
    var format = Helpers.detectPrivateKeyFormat(candidate);
    if (format == 'bip38') { return true }
    var key = Helpers.privateKeyStringToKey(candidate, format);
    return key.getAddress();
  } catch (e) {
    return false;
  }
};

Helpers.privateKeyCorrespondsToAddress = function (address, priv, bipPass) {
  var asyncParse = function (resolve, reject) {
    var format = Helpers.detectPrivateKeyFormat(priv);
    var okFormats = ['base58', 'base64', 'hex', 'mini', 'sipa', 'compsipa'];
    if (format === 'bip38') {
      if (bipPass == undefined || bipPass === '') {
        return reject('needsBip38');
      }
      ImportExport.parseBIP38toECPair(priv, bipPass,
        function (key) { resolve(key); },
        function () { reject('wrongBipPass'); },
        function () { reject('importError'); }
      );
    }
    else if (okFormats.indexOf(format) > -1) {
      var k = Helpers.privateKeyStringToKey(priv, format);
      return resolve(k);
    }
    else { reject('unknown key format'); }
  }
  var predicate = function (key) {
    var a = key.getAddress();
    return a === address? Base58.encode(key.d.toBuffer(32)) : null;
  }
  return new Promise(asyncParse).then(predicate);
};

function parseValueBitcoin (valueString) {
  var valueString = valueString.toString();
  // TODO: Detect other number formats (e.g. comma as decimal separator)
  var valueComp = valueString.split('.');
  var integralPart = valueComp[0];
  var fractionalPart = valueComp[1] || '0';
  while (fractionalPart.length < 8) fractionalPart += '0';
  fractionalPart = fractionalPart.replace(/^0+/g, '');
  var value = BigInteger.valueOf(parseInt(integralPart));
  value = value.multiply(BigInteger.valueOf(100000000));
  value = value.add(BigInteger.valueOf(parseInt(fractionalPart)));
  return value;
}

Helpers.precisionToSatoshiBN = function (x) {
  return parseValueBitcoin(x).divide(BigInteger.valueOf(Math.pow(10, shared.sShift(shared.getBTCSymbol())).toString()));
};

Helpers.verifyMessage = function (address, signature, message) {
  return Bitcoin.message.verify(address, signature, message);
};

module.exports = Helpers;
