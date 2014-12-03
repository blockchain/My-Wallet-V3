var BlockchainAPI = new function() {
    var BlockchainAPI = this;
    var AjaxTimeout = 60000;
    var AjaxRetry = 2;

    /*globals jQuery, window */
    (function($) {
        $.retryAjax = function (ajaxParams) {
            var errorCallback;
            ajaxParams.tryCount = (!ajaxParams.tryCount) ? 0 : ajaxParams.tryCount;
            ajaxParams.retryLimit = (!ajaxParams.retryLimit) ? AjaxRetry : ajaxParams.retryLimit;
            ajaxParams.suppressErrors = true;

            if (ajaxParams.error) {
                errorCallback = ajaxParams.error;
                delete ajaxParams.error;
            } else {
                errorCallback = function () {

                };
            }

            ajaxParams.complete = function (jqXHR, textStatus) {
                if ($.inArray(textStatus, ['timeout', 'abort', 'error']) > -1) {
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
    }(jQuery));


    this.getRootURL = function() {
        return "https://blockchain.info/";
    }

    this.get_history = function(success, error, tx_filter, offset, n) {
        MyWallet.sendMonitorEvent({type: "info", message: 'Loading transactions', code: 0});

        var clientTime=(new Date()).getTime();

        if (!tx_filter) tx_filter = 0;
        if (!offset) offset = 0;
        if (!n) n = 0;

        var allAddresses = MyWallet.getLegacyActiveAddresses();
        //var allAddresses = []; // temporary disable fetching none HD wallet addresses
        var myHDWallet = MyWallet.getHDWallet();
        if (myHDWallet != null) {
            for (var i in myHDWallet.getAccounts()) {
                var account = myHDWallet.getAccount(i);
                if (! account.isArchived()) {
                    allAddresses = allAddresses.concat(account.getAddresses());
                    allAddresses = allAddresses.concat(account.getChangeAddresses());
                }
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
            symbol_btc : symbol_btc.code,
            symbol_local : symbol_local.code,
            no_buttons: true
        };

        $.retryAjax({
            type: "POST",
            dataType: 'json',
            url: root +'multiaddr',
            data: data,
            timeout: AjaxTimeout,
            success: function(obj) {
                if (obj.error != null) {
                    MyWallet.sendMonitorEvent({type: "error", message: obj.error, code: 0});
                }

                MyWallet.handleNTPResponse(obj, clientTime);

                try {
                    //Cache results to show next login
                    if (offset == 0 && tx_filter == 0) {
                        MyStore.put('multiaddr', JSON.stringify(obj));
                    }

                    success(obj);
                } catch (e) {
                    MyWallet.sendMonitorEvent({type: "error", message: e, code: 0});

                    error();
                }
            },
            error : function(data) {

                if (data.responseText)
                    MyWallet.sendMonitorEvent({type: "error", message: data.responseText, code: 0});
                else
                    MyWallet.sendMonitorEvent({type: "error", message: 'Error Downloading Wallet Balance', code: 0});

                error();
            }
        });
    }

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
            symbol_btc : symbol_btc.code,
            symbol_local : symbol_local.code
        };

        $.retryAjax({
            type: "POST",
            dataType: 'json',
            url: root +'multiaddr',
            data: data,
            async: false,
            timeout: AjaxTimeout,
            success: function(obj) {
                if (obj.error != null) {
                    MyWallet.sendMonitorEvent({type: "error", message: obj.error, code: 0});
                }

                MyWallet.handleNTPResponse(obj, clientTime);

                try {
                    success(obj);
                } catch (e) {
                    MyWallet.sendMonitorEvent({type: "error", message: e, code: 0});

                    error();
                }
            },
            error : function(data) {

                if (data.responseText)
                    MyWallet.sendMonitorEvent({type: "error", message: data.responseText, code: 0});
                else
                    MyWallet.sendMonitorEvent({type: "error", message: 'Error Restoring Wallet', code: 0});

                error();
            }
        });
    }

    //Get the balances of multi addresses (Used for archived)
    this.get_balances = function(addresses, success, error) {
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Getting Balances', code: 0});

        $.ajax({
            type: "POST",
            url: root + 'multiaddr',
            dataType: 'json',
            timeout: AjaxTimeout,
            data : {active : addresses.join('|'), simple : true, format : 'json'},
            success: function(obj) {
                for (var key in obj) {

                    if (MyWallet.legacyAddressExists(key))
                        MyWallet.setLegacyAddressBalance(key, obj[key].final_balance);
                }

                success(obj);
            },
            error : function(e) {
                error(e.responseText);
            }
        });
    }

    //Get the balance of an array of addresses
    this.get_balance = function(addresses, success, error) {
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Getting Balance', code: 0});

        this.get_balances(addresses, function(obj){
            var balance = 0;
            for (var key in obj) {
                balance += obj[key].final_balance;
            }

            success(balance);
        }, error);
    }

    function updateKV(txt, method, value, success, error, extra) {
        value = $.trim(value);

        if (!extra) {
            extra = '';
        }

        MyWallet.securePost("wallet"+extra, { length : (value+'').length, payload : value+'', method : method }, function(data) {
            MyWallet.makeNotice('success', method + '-success', data);

            if (success) success();
        }, function(data) {
            MyWallet.makeNotice('error', method + '-error', data.responseText);

            if (error) error();
        });
    }

    this.change_language = function(language, successCallback, errorCallback) {
        updateKV('Updating Language', 'update-language', language, successCallback, errorCallback);
    }

    this.change_local_currency = function(code, successCallback, errorCallback) {
        updateKV('Updating Local Currency', 'update-currency', code, successCallback, errorCallback);
    }

    this.change_btc_currency = function(code, successCallback, errorCallback) {
        updateKV('Updating BTC Currency', 'update-btc-currency', code, successCallback, errorCallback);
    }

    this.update_tor_ip_block = function(enabled, successCallback, errorCallback) {
        updateKV('Updating TOR ip block', 'update-block-tor-ips', enabled, successCallback, errorCallback);
    }

    this.update_password_hint1 = function(value, successCallback, errorCallback) {
        updateKV('Updating Main Password Hint', 'update-password-hint1', value, successCallback, errorCallback);
    }

    this.update_password_hint2 = function(value, successCallback, errorCallback) {
        updateKV('Updating Second Password Hint', 'update-password-hint2', value, successCallback, errorCallback);
    }

    this.change_email = function(email, successCallback, errorCallback) {
        updateKV('Updating Email', 'update-email', email, successCallback, errorCallback);
    }

    this.changeMobileNumber = function(val, successCallback, errorCallback) {
        updateKV('Updating Cell Number', 'update-sms', val, successCallback, errorCallback);
    }

    function updateAuthType(val, successCallback, errorCallback) {
        updateKV('Updating Two Factor Authentication', 'update-auth-type', val, function() {
            MyWallet.setRealAuthType(val);
            if (successCallback)
                successCallback();
        }, errorCallback);
    }

    this.unsetTwoFactor = function(successCallback, errorCallback) {
        updateAuthType(0, successCallback, errorCallback);
    }

    this.setTwoFactorSMS = function(successCallback, errorCallback) {
        updateAuthType(5, successCallback, errorCallback);
    }

    this.setTwoFactorYubiKey = function(successCallback, errorCallback) {
        updateAuthType(3, successCallback, errorCallback);
    }

    this.setTwoFactorEmail = function(successCallback, errorCallback) {
        updateAuthType(2, successCallback, errorCallback);
    }

    this.setTwoFactorGoogleAuthenticator = function(successCallback, errorCallback) {
        MyWallet.securePost("wallet", { method : 'generate-google-secret' }, function(google_secret_url) {
            if (successCallback)
                successCallback(google_secret_url);
        }, function(data) {
            MyWallet.makeNotice('error', 'misc-error', data.responseText);
            if (errorCallback)
                errorCallback(data.responseText);
        });
    }

    this.confirmTwoFactorGoogleAuthenticator = function(code, successCallback, errorCallback) {
        updateKV('Updating Two Factor Authentication', 'update-auth-type', 4, function() {
            MyWallet.setRealAuthType(4);
            if (successCallback)
                successCallback();
        }, errorCallback, '?code='+code);
    }

    this.verifyMobile = function(code, successCallback, errorCallback) {
        MyWallet.securePost("wallet", { payload:code, length : code.length, method : 'verify-sms' }, function(data) {
            MyWallet.sendMonitorEvent({type: "success", message: data, code: 0});
            if (successCallback) successCallback(data);
        }, function(data) {
            MyWallet.sendMonitorEvent({type: "error", message: data.responseText, code: 0});
            if (errorCallback) errorCallback();
        });
    }

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
    }

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
    }

    this.get_ticker = function(successCallback, errorCallback) {
        MyWallet.sendMonitorEvent({type: "info", message: 'Getting Ticker Data', code: 0});

        $.ajax({
            type: "GET",
            dataType: 'json',
            url: root +'ticker',
            data: {format : 'json'},
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
    }

    this.get_account_info = function(successCallback, errorCallback) {
        MyWallet.securePost("wallet", {method : 'get-info', format : 'json'}, function(data) {
            if (successCallback) successCallback(data);

        }, function(data) {
            if (data.responseText)
                MyWallet.sendMonitorEvent({type: "error", message: data.responseText, code: 0});
            else
                MyWallet.sendMonitorEvent({type: "error", message: 'Error Downloading Account Settings', code: 0});

            if (errorCallback) errorCallback();
        });
    }


    this.resolve_firstbits = function(addr, success, error) {
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Querying Firstbits', code: 0});

        $.ajax({
            type: "GET",
            url: root + 'q/resolvefirstbits/'+addr,
            data : {format : 'plain'},
            timeout: AjaxTimeout,
            success: function(data) {
                if (data == null || data.length == 0)
                    error();
                else
                    success(data);
            },
            error : function(e) {
                error(e.responseText);
            }
        });
    }

    this.get_rejection_reason = function(hexhash, got_reason, not_rejected, error) {
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Querying Rejection Reason', code: 0});

        $.ajax({
            type: "GET",
            url: root + 'q/rejected/'+hexhash,
            data : {format : 'plain'},
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
    }

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
            }
            
            var _error = function(e) {
                //Clear the Check Interval
                if (checkTxExistsInterval) {
                    clearInterval(checkTxExistsInterval);
                    checkTxExistsInterval = null;
                }
                
                if (error) {
                    error();
                    error = null;
                }
            }
                        
            MyWallet.sendMonitorEvent({type: "loadingText", message: 'Pushing Transaction', code: 0});

            var transactions = MyWallet.getTransactions();

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
                                MyWallet.makeNotice('error', 'tx-error', reason);
                            }, function() {
                                if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
                                    MyWallet.get_history();
                                }
                            }, function() {
                                if (transactions.length == 0 || transactions[0].txIndex == first_tx_index) {
                                    MyWallet.makeNotice('error', 'tx-error', 'Unknown Error Pushing Transaction');
                                }
                            });
                        } else {
                            playSound('beep');
                        }
                    }, function() {
                        MyWallet.makeNotice('error', 'tx-error', 'Unable to determine if transaction was submitted. Please re-login.');
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

            function push_normal() {
                var post_data = {
                    format : "plain",
                    tx: txHex,
                    hash : tx_hash
                };

                if (note) {
                    post_data.note = note;
                }

                $.ajax({
                    type: "POST",
                    url: root + 'pushtx',
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
            }

            try {
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

                $.ajax({
                    url: root + 'pushtx',
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

            } catch (e) {
                console.log(e);

                push_normal();
            }
        } catch (e) {
            console.log(e);

            _error(e);
        }
    }

    this.get_unspent = function(fromAddresses, success, error, confirmations, do_not_use_unspent_cache) {
        //Get unspent outputs
        MyWallet.sendMonitorEvent({type: "loadingText", message: 'Getting Unspent Outputs', code: 0});

        $.retryAjax({
            type: "POST",
            dataType: 'json',
            url: root +'unspent',
            timeout: AjaxTimeout,
            data: {active : fromAddresses.join('|'), format : 'json', confirmations : confirmations ? confirmations : 0},
            success: function(obj) {
                try {
                    if (obj.error != null) {
                        throw obj.error;
                    }

                    if (obj.notice != null) {
                        MyWallet.makeNotice('notice', 'misc-notice', obj.notice);
                    }

                    //Save the unspent cache
                    MyStore.put('unspent', JSON.stringify(obj));

                    success(obj);
                } catch (e) {
                    error(e);
                }
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
    }
}
