'use strict';

var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var Buffer = require('buffer').Buffer;
var Base58 = require('bs58');
var BIP39 = require('bip39');
var ImportExport = require('./import-export');
var constants = require('./constants');
var WalletCrypo = require('./wallet-crypto');
var has = require('ramda/src/has');
var allPass = require('ramda/src/allPass');
var map = require('ramda/src/map');

var Helpers = {};
Math.log2 = function (x) { return Math.log(x) / Math.LN2; };

Helpers.isString = function (str) {
  return typeof str === 'string' || str instanceof String;
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
    var n = constants.getNetwork();
    return d.version === n.pubKeyHash || d.version === n.scriptHash;
  } catch (e) { return false; }
};
Helpers.isBitcoinPrivateKey = function (candidate) {
  try {
    Bitcoin.ECPair.fromWIF(candidate, constants.getNetwork());
    return true;
  } catch (e) { return false; }
};
Helpers.isBase58Key = function (str) {
  return Helpers.isString(str) && /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{40,44}$/.test(str);
};
Helpers.isXprivKey = function (k) {
  return Helpers.isString(k) && (/^(x|t)prv/).test(k);
};
Helpers.isXpubKey = function (k) {
  return Helpers.isString(k) && (/^(x|t)pub/).test(k);
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
  return typeof num === 'number' && !isNaN(num);
};
Helpers.isPositiveNumber = function (num) {
  return Helpers.isNumber(num) && num >= 0;
};
Helpers.isPositiveInteger = function (num) {
  return Helpers.isPositiveNumber(num) && num % 1 === 0;
};
Helpers.isNotNumber = function (num) {
  return !Helpers.isNumber(num);
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
Helpers.pluck = function (prop) {
  return function (o) { return o[prop]; };
};
Helpers.eq = function (value1) {
  return function (value0) { return value0 === value1; };
};
Helpers.notEq = function (value1) {
  return function (value0) { return value0 !== value1; };
};
Helpers.propEq = function (prop, value) {
  return function (o) { return o[prop] === value; };
};
Helpers.o = function (pred1, pred2) {
  return function (element) {
    return pred1(element) || pred2(element);
  };
};
Helpers.noop = function () {};
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
    else {
      var value = cache[key] = f.apply(this, arguments);
      return value;
    }
  };
};

Helpers.toArrayFormat = function (x) {
  return Array.isArray(x) ? x : [x];
};

Helpers.isEmptyObject = function (x) {
  return (Object.keys(x).length === 0 && x.constructor === Object);
};

Helpers.isEmptyArray = function (x) {
  return Array.isArray(x) && x.length === 0;
};
// Return an async version of f that it will run after miliseconds
// no matter how many times you call the new function, it will run only once
Helpers.asyncOnce = function (f, milliseconds, before) {
  var timer = null;
  var oldArguments = [];

  trigger.cancel = function () {
    clearTimeout(timer);
  };

  function trigger () {
    trigger.cancel();
    before && before();
    var myArgs = [];
    // this is needed because arguments is not an 'Array' instance
    for (var i = 0; i < arguments.length; i++) { myArgs[i] = arguments[i]; }
    myArgs = Helpers.zipLong(Helpers.maybeCompose, myArgs, oldArguments);
    oldArguments = myArgs;
    timer = setTimeout(function () {
      f.apply(this, myArgs);
      oldArguments = [];
    }, milliseconds);
  }

  return trigger;
};

Helpers.exponentialBackoff = function (f, maxTime) {
  maxTime = maxTime || Infinity;
  var timer;
  var run = function (e) {
    var nextTime = Math.pow(2, e) * 1000;
    timer = setTimeout(function () {
      f.call(f);
      run(e + 1);
    }, nextTime > maxTime ? maxTime : nextTime);
  };
  run(0);
  return function () {
    clearTimeout(timer);
  };
};

// merges the properties of two objects
Helpers.merge = function (o, p) {
  for (var prop in p) {
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
  }
};

Helpers.zip3 = function (xs, ys, zs) {
  if (!(xs instanceof Array && ys instanceof Array && zs instanceof Array)) {
    return null;
  } else {
    return xs.map(function (v, i) { return [xs[i], ys[i], zs[i]]; });
  }
};

Helpers.maybeCompose = function (f, g) {
  if (f instanceof Function && g instanceof Function) {
    return f.compose(g);
  } else {
    if (f instanceof Function) { return f; }
    if (g instanceof Function) { return g; }
    // otherwise
    return f;
  }
};

Function.prototype.compose = function (g) { // eslint-disable-line no-extend-native
  var fn = this;
  return function () {
    return fn.call(this, g.apply(this, arguments));
  };
};

Helpers.guessSize = function (nInputs, nOutputs) {
  return (nInputs * 148 + nOutputs * 34 + 10);
};

Helpers.toFeePerKb = function (fee) {
  return fee * 1000;
};

Helpers.guessFee = function (nInputs, nOutputs, feePerKb) {
  var sizeBytes = Helpers.guessSize(nInputs, nOutputs);
  return Math.ceil(feePerKb * (sizeBytes / 1000));
};

// password scorer
Helpers.scorePassword = function (password) {
  if (!Helpers.isString(password)) { return 0; }

  var patternsList = [
    [0.25, /^[\d\s]+$/],
    [0.25, /^[a-z\s]+\d$/],
    [0.25, /^[A-Z\s]+\d$/],
    [0.5, /^[a-zA-Z\s]+\d$/],
    [0.5, /^[a-z\s]+\d+$/],
    [0.25, /^[a-z\s]+$/],
    [0.25, /^[A-Z\s]+$/],
    [0.25, /^[A-Z][a-z\s]+$/],
    [0.25, /^[A-Z][a-z\s]+\d$/],
    [0.5, /^[A-Z][a-z\s]+\d+$/],
    [0.25, /^[a-z\s]+[._!\- @*#]$/],
    [0.25, /^[A-Z\s]+[._!\- @*#]$/],
    [0.5, /^[a-zA-Z\s]+[._!\- @*#]$/],
    [0, /^[a-zA-Z0-9_]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/],  // email must always score bad
    [1, /^.*$/]
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
    var bases = tuples.filter(function (t) { return t[1]; }).map(function (t) { return t[0]; });
    var setSize = hasSymbol(str) ? computeSet(str) : bases.reduce(Helpers.add, 0);
    var ret = setSize === 0 ? 1 : setSize;
    return ret;
  };

  var entropy = function (str) {
    return Math.log2(Math.pow(base(str), str.length));
  };

  var quality = function (str) {
    var pats = patternsList.filter(function (p) { return p[1].test(str); }).map(function (p) { return p[0]; });
    return Math.min.apply(Math, pats);
  };

  var entropyWeighted = function (str) {
    return quality(str) * entropy(str);
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
  if (typeof hostname !== 'string') return null;

  return hostname.slice(-6) === '.onion';
};

Helpers.buffertoByteArray = function (value) {
  return BigInteger.fromBuffer(value).toByteArray();
};

function parseMiniKey (miniKey) {
  var check = Bitcoin.crypto.sha256(miniKey + '?');
  if (check[0] !== 0x00) {
    throw new Error('Invalid mini key');
  }
  return Bitcoin.crypto.sha256(miniKey);
}

Helpers.privateKeyStringToKey = function (value, format) {
  if (format === 'sipa' || format === 'compsipa') {
    return Bitcoin.ECPair.fromWIF(value, constants.getNetwork());
  } else {
    var keyBuffer = null;

    switch (format) {
      case 'base58':
        keyBuffer = Base58.decode(value);
        break;
      case 'base64':
        keyBuffer = new Buffer(value, 'base64');
        break;
      case 'hex':
        keyBuffer = new Buffer(value, 'hex');
        break;
      case 'mini':
        keyBuffer = parseMiniKey(value);
        break;
      default:
        throw new Error('Unsupported Key Format');
    }

    var d = BigInteger.fromBuffer(keyBuffer);
    return new Bitcoin.ECPair(d, null, { network: constants.getNetwork() });
  }
};

Helpers.detectPrivateKeyFormat = function (key) {
  var isTestnet = constants.NETWORK === 'testnet';

  // 51 characters base58, always starts with 5 (or 9, for testnet)
  var sipaRegex = isTestnet
    ? (/^[9][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/)
    : (/^[5][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/);

  if (sipaRegex.test(key)) {
    return 'sipa';
  }

  // 52 character compressed starts with L or K (or c, for testnet)
  var compsipaRegex = isTestnet
    ? (/^[c][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/)
    : (/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/);

  if (compsipaRegex.test(key)) {
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

    if (testBytes[0] === 0x00 || testBytes[0] === 0x01) {
      return 'mini';
    }
  }
  return null;
};

Helpers.isValidBIP39Mnemonic = function (mnemonic) {
  return BIP39.validateMnemonic(mnemonic);
};

Helpers.isValidPrivateKey = function (candidate) {
  try {
    var format = Helpers.detectPrivateKeyFormat(candidate);
    if (format === 'bip38') { return true; }
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
      if (bipPass === undefined || bipPass === null || bipPass === '') {
        return reject('needsBip38');
      }
      ImportExport.parseBIP38toECPair(priv, bipPass,
        function (key) { resolve(key); },
        function () { reject('wrongBipPass'); },
        function () { reject('importError'); }
      );
    } else if (okFormats.indexOf(format) > -1) {
      var k = Helpers.privateKeyStringToKey(priv, format);
      return resolve(k);
    } else {
      reject('unknown key format');
    }
  };
  var predicate = function (key) {
    var a = key.getAddress();
    return a === address ? Base58.encode(key.d.toBuffer(32)) : null;
  };
  return new Promise(asyncParse).then(predicate);
};

Helpers.verifyMessage = function (address, signature, message) {
  return Bitcoin.message.verify(address, signature, message, constants.getNetwork());
};

Helpers.getMobileOperatingSystem = function () {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) {
    return 'iOS';
  } else if (userAgent.match(/Android/i)) {
    return 'Android';
  } else {
    return 'unknown';
  }
};

Helpers.isEmailInvited = function (email, fraction) {
  if (!email) {
    return false;
  }
  if (!Helpers.isPositiveNumber(fraction)) {
    return false;
  }
  if (fraction > 1) {
    return false;
  }
  return WalletCrypo.sha256(email)[0] / 256 >= 1 - fraction;
};

// Helpers.isFeeOptions :: object => Boolean
Helpers.isFeeOptions = object => {
  const props = ['min_tx_amount', 'percent', 'max_service_charge', 'send_to_miner'];
  return object ? allPass(map(has, props))(object) : false;
};

Helpers.blockchainFee = (amount, options) =>
  Helpers.isFeeOptions(options) && Helpers.isPositiveNumber(amount) && amount > options.min_tx_amount
    ? Math.min(Math.floor(amount * options.percent), options.max_service_charge)
    : 0;

Helpers.balanceMinusFee = (balance, options) => {
  const maxFeePoint = () => Math.floor(options.max_service_charge * ((1 / options.percent) + 1));
  switch (true) {
    // negative balance
    case !Helpers.isPositiveNumber(balance):
      return 0;
    // no valid options
    case !Helpers.isFeeOptions(options):
      return balance;
    // balance in [0, min_tx_amount] -> no fee
    case balance <= options.min_tx_amount:
      return balance;
    // balance in (min_tx_amount, maxFeePoint] --> max(max with fee, max without fee)
    case (options.min_tx_amount < balance) && (balance <= maxFeePoint()):
      const maxWithFee = Math.floor(balance / (1 + options.percent));
      return Math.max(maxWithFee, options.min_tx_amount);
    // balance in (maxFeePoint, +inf) --> maximum fee
    case maxFeePoint() < balance:
      return balance - options.max_service_charge;
    default:
      return balance;
  } // fi switch
};

Helpers.guidToGroup = (guid) => {
  let hashed = WalletCrypo.sha256(new Buffer(guid.replace(/-/g, ''), 'hex'));
  return hashed[0] & 1 ? 'b' : 'a';
};

Helpers.deepClone = function (object) {
  return JSON.parse(JSON.stringify(object));
};

module.exports = Helpers;
