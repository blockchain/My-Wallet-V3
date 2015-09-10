'use strict';

var assert = require('assert');
var $ = require('jquery');

var WalletStore = require('./wallet-store');
var MyWallet = require('./wallet');

var AJAX_TIMEOUT = 60000;
var AJAX_RETRY_DEFAULT = 2;

function getRootURL() {
  return "https://blockchain.info/";
};

function retryAjax(ajaxParams) {
  var errorCallback;
  ajaxParams.tryCount = ajaxParams.tryCount || 0;
  ajaxParams.retryLimit = ajaxParams.retryLimit || AJAX_RETRY_DEFAULT;
  ajaxParams.suppressErrors = true;

  if (ajaxParams.error) {
    errorCallback = ajaxParams.error;
    delete ajaxParams.error;
  } else {
    errorCallback = function () { };
  }

  ajaxParams.complete = function (jqXHR, textStatus) {
    if (['timeout', 'abort', 'error'].some(function(e){return e === textStatus})) {
      this.tryCount++;
      if (this.tryCount <= this.retryLimit) {

        // fire error handling on the last try
        if (this.tryCount === this.retryLimit) {
          this.error = errorCallback;
          delete this.suppressErrors;
        }

        //try again
        $.ajax(this);
        return true;
      }
      return true;
    }
  };

  $.ajax(ajaxParams);
};

function get_history(success, error, tx_filter, offset, n) {
  var clientTime = (new Date()).getTime();

  offset = offset || 0;
  n = n || 0;

  var allAddresses = MyWallet.wallet.activeAddresses;
  if (MyWallet.wallet.isUpgradedToHD) {
    MyWallet.wallet.hdwallet.accounts.forEach(
      function(account){ allAddresses.push(account.extendedPublicKey);}
    );
  }
  // TODO: fix paidToDictionary with new model
  // var paidTo = WalletStore.getPaidToDictionary();
  // for (var tx_hash in paidTo) {
  //   if (paidTo[tx_hash].redeemedAt == null) {
  //     allAddresses.push(paidTo[tx_hash].address);
  //   }
  // }

  var data = {
    active : allAddresses.join('|'),
    format : 'json',
    offset : offset,
    no_compact : true,
    ct : clientTime,
    n : n,
    language : WalletStore.getLanguage(),
    api_code : WalletStore.getAPICode(),
    no_buttons: true
  };

  if (tx_filter != undefined && tx_filter != null) {
    data.filter = tx_filter;
  }

  retryAjax({
    type: "POST",
    dataType: 'json',
    url: getRootURL() +'multiaddr',
    data: data,
    timeout: AJAX_TIMEOUT,
    success: function(obj) {
      if (obj.error != null) {
        WalletStore.sendEvent("msg", {type: "error", message: obj.error});
      }
      MyWallet.handleNTPResponse(obj, clientTime);
      success && success(obj);
    },
    error : function(data) {

      if (data.responseText)
        WalletStore.sendEvent("msg", {type: "error", message: data.responseText});
      else
        WalletStore.sendEvent("msg", {type: "error", message: 'Error Downloading Wallet Balance'});

      error();
    }
  });
};

function mock_async_get_balance_history(success, error) {
  var history = [];

  // Get the unix timestamp range for the last 30 days
  var today = new Date();
  var twentynine_days_ago = new Date();
  twentynine_days_ago.setDate(twentynine_days_ago.getDate() - 29);
  var thirty_days_range = (today.getTime() - twentynine_days_ago.getTime());

  // Generate between 0 and 30 history entries
  var entries_to_generate = Math.floor(Math.random() * 30);

  // Generate the requested number of history entries
  for (var i = 0; i < entries_to_generate; i++) {
    // Generate timestamp within last 30 days
    var timestamp = Math.floor(Math.random() * thirty_days_range) + twentynine_days_ago.getTime();
    // Generate random Bitcoin balance between 0BTC and 10BTC
    var btcAmount = (Math.random() * 10);

    history.push({'timestamp': timestamp, 'balance': btcAmount});
  };

  // Toss a loaded coin to see if the request succeeds or fails
  var coinToss = Math.random();

  // Let's say we have an 85% chance of success
  if (coinToss > 0.15) {
    // The request succeeded
    success && success(history);
  } else {
    // The request failed
    WalletStore.sendEvent("msg", {type: "error", message: 'Error Downloading Balance History'});

    error();
  }
};

function get_history_with_addresses(addresses, success, error, tx_filter, offset, n) {
  var clientTime=(new Date()).getTime();

  if (!offset) offset = 0;
  if (!n) n = 0;

  var data = {
    active : addresses.join('|'),
    format : 'json',
    offset : offset,
    no_compact : true,
    ct : clientTime,
    n : n,
    language : WalletStore.getLanguage(),
    api_code : WalletStore.getAPICode()
  };

  if (tx_filter != undefined && tx_filter != null) {
    data.filter = tx_filter;
  }

  retryAjax({
    type: "POST",
    dataType: 'json',
    url: getRootURL() +'multiaddr',
    data: data,
    async: false,
    timeout: AJAX_TIMEOUT,
    success: function(obj) {
      if (obj.error != null) {
        WalletStore.sendEvent("msg", {type: "error", message: obj.error});
      }

      MyWallet.handleNTPResponse(obj, clientTime);

      success && success(obj);
    },
    error : function(data) {

      if (data.responseText)
        WalletStore.sendEvent("msg", {type: "error", message: data.responseText});
      else
        WalletStore.sendEvent("msg", {type: "error", message: 'Error Restoring Wallet'});

      error();
    }
  });
};

function async_get_history_with_addresses(addresses, success, error, tx_filter, offset, n) {
  var clientTime=(new Date()).getTime();

  if (!offset) offset = 0;
  if (!n) n = 0;

  var data = {
    active : addresses.join('|'),
    format : 'json',
    offset : offset,
    no_compact : true,
    ct : clientTime,
    n : n,
    language : WalletStore.getLanguage(),
    api_code : WalletStore.getAPICode()
  };

  if (tx_filter != undefined && tx_filter != null) {
    data.filter = tx_filter;
  }

  retryAjax({
    type: "POST",
    dataType: 'json',
    url: getRootURL() +'multiaddr',
    data: data,
    async: true,
    timeout: AJAX_TIMEOUT,
    success: function(obj) {
      if (obj.error != null) {
        WalletStore.sendEvent("msg", {type: "error", message: obj.error});
      }

      MyWallet.handleNTPResponse(obj, clientTime);

      success && success(obj);
    },
    error : function(data) {

      if (data.responseText)
        WalletStore.sendEvent("msg", {type: "error", message: data.responseText});
      else
        WalletStore.sendEvent("msg", {type: "error", message: 'Error Restoring Wallet'});

      error && error();
    }
  });
};

//Get the balances of multi addresses (Used for archived)
function get_balances(addresses, success, error) {
  $.ajax({
    type: "POST",
    url: getRootURL() + 'multiaddr',
    dataType: 'json',
    timeout: AJAX_TIMEOUT,
    data : {active : addresses.join('|'), simple : true, api_code : WalletStore.getAPICode(), format : 'json'},
    success: function(obj) {
      for (var key in obj) {
        if (MyWallet.wallet.containsLegacyAddress(key))
          MyWallet.wallet.key(key).balance = obj[key].final_balance;
      }

      success(obj);
    },
    error : function(e) {
      error(e.responseText);
    }
  });
};

// TODO: FIX THIS RELATED TO REDEEM CODES
//Get the balance of an array of addresses
function get_balance(addresses, success, error) {
  get_balances(addresses, function(obj){
    var balance = 0;
    for (var key in obj) {
      balance += obj[key].final_balance;
    }

    success(balance);
  }, error);
};

function sendViaEmail(email, tx, privateKey, successCallback, errorCallback) {
  try {
    MyWallet.securePost('send-via', {
      type : 'email',
      to : email,
      priv : privateKey,
      hash : tx.getHash().toString('hex')
    }, function(data) {
      successCallback(data);
    }, function(data) {
      errorCallback(data ? data.responseText : null);
    });
  } catch (e) {
    errorCallback(e);
  }
};

function sendViaSMS(number, tx, privateKey, successCallback, errorCallback) {
  try {
    MyWallet.securePost('send-via', {
      type : 'sms',
      to : number,
      priv : privateKey,
      hash : tx.getHash().toString('hex')
    }, function() {
      successCallback();
    }, function(data) {
      errorCallback(data ? data.responseText : null);
    });
  } catch (e) {
    errorCallback(e);
  }
};

function getFiatAtTime(time, value, currencyCode, successCallback, errorCallback) {
  $.ajax({
    type: "GET",
    dataType: 'json',
    url: getRootURL() +'frombtc',
    data: {value : value, currency: currencyCode, time: time, textual: false, nosavecurrency: true, api_code : WalletStore.getAPICode()},
    timeout: AJAX_TIMEOUT,
    success: function(data) {
      successCallback(data);
    },
    error : function(e) {
      errorCallback(e);
    }
  });
};

function get_ticker(successCallback, errorCallback) {
  WalletStore.sendEvent("msg", {type: "info", message: 'Getting Ticker Data'});

  $.ajax({
    type: "GET",
    dataType: 'json',
    url: getRootURL() +'ticker',
    data: {format : 'json', api_code : WalletStore.getAPICode()},
    timeout: AJAX_TIMEOUT,
    success: function(data) {
      WalletStore.sendEvent('ticker_updated');
      successCallback(data);
    },
    error : function(e) {
      console.log(e);
      errorCallback(e);
    }
  });
};

function get_rejection_reason(hexhash, got_reason, not_rejected, error) {
  $.ajax({
    type: "GET",
    url: getRootURL() + 'q/rejected/'+hexhash,
    data : {format : 'plain', api_code : WalletStore.getAPICode()},
    timeout: AJAX_TIMEOUT,
    success: function(data) {
      if (data == null || data.length == 0)
        error();
      else if (data == 'Transaction Not Rejected')
        not_rejected();
      else
        got_reason(data);
    },
    error : function(e) {
      error(e.responseText);
    }
  });
};

// If successful, calls success() and passes the transaction hash.
function push_tx(tx, note, success, error) {
  assert(success, "success callback required");
  assert(error, "error callback required");
  assert(tx, "transaction required");

  var _success = function(tx_hash) {
    //Clear the Check Interval
    if (checkTxExistsInterval) {
      clearInterval(checkTxExistsInterval);
      checkTxExistsInterval = null;
    }

    success(tx_hash); //Call success to enable send button again
    success = null;
  };

  var _error = function(e) {
    //Clear the Check Interval
    if (checkTxExistsInterval) {
      clearInterval(checkTxExistsInterval);
      checkTxExistsInterval = null;
    }

    if (error) {
      error(e);
      error = null;
    }
  };

  WalletStore.sendEvent("msg", {type: "info", message: 'Pushing Transaction'});

  var transactions = WalletStore.getTransactions();

  //Record the first transactions we know if it doesn't change then our new transactions wasn't push out propoerly
  if (transactions.length > 0)
    var first_tx_index = transactions[0].txIndex;

  var txHex = tx.toHex();

  var tx_hash = tx.getId();

  var did_push = function() {
    _success(tx_hash);

    function call_history() {
      MyWallet.get_history(function() {
        if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
          get_rejection_reason(tx_hash, function(reason) {
            WalletStore.sendEvent("msg", {type: "error", message: reason});
          }, function() {
            if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
              MyWallet.get_history();
            }
          }, function() {
            if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
              WalletStore.sendEvent("msg", {type: "error", message: 'Unknown Error Pushing Transaction'});
            }
          });
        } else {
          playSound('beep');
        }
      }, function() {
        WalletStore.sendEvent("msg", {type: "error", message: 'Unable to determine if transaction was submitted. Please re-login.'});
      });
    }

    //Otherwise we set an interval to set for a transaction
    setTimeout(function() {
      if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
        call_history();
      }
    }, 3000);
  };

  //Add Polling checker to check if the transaction exists on Blockchain
  //Appear that there are conditions where the ajax call to pushtx may not respond in a timely fashion
  var checkTxExistsInterval = setInterval(function() {
    get_rejection_reason(
      tx_hash,
      function(e) {
        console.log(e);
      },
      function() {
        if (did_push) {
          did_push();
          did_push = null;
        }

        clearInterval(checkTxExistsInterval);
        checkTxExistsInterval = null;
      },
      function(e) {
        console.log(e);
      }
    );
  }, 5000);

  var buffer = tx.toBuffer();

  var int8_array = new Int8Array(buffer);

  int8_array.set(buffer);

  var blob = new Blob([buffer], {type : 'application/octet-stream'});

  if (blob.size != txHex.length/2)
    throw 'Inconsistent Data Sizes (blob : ' + blob.size + ' s : ' + txHex.length/2 + ' buffer : ' + buffer.byteLength + ')';

  var fd = new FormData();

  fd.append('txbytes', blob);

  if (note) {
    fd.append('note', note);
  }

  fd.append('format', 'plain');
  fd.append('hash', tx_hash);
  fd.append('api_code', WalletStore.getAPICode());

  $.ajax({
    url: getRootURL() + 'pushtx',
    data: fd,
    processData: false,
    contentType: false,
    timeout: AJAX_TIMEOUT,
    type: 'POST',
    success: function(){
      if (did_push) {
        did_push();
        did_push = null;
      }
    },
    error : function(e) {
      // if (!e.responseText || e.responseText.indexOf('Parse:') == 0) {
      //   setTimeout(function() {
      //     push_normal();
      //   }, 2000);
      // } else {
      _error(e ? e.responseText : null);
      // }
    }
  });
};

function get_unspent(fromAddresses, success, error, confirmations) {
  retryAjax({
    type: "POST",
    dataType: 'json',
    url: getRootURL() +'unspent',
    timeout: AJAX_TIMEOUT,
    data: {active : fromAddresses.join('|'), format : 'json', api_code : WalletStore.getAPICode(), confirmations : confirmations ? confirmations : 0},
    success: function(obj) {
      if (obj.error != null) {
        error(obj.error);
        return;
      }
      if (obj.notice != null) {
        WalletStore.sendEvent("msg", {type: "success", message: obj.notice});
      }
      success && success(obj);
    },
    error: function (data) { error && error(data); }
  });
};

module.exports = {
  getRootURL: getRootURL,
  get_history: get_history,
  mock_async_get_balance_history: mock_async_get_balance_history,
  get_history_with_addresses: get_history_with_addresses,
  async_get_history_with_addresses: async_get_history_with_addresses,
  get_balances: get_balances,
  get_balance: get_balance,
  sendViaEmail: sendViaEmail,
  sendViaSMS: sendViaSMS,
  getFiatAtTime: getFiatAtTime,
  get_ticker: get_ticker,
  push_tx: push_tx,
  get_unspent: get_unspent
};
