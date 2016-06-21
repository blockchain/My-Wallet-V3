'use strict';

module.exports = new API();

var assert = require('assert');
var Helpers = require('./helpers');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var MyWallet = require('./wallet');
var Bitcoin = require('bitcoinjs-lib');
var ECPair = Bitcoin.ECPair;

// API class
function API () {
  // private members
  this.ROOT_URL = 'https://blockchain.info/';
  this.AJAX_RETRY_DEFAULT = 2;
  this.API_CODE = '1770d5d9-bcea-4d28-ad21-6cbd5be018a8';
  this.SERVER_TIME_OFFSET = null;
  this.AJAX_TIMEOUT = 60000;
}

// encodeFormData :: Object -> url encoded params
API.prototype.encodeFormData = function (data) {
  if (!data) return '';
  var encoded = Object.keys(data).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
  }).join('&');
  return encoded;
};

/* Permitted extra headers:
   sessionToken -> "Authorization Bearer <token>" */
API.prototype.request = function (action, method, data, extraHeaders) {
  var url = this.ROOT_URL + method;
  var body = data ? this.encodeFormData(data) : '';
  var time = (new Date()).getTime();

  var options = {
    method: action,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    credentials: 'omit'
  };

  if (extraHeaders) {
    if (extraHeaders.sessionToken) {
      options.headers['Authorization'] = 'Bearer ' + extraHeaders.sessionToken;
    }
  }

  if (action === 'GET') url += '?' + body;
  if (action === 'POST') options.body = body;

  var handleNetworkError = function () {
    return Promise.reject({ initial_error: 'Connectivity error, failed to send network request' });
  };

  var checkStatus = function (response) {
    if (response.status >= 200 && response.status < 300) {
      if (
        response.headers.get('content-type') &&
        response.headers.get('content-type').indexOf('application/json') > -1
      ) {
        return response.json();
      } else if (
        response.headers.get('content-type') &&
        response.headers.get('content-type').indexOf('image/jpeg') > -1
      ) {
        return response.blob();
      } else if (data.format === 'json') {
        return response.json();
      } else {
        return response.text();
      }
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };

  var handleResponse = function (response) {
    this.handleNTPResponse(response, time);
    return response;
  }.bind(this);

  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus)
    .then(handleResponse);
};

API.prototype.retry = function (f, n) {
  var self = this;
  var i = n === null || n === undefined ? this.AJAX_RETRY_DEFAULT : n;
  if (i > 1) {
    return f().then(
        undefined, // pass through success
        function () { return self.retry(f, i - 1); }
    );
  } else {
    return f();
  }
};

// sync clocks with network time protocol
API.prototype.handleNTPResponse = function (obj, clientTime) {
  // Calculate serverTimeOffset using NTP algo
  var nowTime = (new Date()).getTime();
  if (obj.clientTimeDiff && obj.serverTime) {
    var serverClientResponseDiffTime = nowTime - obj.serverTime;
    var responseTime = (obj.clientTimeDiff - nowTime + clientTime - serverClientResponseDiffTime) / 2;
    var thisOffset = (serverClientResponseDiffTime - responseTime) / 2;
    if (Helpers.isNumber(this.SERVER_TIME_OFFSET)) {
      this.SERVER_TIME_OFFSET = (this.SERVER_TIME_OFFSET + thisOffset) / 2;
    } else {
      this.SERVER_TIME_OFFSET = thisOffset;
    }
    console.log('Server Time offset ' + this.SERVER_TIME_OFFSET + 'ms - This offset ' + thisOffset);
  }
};

// Definition of API
API.prototype.getBalances = function (addresses) {
  var data = {
    active: addresses.join('|'),
    simple: true,
    format: 'json',
    api_code: this.API_CODE
  };
  return this.retry(this.request.bind(this, 'POST', 'balance', data));
};

API.prototype.getTransaction= function (txhash) {
  var transaction = 'tx/'+txhash;
  var data = {
    format: 'json',
    api_code: this.API_CODE
  };
  return this.retry(this.request.bind(this, 'GET', transaction, data));
};

API.prototype.getBalanceForRedeemCode = function (privatekey) {
  var format = Helpers.detectPrivateKeyFormat(privatekey);
  if (format == null) { return Promise.reject('Unknown private key format'); }
  var privateKeyToSweep = Helpers.privateKeyStringToKey(privatekey, format);
  var aC = new ECPair(privateKeyToSweep.d, null, {compressed: true}).getAddress();
  var aU = new ECPair(privateKeyToSweep.d, null, {compressed: false}).getAddress();
  var totalBalance = function (data) {
    return Object.keys(data)
                 .map(function (a) { return data[a].final_balance; })
                 .reduce(Helpers.add, 0);
  };
  return this.getBalances([aC, aU]).then(totalBalance);
};

API.prototype.getFiatAtTime = function (time, value, currencyCode) {
  var data = {
    value: value,
    currency: currencyCode,
    time: time,
    textual: false,
    nosavecurrency: true,
    api_code: this.API_CODE
  };
  return this.retry(this.request.bind(this, 'GET', 'frombtc', data));
};

API.prototype.getTicker = function () {
  var data = { format: 'json', api_code: this.API_CODE };
  // return this.request('GET', 'ticker', data);
  return this.retry(this.request.bind(this, 'GET', 'ticker', data));
};

API.prototype.getUnspent = function (fromAddresses, confirmations) {
  var data = {
    active: fromAddresses.join('|'),
    confirmations: Helpers.isPositiveNumber(confirmations) ? confirmations : -1,
    format: 'json',
    api_code: this.API_CODE
  };
  return this.retry(this.request.bind(this, 'POST', 'unspent', data));
};

API.prototype.getHistory = function (addresses, txFilter, offset, n, syncBool) {
  var clientTime = (new Date()).getTime();
  offset = offset || 0;
  n = n || 0;

  var data = {
    active: addresses.join('|'),
    format: 'json',
    offset: offset,
    no_compact: true,
    ct: clientTime,
    n: n,
    language: WalletStore.getLanguage(),
    no_buttons: true,
    api_code: this.API_CODE
  };

  if (txFilter !== undefined && txFilter !== null) {
    data.filter = txFilter;
  }
  return this.retry(this.request.bind(this, 'POST', 'multiaddr', data, null, syncBool));
};

API.prototype.securePost = function (url, data, extraHeaders) {
  var clone = Helpers.merge({}, data);
  if (!Helpers.isValidGUID(data.guid)) { clone.guid = MyWallet.wallet.guid; }
  if (!data.sharedKey) {
    var sharedKey = MyWallet.wallet ? MyWallet.wallet.sharedKey : undefined;
    if (!Helpers.isValidSharedKey(sharedKey)) throw new Error('Shared key is invalid');
    // Rather than sending the shared key plain text
    // send a hash using a totp scheme
    var now = new Date().getTime();
    var timestamp = parseInt((now - this.SERVER_TIME_OFFSET) / 10000, 10);
    var SKHashHex = WalletCrypto.sha256(sharedKey.toLowerCase() + timestamp).toString('hex');
    var i = 0;
    var tSKUID = SKHashHex.substring(i, i += 8) + '-' +
                 SKHashHex.substring(i, i += 4) + '-' +
                 SKHashHex.substring(i, i += 4) + '-' +
                 SKHashHex.substring(i, i += 4) + '-' +
                 SKHashHex.substring(i, i += 12);

    clone.sharedKey = tSKUID;
    clone.sKTimestamp = timestamp;
    clone.sKDebugHexHash = SKHashHex;
    clone.sKDebugTimeOffset = this.SERVER_TIME_OFFSET;
    clone.sKDebugOriginalClientTime = now;
    clone.sKDebugOriginalSharedKey = sharedKey;
  }
  clone.api_code = this.API_CODE;
  clone.format = data.format ? data.format : 'plain';

  return this.retry(this.request.bind(this, 'POST', url, clone, extraHeaders));
};

API.prototype.securePostCallbacks = function (url, data, success, error) {
  this.securePost(url, data).then(success).catch(error);
};

// 01000000013e095250cb35129c7dee081b8c89b4bff69f72222a25c45ba9747a704a6d0bcd010000006b4830450221009b4f6619b1499ea19494aec34c36fdeac9146b9f87f010b7ebf1eb8a1b590c6e02202f5d9b0cfa4107d586b5b370494b9932eba1411468af06e431001932c12bf245012103cf91e6b06d1a2432721559a010ee67e98f8ef0421b15cca66dc9717ac1af8d1effffffff0210270000000000001976a91402549a8a872fbe54721a899e5ac2a87daac2358088acf0ba0400000000001976a9148ee77b3dd0e33783c11a6c28473d16e9b63dc38588ac00000000
API.prototype.pushTx = function (txHex, note) {
  assert(txHex, 'transaction required');

  var data = {
    tx: txHex,
    api_code: this.API_CODE,
    format: 'plain'
  };

  if (note) data.note = note;

  var responseTXHASH = function (responseText) {
    if (responseText.indexOf('Transaction Submitted') > -1) {
      return true;
    } else {
      return responseText;
    }
  };

  return this.request('POST', 'pushtx', data).then(responseTXHASH);
};

API.prototype.getFees = function () {
  var handleNetworkError = function () {
    return Promise.reject({ initial_error: 'Connectivity error, failed to send network request' });
  };

  var checkStatus = function (response) {
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };

  return fetch(this.API_ROOT_URL + 'fees')
            .then(checkStatus)
            .catch(handleNetworkError);
};

// OLD FUNCTIONS COPIED: Must rewrite this ones (email ,sms)
// function sendViaEmail(email, tx, privateKey, successCallback, errorCallback) {
//   try {
//     MyWallet.securePost('send-via', {
//       type : 'email',
//       to : email,
//       priv : privateKey,
//       hash : tx.getHash().toString('hex')
//     }, function (data) {
//       successCallback(data);
//     }, function (data) {
//       errorCallback(data ? data.responseText : null);
//     });
//   } catch (e) {
//     errorCallback(e);
//   }
// };
//
// function sendViaSMS(number, tx, privateKey, successCallback, errorCallback) {
//   try {
//     MyWallet.securePost('send-via', {
//       type : 'sms',
//       to : number,
//       priv : privateKey,
//       hash : tx.getHash().toString('hex')
//     }, function () {
//       successCallback();
//     }, function (data) {
//       errorCallback(data ? data.responseText : null);
//     });
//   } catch (e) {
//     errorCallback(e);
//   }
// };
