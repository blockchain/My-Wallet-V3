var BlockchainAPI = new function() {

  var BlockchainAPI = this;
  var AjaxTimeout = 60000;

  this.getRootURL = function() {
    return "https://blockchain.info/";
  };

  this.get_history = function(success, error, tx_filter, offset, n) {
    var clientTime = (new Date()).getTime();

    tx_filter = tx_filter || 0;
    offset = offset || 0;
    n = n || 0;

    var allAddresses = WalletStore.getLegacyActiveAddresses();
    var myHDWallet = MyWallet.getHDWallet();
    if (myHDWallet != null) {
      for (var i in myHDWallet.getAccounts()) {
        var account = myHDWallet.getAccount(i);
        var accountExtendedPublicKey = account.getAccountExtendedKey(false);
        allAddresses.push(accountExtendedPublicKey);
      }
    }
    var paidTo = MyWallet.getPaidToDictionary();
    for (var tx_hash in paidTo) {
      if (paidTo[tx_hash].redeemedAt == null) {
        allAddresses.push(paidTo[tx_hash].address);
      }
    }

    var data = {
      active : allAddresses.join('|'),
      format : 'json',
      filter : tx_filter,
      offset : offset,
      no_compact : true,
      ct : clientTime,
      n : n,
      language : MyWallet.getLanguage(),
      api_code : MyWallet.getAPICode(),
      no_buttons: true
    };

    retryAjax({
      type: "POST",
      dataType: 'json',
      url: this.getRootURL() +'multiaddr',
      data: data,
      timeout: AjaxTimeout,
      success: function(obj) {
        if (obj.error != null) {
          MyWallet.sendEvent("msg", {type: "error", message: obj.error});
        }

        MyWallet.handleNTPResponse(obj, clientTime);

        //Cache results to show next login
        if (offset == 0 && tx_filter == 0) {
          MyStore.put('multiaddr', JSON.stringify(obj));
        }

        success && success(obj);
      },
      error : function(data) {

        if (data.responseText)
          MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
        else
          MyWallet.sendEvent("msg", {type: "error", message: 'Error Downloading Wallet Balance'});

        error();
      }
    });
  };

  this.get_history_with_addresses = function(addresses, success, error, tx_filter, offset, n) {
    var clientTime=(new Date()).getTime();

    if (!tx_filter) tx_filter = 0;
    if (!offset) offset = 0;
    if (!n) n = 0;

    var data = {
      active : addresses.join('|'),
      format : 'json',
      filter : tx_filter,
      offset : offset,
      no_compact : true,
      ct : clientTime,
      n : n,
      language : MyWallet.getLanguage(),
      api_code : MyWallet.getAPICode(),
      symbol_btc : symbol_btc.code,
      symbol_local : symbol_local.code
    };

    retryAjax({
      type: "POST",
      dataType: 'json',
      url: this.getRootURL() +'multiaddr',
      data: data,
      async: false,
      timeout: AjaxTimeout,
      success: function(obj) {
        if (obj.error != null) {
          MyWallet.sendEvent("msg", {type: "error", message: obj.error});
        }

        MyWallet.handleNTPResponse(obj, clientTime);

        success && success(obj);
      },
      error : function(data) {

        if (data.responseText)
          MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
        else
          MyWallet.sendEvent("msg", {type: "error", message: 'Error Restoring Wallet'});

        error();
      }
    });
  };

  this.async_get_history_with_addresses = function(addresses, success, error, tx_filter, offset, n) {
    var clientTime=(new Date()).getTime();

    if (!tx_filter) tx_filter = 0;
    if (!offset) offset = 0;
    if (!n) n = 0;

    var data = {
      active : addresses.join('|'),
      format : 'json',
      filter : tx_filter,
      offset : offset,
      no_compact : true,
      ct : clientTime,
      n : n,
      language : MyWallet.getLanguage(),
      api_code : MyWallet.getAPICode(),
      symbol_btc : symbol_btc.code,
      symbol_local : symbol_local.code
    };

    retryAjax({
      type: "POST",
      dataType: 'json',
      url: this.getRootURL() +'multiaddr',
      data: data,
      async: true,
      timeout: AjaxTimeout,
      success: function(obj) {
        if (obj.error != null) {
          MyWallet.sendEvent("msg", {type: "error", message: obj.error});
        }

        MyWallet.handleNTPResponse(obj, clientTime);

        success && success(obj);
      },
      error : function(data) {

        if (data.responseText)
          MyWallet.sendEvent("msg", {type: "error", message: data.responseText});
        else
          MyWallet.sendEvent("msg", {type: "error", message: 'Error Restoring Wallet'});

        error();
      }
    });
  };

  //Get the balances of multi addresses (Used for archived)
  this.get_balances = function(addresses, success, error) {
    $.ajax({
      type: "POST",
      url: this.getRootURL() + 'multiaddr',
      dataType: 'json',
      timeout: AjaxTimeout,
      data : {active : addresses.join('|'), simple : true, api_code : MyWallet.getAPICode(), format : 'json'},
      success: function(obj) {
        for (var key in obj) {

          if (WalletStore.legacyAddressExists(key))
            WalletStore.setLegacyAddressBalance(key, obj[key].final_balance);
        }

        success(obj);
      },
      error : function(e) {
        error(e.responseText);
      }
    });
  };

  //Get the balance of an array of addresses
  this.get_balance = function(addresses, success, error) {
    this.get_balances(addresses, function(obj){
      var balance = 0;
      for (var key in obj) {
        balance += obj[key].final_balance;
      }

      success(balance);
    }, error);
  };

  this.sendViaEmail = function(email, tx, privateKey, successCallback, errorCallback) {
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

  this.sendViaSMS = function(number, tx, privateKey, successCallback, errorCallback) {
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

  this.getFiatAtTime = function(time, value, currencyCode, successCallback, errorCallback) {
    $.ajax({
      type: "GET",
      dataType: 'json',
      url: this.getRootURL() +'frombtc',
      data: {value : value, currency: currencyCode, time: time, textual: false, nosavecurrency: true, api_code : MyWallet.getAPICode()},
      timeout: AjaxTimeout,
      success: function(data) {
        successCallback(data);
      },
      error : function(e) {
        errorCallback(e);
      }
    });
  };

  this.get_ticker = function(successCallback, errorCallback) {
    MyWallet.sendEvent("msg", {type: "info", message: 'Getting Ticker Data'});

    $.ajax({
      type: "GET",
      dataType: 'json',
      url: this.getRootURL() +'ticker',
      data: {format : 'json', api_code : MyWallet.getAPICode()},
      timeout: AjaxTimeout,
      success: function(data) {
        MyWallet.sendEvent('ticker_updated');
        successCallback(data);
      },
      error : function(e) {
        console.log(e);
        errorCallback(e);
      }
    });
  };

  this.get_rejection_reason = function(hexhash, got_reason, not_rejected, error) {
    $.ajax({
      type: "GET",
      url: this.getRootURL() + 'q/rejected/'+hexhash,
      data : {format : 'plain', api_code : MyWallet.getAPICode()},
      timeout: AjaxTimeout,
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

  this.push_tx = function(tx, note, success, error) {
    try {

      var _success = function() {
        //Clear the Check Interval
        if (checkTxExistsInterval) {
          clearInterval(checkTxExistsInterval);
          checkTxExistsInterval = null;
        }

        if (success) {
          success(); //Call success to enable send button again
          success = null;
        }
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

      MyWallet.sendEvent("msg", {type: "info", message: 'Pushing Transaction'});

      var transactions = WalletStore.getTransactions();

      //Record the first transactions we know if it doesn't change then our new transactions wasn't push out propoerly
      if (transactions.length > 0)
        var first_tx_index = transactions[0].txIndex;

      var txHex = tx.toHex();

      var tx_hash = tx.getId();

      var did_push = function() {
        _success();

        function call_history() {
          MyWallet.get_history(function() {
            if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
              BlockchainAPI.get_rejection_reason(tx_hash, function(reason) {
                MyWallet.sendEvent("msg", {type: "error", message: reason});
              }, function() {
                if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
                  MyWallet.get_history();
                }
              }, function() {
                if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
                  MyWallet.sendEvent("msg", {type: "error", message: 'Unknown Error Pushing Transaction'});
                }
              });
            } else {
              playSound('beep');
            }
          }, function() {
            MyWallet.sendEvent("msg", {type: "error", message: 'Unable to determine if transaction was submitted. Please re-login.'});
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
        
        BlockchainAPI.get_rejection_reason(tx_hash, function(e) {
          console.log(e);
        }, function() {
          if (did_push) {
            did_push();
            did_push = null;
          }
          
          clearInterval(checkTxExistsInterval);
          checkTxExistsInterval = null;
        }, function(e) {
          console.log(e);
        });
      }, 5000);

      if (!(typeof(window) === "undefined" || typeof(browserDetection) === "undefined") &&
          browserDetection().browser == "ie" && browserDetection().version < 11) {
        var post_data = {
          format : "plain",
          tx: txHex,
          api_code : MyWallet.getAPICode(),
          hash : tx_hash
        };

        if (note) {
          post_data.note = note;
        }

        $.ajax({
          type: "POST",
          url: BlockchainAPI.getRootURL() + 'pushtx',
          timeout: AjaxTimeout,
          data : post_data,
          success: function() {
            if (did_push) {
              did_push();
              did_push = null;
            }
          },
          error : function(e) {
            _error(e ? e.responseText : null);
          }
        });

      } else {
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
        fd.append('api_code', MyWallet.getAPICode());

        $.ajax({
          url: this.getRootURL() + 'pushtx',
          data: fd,
          processData: false,
          contentType: false,
          timeout: AjaxTimeout,
          type: 'POST',
          success: function(){
            if (did_push) {
              did_push();
              did_push = null;
            }
          },
          error : function(e) {
            if (!e.responseText || e.responseText.indexOf('Parse:') == 0) {
              setTimeout(function() {
                push_normal();
              }, 2000);
            } else {
              _error(e ? e.responseText : null);
            }
          }
        });
      }
    } catch (e) {
      console.log(e);

      _error(e);
    }
  };

  this.get_unspent = function(fromAddresses, success, error, confirmations, do_not_use_unspent_cache) {
    retryAjax({
      type: "POST",
      dataType: 'json',
      url: this.getRootURL() +'unspent',
      timeout: AjaxTimeout,
      data: {active : fromAddresses.join('|'), format : 'json', api_code : MyWallet.getAPICode(), confirmations : confirmations ? confirmations : 0},
      success: function(obj) {
        if (obj.error != null) {
          error(obj.error);
          return;
        }

        if (obj.notice != null) {
          MyWallet.sendEvent("msg", {type: "success", message: obj.notice});
        }

        //Save the unspent cache
        MyStore.put('unspent', JSON.stringify(obj));

        success(obj);
      },
      error: function (data) {
        //Try and look for unspent outputs in the cache
        if (do_not_use_unspent_cache) {
          error(data);
        } else {
          MyStore.get('unspent', function(cache) {
            try {
              if (cache != null) {
                var obj = $.parseJSON(cache);

                success(obj);
              } else {
                if (data.responseText)
                  throw data.responseText;
                else
                  throw 'Error Contacting Server. No unspent outputs available in cache.';
              }
            } catch (e) {
              error(e);
            }
          });
        }
      }
    });
  };

};
