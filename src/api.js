'use strict';

module.exports = new API();
////////////////////////////////////////////////////////////////////////////////
var Q           = require('q')
var assert      = require('assert');
var request     = require('request-promise');
var Helpers     = require('./helpers');
var WalletStore = require('./wallet-store');
var CryptoJS    = require('crypto-js');
var MyWallet    = require('./wallet');
////////////////////////////////////////////////////////////////////////////////
// API class
function API(){
  // private members
  this.ROOT_URL           = "https://blockchain.info/";
  this.AJAX_TIMEOUT       = 60000;
  this.AJAX_RETRY_DEFAULT = 2;
  this.API_CODE           = "1770d5d9-bcea-4d28-ad21-6cbd5be018a8";
  this.SERVER_TIME_OFFSET = null;
}

// encodeFormData :: Object -> url encoded params
API.prototype.encodeFormData = function (data) {
  if (!data) return "";
  var encoded = Object.keys(data).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
  }).join('&');
  return encoded;
};

// request :: String -> String -> Object -> boolean -> Promise Response
API.prototype.request = function(action, method, data, withCredentials) {
  var url = this.ROOT_URL + method;
  var sendData = null;
  var clientTime = (new Date()).getTime();

  // this is used on iOS to enable and disable web socket while doing ajax calls
  WalletStore.sendEvent("msg", {type: "ajax-start", message: 'ajax call started'});

  var requestOptions = {
    method    : action,
    url       : url,
    qs        : data,
    timeout   : this.AJAX_TIMEOUT,
    json      : true
  };

  if (method === 'wallet' && data.method === 'update') {
    delete requestOptions.qs;
    requestOptions.form = data;
  }

  var handleResponse = function (data) {
    loadEnded();
    this.handleNTPResponse(data, clientTime);
    return data;
  }.bind(this);

  var handleError = function (err) {
    loadEnded();
    throw err;
  }.bind(this);

  function loadEnded() {
    // this is used on iOS to enable and disable web socket while doing ajax calls
    WalletStore.sendEvent("msg", {type: "ajax-end", message: 'ajax call ended'});
  }

  return request(requestOptions)
    .then(handleResponse).catch(handleError);
};

API.prototype.retry = function(f, n) {
  var self = this;
  var i = n === null || n === undefined ? this.AJAX_RETRY_DEFAULT : n;
  if (i > 1) {
    return f().then(
        undefined, // pass through success
        function (err) { return self.retry(f, i - 1); }
    );
  } else {
    return f();
  };
};

////////////////////////////////////////////////////////////////////////////////
// sync clocks with network time protocol
API.prototype.handleNTPResponse = function(obj, clientTime) {
  //Calculate serverTimeOffset using NTP algo
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

////////////////////////////////////////////////////////////////////////////////
// Definition of API
API.prototype.getBalances = function(addresses){
  var data = {
      active : addresses.join('|')
    , simple: true
    , format: 'json'
    , api_code : this.API_CODE
  };
  return this.retry(this.request.bind(this, "POST", "multiaddr", data));
};

API.prototype.getFiatAtTime = function(time, value, currencyCode){
  var data = {
      value : value
    , currency: currencyCode
    , time: time
    , textual: false
    , nosavecurrency: true
    , api_code : this.API_CODE
  };
  return this.retry(this.request.bind(this, "GET", "frombtc", data));
};

API.prototype.getTicker = function(){
  var data = { format: 'json' , api_code : this.API_CODE};
  return this.retry(this.request.bind(this, "GET", "ticker", data));
};

API.prototype.getUnspent = function(fromAddresses, confirmations){
  var data = {
      active : fromAddresses.join('|')
    , confirmations : Helpers.isNumber(confirmations) ? confirmations : 0
    , format: 'json'
    , api_code : this.API_CODE
  };
  return this.retry(this.request.bind(this, "POST", "unspent", data));
};

API.prototype.getHistory = function (addresses, tx_filter, offset, n, syncBool) {

  var clientTime = (new Date()).getTime();
  offset = offset || 0;
  n = n || 0;

  var data = {
      active : addresses.join('|')
    , format: 'json'
    , offset: offset
    , no_compact: true
    , ct : clientTime
    , n : n
    , language : WalletStore.getLanguage()
    , no_buttons : true
    , api_code : this.API_CODE
  };

  if (tx_filter !== undefined && tx_filter !== null) {
    data.filter = tx_filter;
  }

  return this.retry(this.request.bind(this, "POST", "multiaddr", data, null, syncBool));
};

API.prototype.securePost = function (url, data){

  var clone = Helpers.merge({}, data);
  if (!Helpers.isValidGUID(data.guid)) { clone.guid = MyWallet.wallet.guid; }
  if (!data.sharedKey) {
    var sharedKey = MyWallet.wallet ? MyWallet.wallet.sharedKey : undefined;
    if (!Helpers.isValidSharedKey(sharedKey)) throw 'Shared key is invalid'
    //Rather than sending the shared key plain text
    //send a hash using a totp scheme
    var now = new Date().getTime();
    var timestamp = parseInt((now - this.SERVER_TIME_OFFSET) / 10000);
    var SKHashHex = CryptoJS.SHA256(sharedKey.toLowerCase() + timestamp).toString();
    var i = 0;
    var tSKUID = SKHashHex.substring(i, i+=8)+'-'+
                 SKHashHex.substring(i, i+=4)+'-'+
                 SKHashHex.substring(i, i+=4)+'-'+
                 SKHashHex.substring(i, i+=4)+'-'+
                 SKHashHex.substring(i, i+=12);

    clone.sharedKey                 = tSKUID;
    clone.sKTimestamp               = timestamp;
    clone.sKDebugHexHash            = SKHashHex;
    clone.sKDebugTimeOffset         = this.SERVER_TIME_OFFSET;
    clone.sKDebugOriginalClientTime = now;
    clone.sKDebugOriginalSharedKey  = sharedKey;
  }
  clone.api_code                  = this.API_CODE
  clone.format                    = data.format ? data.format : 'plain';

  return this.retry(this.request.bind(this, "POST", url, clone, true));
};

API.prototype.pushTx = function (tx, note){
  assert(tx, "transaction required");

  var txHex = tx.toHex();
  var tx_hash = tx.getId();
  var buffer = tx.toBuffer();

  var fd = {
    'tx'      : buffer.toString('hex'),
    'hash'    : tx_hash,
    'api_code': WalletStore.getAPICode(),
  };

  if (note) { fd.note = note; }

  var responseTXHASH = function (responseText) {
    if (responseText.indexOf("Transaction Submitted") > -1)
      { return tx_hash;}
    else
      { return responseText;}
  }

  var requestOptions = {
    method    : 'POST',
    url       : this.ROOT_URL + '/pushtx',
    timeout   : this.AJAX_TIMEOUT,
    formData  : fd,
    json      : true
  };

  return request(requestOptions).then(responseTXHASH);
};

// OLD FUNCTIONS COPIED: Must rewrite this ones (email ,sms)
// function sendViaEmail(email, tx, privateKey, successCallback, errorCallback) {
//   try {
//     MyWallet.securePost('send-via', {
//       type : 'email',
//       to : email,
//       priv : privateKey,
//       hash : tx.getHash().toString('hex')
//     }, function(data) {
//       successCallback(data);
//     }, function(data) {
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
//     }, function() {
//       successCallback();
//     }, function(data) {
//       errorCallback(data ? data.responseText : null);
//     });
//   } catch (e) {
//     errorCallback(e);
//   }
// };
