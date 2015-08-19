'use strict';

module.exports = new API();
////////////////////////////////////////////////////////////////////////////////
var RSVP     = require('rsvp');
var assert   = require('assert');
var Helpers  = require('./helpers');
var WalletStore = require('./wallet-store');
var $ = require('jquery');
// var MyWallet = require('./wallet'); this class should not change state of the wallet
////////////////////////////////////////////////////////////////////////////////
// API class
function API(){
  // private members
  this.ROOT_URL           = "https://blockchain.info/";
  this.AJAX_TIMEOUT       = 60000;
  this.AJAX_RETRY_DEFAULT = 2;
  this.API_CODE           = "1770d5d9-bcea-4d28-ad21-6cbd5be018a8";
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
API.prototype.request = function(action, method, data, jsonResponse) {
  var defer = RSVP.defer();
  data = data || {};
  var baseData = {api_code : this.API_CODE};
  if (jsonResponse) {baseData.format = 'json'};
  var data = Helpers.merge(data, baseData);
  var request = new XMLHttpRequest();
  request.open(action, this.ROOT_URL + method + '?'  + this.encodeFormData(data), true);
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.onload = function (e) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        var response = jsonResponse? JSON.parse(request.responseText) : request.responseText;
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

////////////////////////////////////////////////////////////////////////////////
// Definition of API
API.prototype.getBalances = function(addresses){
  var data = {
      active : addresses.join('|')
    , simple: true
  };
  return this.request("POST", "multiaddr", data, true);
};

API.prototype.getFiatAtTime = function(time, value, currencyCode){
  var data = {
      value : value
    , currency: currencyCode
    , time: time
    , textual: false
    , nosavecurrency: true
  };
  return this.request("GET", "frombtc", data, false);
};

API.prototype.getTicker = function(){
  return this.request("GET", "ticker", null, true);
};

API.prototype.getRejectionReason = function(hexhash){
  var data = {format: 'plain'};
  return this.request("GET", "q/rejected/" + hexhash, data, false);
};

API.prototype.getUnspent = function(fromAddresses, confirmations){
  var data = {
      active : fromAddresses.join('|')
    , confirmations : confirmations ? confirmations : 0
  };
  return this.request("POST", "unspent", data, true);
};



// things to do:
// - create a method in blockchain-wallet that ask for the balances and updates the balance wallet
      //     success: function(obj) {
      //       for (var key in obj) {
      //         if (MyWallet.wallet.containsLegacyAddress(key))
      //           MyWallet.wallet.key(key).balance = obj[key].final_balance;
      //       }

