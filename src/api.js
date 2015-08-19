'use strict';

module.exports = new API();
////////////////////////////////////////////////////////////////////////////////
var RSVP     = require('rsvp');
var assert   = require('assert');
var Helpers  = require('./helpers');
var WalletStore = require('./wallet-store');
// var MyWallet = require('./wallet'); this class should not change state of the wallet
////////////////////////////////////////////////////////////////////////////////
// API class
function API(){
  // private members
  this.ROOT_URL           = "https://blockchain.info/";
  this.AJAX_TIMEOUT       = 60000;
  this.AJAX_RETRY_DEFAULT = 2;
}

API.prototype.do = function(){
  console.log("doing something...");
};

API.prototype.getBalances = function(addresses){

  var request = new XMLHttpRequest();

  request.open("POST", this.ROOT_URL + "multiaddr", true);
  // request.setRequestHeader("Content-Type", "application/json");
  request.onload = function (e) {
    if (request.readyState === 4) {
      if (request.status === 200) {
        console.log("hola");
        console.log(request.responseText);
      } else {
        console.error(request.statusText);
      }
    }
  };
  request.onerror = function (e) {
    console.error(request.statusText);
  };
  request.send(JSON.stringify({active : addresses.join('|'), simple : true, api_code : 0, format : 'json'}));
};


// function get_balances(addresses, success, error) {
//   $.ajax({
//     type: "POST",
//     url: getRootURL() + 'multiaddr',
//     dataType: 'json',
//     timeout: AJAX_TIMEOUT,
//     data : {active : addresses.join('|'), simple : true, api_code : WalletStore.getAPICode(), format : 'json'},
//     success: function(obj) {
//       for (var key in obj) {
//         if (MyWallet.wallet.containsLegacyAddress(key))
//           MyWallet.wallet.key(key).balance = obj[key].final_balance;
//       }

//       success(obj);
//     },
//     error : function(e) {
//       error(e.responseText);
//     }
//   });
// };
