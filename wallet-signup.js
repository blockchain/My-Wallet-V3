var MyWalletSignup = new function() {
    //Save the javascript wallet to the remote server
    function insertWallet(guid, sharedKey, password, extra, successcallback, errorcallback) {
        var _errorcallback = function(e) {
            if (errorcallback != null)
                errorcallback(e);

            else throw e;
        };

        try {
            var data = MyWallet.makeCustomWalletJSON(null, guid, sharedKey);

            //Everything looks ok, Encrypt the JSON output
            var crypted = MyWallet.encryptWallet(data, password);

            if (crypted.length == 0) {
                throw 'Error encrypting the JSON output';
            }

            //Now Decrypt the it again to double check for any possible corruption
            MyWallet.decryptWallet(crypted, password, function() {
                try {
                    //SHA256 new_checksum verified by server in case of curruption during transit
                    var new_checksum = CryptoJS.SHA256(crypted, {asBytes: true}).toString();

                    MyWallet.sendEvent("msg", {type: "info", message: 'Saving wallet', platform: "iOS"});

                    if (extra == null) {
                        extra = '';
                    }

                    var post_data = {
                        length: crypted.length,
                        payload: crypted,
                        checksum: new_checksum,
                        method : 'insert',
                        format : 'plain',
                        sharedKey : sharedKey,
                        guid : guid
                    };
                                   
                    $.extend(post_data, extra);
                                   
                    MyWallet.securePost('wallet', post_data,
                    function(data) {
                        if (successcallback != null)
                            successcallback(data);
                    }, function(e) {
                        _errorcallback(e.responseText);
                    });
                } catch (e) {
                    _errorcallback(e);
                };
            });
        } catch (e) {
            _errorcallback(e);
        }
    }

    function generateUUIDs(n, success, error) {
        MyWallet.sendEvent("msg", {type: "info", message: 'Generating Wallet Identifier', platform: "iOS"});

        $.ajax({
            type: "GET",
            timeout: 60000,
            url: BlockchainAPI.getRootURL() + 'uuid-generator',
            data: { format : 'json', n : n, api_code : MyWallet.getAPICode()},
            success: function(data) {

                if (data.uuids && data.uuids.length == n)
                    success(data.uuids);
                else
                    error('Unknown Error');
            },
            error : function(data) {
                error(data.responseText);
            }
        });
    }

    this.generateNewWallet = function(password, email, success, error) {
        generateUUIDs(2, function(uuids) {
            try {
                var guid = uuids[0];
                var sharedKey = uuids[1];

                rng_seed_time();

                if (password.length < 10) {
                    throw 'Passwords must be at least 10 characters long';
                }

                if (password.length > 255) {
                    throw 'Passwords must be at shorter than 256 characters';
                }

                //User reported this browser generated an invalid private key
                if(navigator.userAgent.match(/MeeGo/i)) {
                    throw 'MeeGo browser currently not supported.';
                }

                if (guid.length != 36 || sharedKey.length != 36) {
                    throw 'Error generating wallet identifier';
                }
                
                insertWallet(guid, sharedKey, password, {email : email}, function(message){
                                 success(guid, sharedKey, password);
                             }, function(e) {
                                 error(e);
                             });
            } catch (e) {
                error(e);
            }
        }, error);
    }
};

