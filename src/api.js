'use strict';

module.exports = new API();
////////////////////////////////////////////////////////////////////////////////
var RSVP        = require('rsvp');
var assert      = require('assert');
var Helpers     = require('./helpers');
var WalletStore = require('./wallet-store');
var CryptoJS    = require('crypto-js');
// var $           = require('jquery');
// var MyWallet = require('./wallet');
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
API.prototype.request = function(action, method, data, withCredentials, syncBool) {
  var self = this;
  var clientTime = (new Date()).getTime();
  var defer = RSVP.defer();
  data = data || {};
  var baseData = {api_code : this.API_CODE};
  var data = Helpers.merge(data, baseData);
  var request = new XMLHttpRequest();
  var asyncBool = syncBool ? false : true;
  request.open(action, this.ROOT_URL + method + '?'  + this.encodeFormData(data), asyncBool);
  request.withCredentials = withCredentials ? true : false;
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.onload = function (e) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        var response = data.format === 'json'? JSON.parse(request.responseText) : request.responseText;
        self.handleNTPResponse(response, clientTime);
        defer.resolve(response);
      } else {
        defer.reject(request.statusText);
      }
    }
  };
  request.onerror = function (e) {
      defer.reject(request.statusText);
  };
  request.send(null);
  return defer.promise;
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
  };
  return this.retry(this.request.bind(this, "GET", "frombtc", data));
};

API.prototype.getTicker = function(){
  var data = { format: 'json' };
  return this.retry(this.request.bind(this, "GET", "ticker", data));
};

API.prototype.getRejectionReason = function(hexhash){
  var data = {format: 'plain'};
  return this.retry(this.request.bind(this, "GET", "q/rejected/" + hexhash, data));
};

API.prototype.getUnspent = function(fromAddresses, confirmations){
  var data = {
      active : fromAddresses.join('|')
    , confirmations : confirmations ? confirmations : 0
    , format: 'json'
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
  };

  if (tx_filter !== undefined && tx_filter !== null) {
    data.filter = tx_filter;
  }

  return this.retry(this.request.bind(this, "POST", "multiaddr", data, null, syncBool));
};

API.prototype.securePost = function (url, data){
  var clone = Helpers.merge({}, data);

  if (!Helpers.isValidSharedKey(data.sharedKey)) throw 'Shared key is invalid'
  if (!Helpers.isValidGUID(data.guid))           throw 'GUID is invalid'

  //Rather than sending the shared key plain text
  //send a hash using a totp scheme
  var now = new Date().getTime();
  var timestamp = parseInt((now - this.SERVER_TIME_OFFSET) / 10000);
  var SKHashHex = CryptoJS.SHA256(data.sharedKey.toLowerCase() + timestamp).toString();
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
  clone.sKDebugOriginalSharedKey  = data.sharedKey;
  clone.format                    = data.format ? data.format : 'plain';

  return this.retry(this.request.bind(this, "POST", url, clone, true));
};

// this one should be a method of wallet wrapper
// API.prototype.checkWalletChecksum = function (payloadChecksum) {

//   var data = {
//       method : 'wallet.aes.json'
//     , format : 'json'
//     , checksum : payloadChecksum
//     , sharedKey : MyWallet.wallet.sharedKey
//     , guid : MyWallet.wallet.guid
//   };
//   return this.securePost("wallet", data);
// };

// things to do:
// - create a method in blockchain-wallet that ask for the balances and updates the balance wallet
      //     success: function(obj) {
      //       for (var key in obj) {
      //         if (MyWallet.wallet.containsLegacyAddress(key))
      //           MyWallet.wallet.key(key).balance = obj[key].final_balance;
      //       }

