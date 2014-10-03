var AccountSettings = new function() {
    function validateEmail(str) {
        var lastAtPos = str.lastIndexOf('@');
        var lastDotPos = str.lastIndexOf('.');
        return (lastAtPos < lastDotPos && lastAtPos > 0 && str.indexOf('@@') == -1 && lastDotPos > 2 && (str.length - lastDotPos) > 2);
    }

    function updateCacheManifest(done) {
        try {
            var cache = window.applicationCache;

            console.log('Clear Cache Manifest');

            // Swap in newly download files when update is ready
            cache.addEventListener('updateready', function(e){
                cache.swapCache();

                if(done) done();
            }, false);

            // Swap in newly download files when update is ready
            cache.addEventListener('noupdate', function(e){
                if(done) done();
            }, false);

            // Swap in newly download files when update is ready
            cache.addEventListener('error', function(e){
                if(done) done();
            }, false);

            cache.update();
        } catch (e) {
            console.log(e);

            if(done) done();
        }
    }

    function updateKV(txt, method, value, success, error, extra) {
        value = $.trim(value);

        if ( value.length == 0) {
            MyWallet.makeNotice('error', 'misc-error', txt + ': Invalid value');
            return;
        }

        if (value.length == 0) {
            MyWallet.makeNotice('error', method + '-error', data.responseText);

            if (error) error();

            return;
        }

        MyWallet.setLoadingText(txt);

        if (!extra)
            extra = '';


        MyWallet.securePost("wallet"+extra, { length : (value+'').length, payload : value+'', method : method }, function(data) {
            MyWallet.makeNotice('success', method + '-success', data);

            if (success) success();
        }, function(data) {
            MyWallet.makeNotice('error', method + '-error', data.responseText);

            if (error) error();
        });
    }

    function setDoubleEncryptionButton() {
        if (MyWallet.getDoubleEncryption()) {
            $('.double-encryption-off').hide();
            $('.double-encryption-on').show();
        } else {
            $('.double-encryption-on').hide();
            $('.double-encryption-off').show();
        }

        $('#double-password').val('');
        $('#double-password2').val('');
    }

    function clearMnemonics() {
        $('#password_mnemonic1').find('span').empty();
        $('#password_mnemonic2').find('span').empty();
    }

    function updateMnemonics() {
        clearMnemonics();

        var mn1 = $('#password_mnemonic1');
        var mn2 = $('#password_mnemonic2');

        loadScript('wallet/mnemonic', function() {
            MyWallet.getMainPassword(function(main_password){
                MyWallet.getSecondPassword(function(second_password) {
                    try {
                        mn_encode_pass({password : main_password, guid : MyWallet.getGuid()}, function(encoded) {
                            mn1.show().find('span').text(encoded);
                        }, function (e) {
                            MyWallet.makeNotice('error', 'misc-error', e);
                        });

                        if (second_password) {
                            mn_encode_pass({password : second_password}, function(encoded) {
                                mn2.show().find('span').text(encoded);
                            }, function (e) {
                                MyWallet.makeNotice('error', 'misc-error', e);
                            });
                        } else {
                            mn2.hide();
                        }
                    } catch (e) {
                        console.log(e);

                        collapseAll();
                    }
                }, function() {
                    collapseAll();
                });
            }, function() {
                collapseAll();
            });
        });
    }

    this.bind = function(success, error) {
        setDoubleEncryptionButton();

        bindAccountButtons();

        getAccountInfo(success, error);
    }

    this.init = function(container, success, error) {
        MyWallet.setLoadingText('Loading Account Settings');

        if (!container.is(':empty')) {
            AccountSettings.bind(success, error);
            success();
            return;
        }

        $.ajax({
            type: "GET",
            url: root + 'wallet/account-settings-template',
            data : {format : 'plain', language : MyWallet.getLanguage()},
            success: function(html) {
                try {
                    container.html(html);

                    AccountSettings.bind(success, error);

                    success();
                } catch (e) {
                    console.log(e);

                    error();
                }
            },
            error : function(data) {
                MyWallet.makeNotice('error', 'misc-error', 'Error Downloading Account Settings Template');

                error();
            }
        });
    }

    //Get email address, secret phrase, yubikey etc.
    function getAccountInfo(success, error) {

        $('a[data-toggle="tab"]').unbind().on('show', function(e) {
            $(e.target.hash).trigger('show');
        });

        MyWallet.setLoadingText('Getting Wallet Info');

        MyWallet.securePost("wallet", {method : 'get-info', format : 'json'}, function(data) {

            if (data.email != null) {
                $('#wallet-email').val(data.email);
                $('.my-email').text(data.email);
            }

            $('#wallet-phrase').val(data.phrase);

            $('#two-factor-select').val(data.auth_type);
            $('.two-factor').hide();
            $('.two-factor.t'+data.auth_type).show(200);

            var notifications_type_el = $('#notifications-type');

            notifications_type_el.find(':checkbox').prop("checked", false);
            notifications_type_el.find('[class^="type"]').hide();

            for (var i in data.notifications_type) {
                var type = data.notifications_type[i];

                notifications_type_el.find(':checkbox[value="'+type+'"]').prop("checked", true);
                notifications_type_el.find('.type-'+type).show();
            }


            $('.logl').hide();

            $('.logl.l'+data.logging_level).show();

            $('#logging-level').val(data.logging_level);
            $('#notifications-confirmations').val(data.notifications_confirmations);
            $('#notifications-on').val(data.notifications_on);
            $('#pbkdf2-iterations').val(MyWallet.getMainPasswordPbkdf2Iterations());
            $('#transactions_per_page').val(MyWallet.getNTransactionsPerPage());

            if (data.alias != null && data.alias.length > 0) {
                $('#wallet-alias').val(data.alias);
                $('.alias').text('https://blockchain.info/wallet/'+data.alias);
                $('.alias').show(200);
            }

            var local_currency = $('#local_currency').empty();
            for (var currency in data.currencies) {
                var currency_name = data.currencies[currency];

                local_currency.append('<option value="'+currency+'">'+currency_name+'</option>');
            }

            local_currency.val(data.currency);

            var btc_currency = $('#btc_currency').empty();
            for (var currency in data.btc_currencies) {
                var currency_name = data.btc_currencies[currency];

                btc_currency.append('<option value="'+currency+'">'+currency_name+'</option>');
            }
            btc_currency.val(data.btc_currency);

            var language_select = $('#language_select').empty();

            for (var language in data.languages) {
                var language_name = data.languages[language];

                language_select.append('<option value="'+language+'">'+language_name+'</option>');
            }

            language_select.val(data.language);

            $('#auto-email-backup').prop("checked", data.auto_email_backup == 1 ? true : false);

            $('#never-save-auth-type').prop("checked", data.never_save_auth_type == 1 ? true : false);

            $('#wallet-http-url').val(data.http_url);
            $('#wallet-skype').val(data.skype_username);
            $('#wallet-boxcar').val(data.boxcar_email);

            $('#wallet-yubikey').val(data.yubikey);

            if (data.password_hint1)
                $('#password-hint1').val(data.password_hint1);

            if (data.password_hint2)
                $('#password-hint2').val(data.password_hint2);

            $('#ip-lock').val(data.ip_lock);
            $('#my-ip').text(data.my_ip);

            $('#ip-lock-on').prop("checked", data.ip_lock_on == 1 ? true : false);
            $('#block-tor-ips').prop("checked", data.block_tor_ips == 1 ? true : false);

            $('input[name="fee-policy"]').each(function() {
                if (parseInt($(this).val()) == MyWallet.getFeePolicy()) {
                    $(this).prop('checked', true);
                }
            });

            $('input[name="always-keep-local-backup"]').prop('checked', MyWallet.getAlwaysKeepLocalBackup() ? true : false);

            $('input[name="inactivity-logout-time"]').each(function() {
                if (parseInt($(this).val()) == MyWallet.getLogoutTime()) {
                    $(this).prop('checked', true);
                }
            });


            if (data.email_verified == 0) {
                $('.email-unverified').show();
                $('.email-verified').hide();
            } else {
                $('.email-unverified').hide();
                $('.email-verified').show();
            }

            $('#my-ip').text(data.my_ip);

            var country_code = '1';

            if (data.sms_number) {
                var sms_split = data.sms_number.split(' ');
                if (data.sms_number[0] == '+' && sms_split.length > 1) {
                    country_code = sms_split[0].substring(1);

                    $('.wallet-sms').val(sms_split[1]);
                } else {
                    $('.wallet-sms').val(data.sms_number);
                }
            }

            if (data.sms_verified == 0) {
                $('.sms-unverified').show();
                $('.sms-verified').hide();
            } else {
                $('.sms-verified').show().trigger('show');
                $('.sms-unverified').hide();
            }

            $.ajax({
                type: "GET",
                url: resource + 'wallet/country_codes.html',
                success: function(data) {
                    $('select[class="wallet-sms-country-codes"]').html(data).val(country_code);
                },
                error : function() {
                    MyWallet.makeNotice('error', 'misc-error', 'Error Downloading SMS Country Codes')
                }
            });


            //HTML 5 notifications request permission
            var request_notification_permission = function(success, error, request) {
                try {
                    if (window.webkitNotifications && navigator.userAgent.indexOf("Chrome") > -1) {
                        var permission = webkitNotifications.checkPermission();
                        if (permission == 1 && request) {
                            webkitNotifications.requestPermission(request_notification_permission);
                        } else if (permission == 0) {
                            success();
                        } else {
                            error();
                        }

                    } else if (window.Notification) {
                        if (Notification.permissionLevel() === 'default' && request) {
                            Notification.requestPermission(request_notification_permission);
                        } else if (window.Notification.permissionLevel() == "granted") {
                            success();
                        } else {
                            error();
                        }
                    } else {
                        error();
                    }
                } catch (e) {
                    console.log(e);

                    error();
                }
            };

            var html5_notifications_checkbox = $('#html5-notifications-checkbox');

            html5_notifications_checkbox.unbind().change(function() {
                if ($(this).is(':checked')) {
                    request_notification_permission(function() {
                        MyWallet.makeNotice('success', 'misc-success', "HTML5 Notifications Enabled");

                        MyWallet.setHTML5Notifications(true);

                        MyWallet.backupWallet();
                    }, function() {
                        MyWallet.makeNotice('error', 'misc-error', "Error Enabling HTML5 Notifications");

                        MyWallet.setHTML5Notifications(false);

                        MyWallet.backupWallet();

                    }, true);
                } else {
                    MyWallet.setHTML5Notifications(false);

                    MyWallet.backupWallet();
                }
            });

            if (MyWallet.getHTML5Notifications()) {
                html5_notifications_checkbox.prop('checked', true);
            } else {
                html5_notifications_checkbox.prop('checked', false);
            };

        }, function(data) {
            if (data.responseText)
                MyWallet.makeNotice('error', 'misc-error', data.responseText);
            else
                MyWallet.makeNotice('error', 'misc-error', 'Error Downloading Account Settings');

            if (error) error();
        });
    }

    function updatePassword() {
        collapseAll();

        var modal = $('#update-password-modal');

        modal.modal({
            keyboard: true,
            backdrop: "static",
            show: true
        });

        modal.center();

        modal.find('.btn.btn-primary').unbind().click(function() {
            modal.modal('hide');

            var tpassword = $.trim($("#password").val());
            var tpassword2 = $.trim($("#password2").val());

            if (tpassword != tpassword2) {
                MyWallet.makeNotice('error', 'misc-error', 'Passwords do not match.');
                return false;
            }

            if (tpassword.length == 0 || tpassword.length < 10 || tpassword.length > 255) {
                MyWallet.makeNotice('error', 'misc-error', 'Password length must be between least 10  & 255 characters');
                return false;
            }

            MyWallet.setMainPassword(tpassword);
        });

        modal.find('.btn.btn-secondary').unbind().click(function() {
            modal.modal('hide');
        });
    }

    function collapseAll() {
        $('.accordion-body').collapse('hide');
    }



    function setDoubleEncryptionOff() {
        MyWallet.setDoubleEncryption(false, null, function() {
            setDoubleEncryptionButton();
        });
    }

    function setDoubleEncryptionOn() {
        var tpassword =  $('#double-password').val();
        var tpassword2 = $('#double-password2').val();

        if (tpassword == null || tpassword.length == 0 || tpassword.length < 4 || tpassword.length > 255) {
            MyWallet.makeNotice('error', 'misc-error', 'Password must be 4 characters or more in length');
            return;
        }

        if (tpassword != tpassword2) {
            MyWallet.makeNotice('error', 'misc-error', 'Passwords do not match.');
            return;
        }

        if (MyWallet.isCorrectMainPassword(tpassword)) {
            MyWallet.makeNotice('error', 'misc-error', 'Second password should not be the same as your main password.');
            return;
        }

        MyWallet.setDoubleEncryption(true, tpassword, function() {
            setDoubleEncryptionButton();
        });

    }

    function bindAccountButtons() {
        var notifications_type_el = $('#notifications-type');
        notifications_type_el.find(':checkbox').unbind().change(function() {

            var val = [];
            notifications_type_el.find(':checkbox:checked').each(function () {
                val.push($(this).val());
            });

            //If Empty Add Zero Val
            if (!val.length) val.push(0);

            updateKV('Updating Notifications Type', 'update-notifications-type', val.join('|'));

            notifications_type_el.find('.type-'+$(this).val()).toggle();

            MyWallet.get_history();
        });

        $('input[name=fee-policy]').unbind().change(function() {
            MyWallet.setFeePolicy($('input[name=fee-policy]:checked').val());

            //Fee Policy is stored in wallet so must save it
            MyWallet.backupWallet();
        });

        $('input[name="always-keep-local-backup"]').unbind().change(function() {
            MyWallet.setAlwaysKeepLocalBackup($(this).is(':checked'));

            //Remove cached payload
            MyStore.remove('payload');

            //Fee Policy is stored in wallet so must save it
            MyWallet.backupWallet();
        });

        $('input[name=inactivity-logout-time]').unbind().change(function() {
            MyWallet.setLogoutTime(parseInt($(this).val()));

            //Fee Policy is stored in wallet so must save it
            MyWallet.backupWallet();
        });

        $('#password_mnemonic').unbind().on('show', function() {
            updateMnemonics();
        }).on('hide', function() {
                clearMnemonics();
            });

        $('#pairing_code').unbind().on('show', function() {
            MyWallet.makePairingQRCode(function(device_qr) {
                $('#pairing-code-v1').html(device_qr);
            }, 1);

            setTimeout(function() {
                collapseAll();
            }, 30000);
        }).on('hide', function() {
                $('#pairing-code-v1').empty();
            });

        $('#update-password-btn').unbind().click(function() {
            updatePassword();
        });

        $('#password-hint1').unbind().change(function() {
            updateKV('Updating Main Password Hint', 'update-password-hint1', $(this).val());
        });

        $('#password-hint2').unbind().change(function() {
            updateKV('Updating Second Password Hint', 'update-password-hint2', $(this).val());
        });

        $('#ip-lock-on').unbind().change(function() {
            updateKV('Updating IP Lock', 'update-ip-lock-on', $(this).is(':checked'));
        });

        $('#ip-lock').unbind().change(function() {
            updateKV('Updating Locked Ip Addresses', 'update-ip-lock', $(this).val());
        });

        $('#notifications-on').unbind().change(function() {
            updateKV('Updating Notifications Settings', 'update-notifications-on', $(this).val());
        });

        $('#auto-email-backup').unbind().change(function() {
            updateKV('Updating Auto Backup Settings', 'update-auto-email-backup', $(this).is(':checked'));
        });

        $('#never-save-auth-type').unbind().change(function() {
            updateKV('Updating Auth Saving Settings', 'update-never-save-auth-type', $(this).is(':checked'));
        });

        $('#wallet-google-qr-code').unbind().change(function() {
            var code = $(this).val();

            updateKV('Updating Two Factor Authentication', 'update-auth-type', 4, function() {
                $('.two-factor.t4').children().hide().eq(0).show();

                MyWallet.setRealAuthType(4);
            }, null, '?code='+code);
        });

        $('#two-factor-select').unbind().change(function() {
            var val = parseInt($(this).val());

            MyStore.remove('payload');

            var el = $('.two-factor.t'+val);

            if (val == 4) {
                el.children().hide().eq(1).show();

                MyWallet.securePost("wallet", { method : 'generate-google-secret' }, function(google_secret_url) {
                    //Show Google Auth QR Code
                    if (google_secret_url != null && google_secret_url.length > 0) {
                        loadScript('wallet/jquery.qrcode', function() {
                            $('#wallet-google-qr').empty().qrcode({width: 300, height: 300, text:  google_secret_url});
                        });
                    }
                }, function(data) {
                    MyWallet.makeNotice('error', 'misc-error', data.responseText);
                });
            } else {
                updateKV('Updating Two Factor Authentication', 'update-auth-type', val, function() {
                    MyWallet.setRealAuthType(val);
                });
            }

            $('.two-factor').hide(200);
            el.show(200);
        });

        var previous_email = '';
        $('#wallet-email-send').click(function() {
            previous_email = '';
            $('#wallet-email').trigger('change');
        });

        $('#wallet-email').unbind().change(function(e) {
            var email = $.trim($(this).val());

            if (email.length == 0)
                return;

            if (previous_email == email)
                return;

            if (!validateEmail(email)) {
                MyWallet.makeNotice('error', 'misc-error', 'Email address is not valid');
                return;
            }

            updateKV('Updating Email', 'update-email', email, function() {
                previous_email = email;
            }, function() {
                previous_email = '';
            });

            previous_email = email;

            $('.email-unverified').show(200);
            $('.email-verified').hide();
        });

        $('#wallet-double-encryption-enable').unbind().click(function(e) {
            collapseAll();

            setDoubleEncryptionOn();
        });

        $('#wallet-double-encryption-disable').unbind().click(function(e) {
            collapseAll();


            setDoubleEncryptionOff();
        });

        $('#pbkdf2-iterations').unbind().change(function(e) {
            var value = parseInt($(this).val());

            MyWallet.setPbkdf2Iterations(value, function() {
                MyWallet.makeNotice('success', 'misc-success', 'Successfully Updated Pbkdf2 Iterations');
            });
        });


        $('#transactions_per_page').unbind().change(function(e) {
            var value = parseInt($(this).val());

            MyWallet.setNTransactionsPerPage(value);

            MyWallet.backupWallet('update', function() {
                MyWallet.get_history();
            });
        });

        $('#wallet-email-code').unbind().change(function(e) {
            var code = $.trim($(this).val());

            if (code.length == 0 || code.length > 255) {
                MyWallet.makeNotice('error', 'misc-error', 'You must enter a code to verify');
                return;
            }

            MyWallet.setLoadingText('Verifying Email');

            MyWallet.securePost("wallet", { payload: code, length : code.length, method : 'verify-email' }, function(data) {
                MyWallet.makeNotice('success', 'misc-success', data);

                $('.email-unverified').hide();
                $('.email-verified').show(200);
            }, function(data) {
                MyWallet.makeNotice('error', 'misc-error', data.responseText);
                $('.email-unverified').show(200);
                $('.email-verified').hide();
            });
        });

        $('.wallet-sms-code').unbind().change(function(e) {
            var code = $.trim($(this).val());

            if (code.length == 0 || code.length > 255) {
                MyWallet.makeNotice('error', 'misc-error', 'You must enter an SMS code to verify');
                return;
            }

            MyWallet.setLoadingText('Verifying SMS Code');

            MyWallet.securePost("wallet", { payload:code, length : code.length, method : 'verify-sms' }, function(data) {
                MyWallet.makeNotice('success', 'misc-success', data);

                $('.sms-unverified').hide();
                $('.sms-verified').show(200).trigger('show');
            }, function(data) {
                MyWallet.makeNotice('error', 'misc-error', data.responseText);
                $('.sms-verified').hide();
                $('.sms-unverified').show(200);
            });
        });

        var wallet_sms_val = '';
        $('.send-code').unbind().click(function() {
            wallet_sms_val = '';
            $(this).parent().find('.wallet-sms').trigger('change');
        });

        $('select[class="wallet-sms-country-codes"]').unbind().change(function(){
            wallet_sms_val = '';
            $('.wallet-sms').trigger('change');
        });

        $('.wallet-sms').unbind().change(function() {
            var val = $.trim($(this).val());

            if (val == null || val.length == 0)
                return;

            if (val.charAt(0) != '+') {
                val = '+' + $('.wallet-sms-country-codes').val() + val;
            }

            if (wallet_sms_val == val) {
                return;
            }

            wallet_sms_val = val;

            updateKV('Updating Cell Number', 'update-sms', val, function() {
                $('.sms-unverified').show(200);
                $('.sms-verified').hide();
            });
        });

        $('#run-key-check').unbind().click(function() {
            MyWallet.getSecondPassword(function() {
                try {
                    MyWallet.checkAllKeys(true);

                    MyWallet.backupWallet();
                } catch (e) {
                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            });
        });

        $('#run-compressed-check').unbind().click(function() {
            MyWallet.getSecondPassword(function() {
                try {
                    MyWallet.runCompressedCheck(true);
                } catch (e) {
                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            });
        });

        $('#register-uri-handler').unbind().click(function() {
            if (navigator && navigator.registerProtocolHandler) {
                try {
                    navigator.registerProtocolHandler("bitcoin", window.location.protocol + '//' + window.location.hostname + "/wallet/login#%s", "Blockchain.info");
                } catch(e) {
                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            } else {
                MyWallet.makeNotice('error', 'misc-error', 'Your browser does not support bitcoin links. Try google chrome.');
            }
        });

        $('#local_currency').unbind().change(function() {
            if (symbol != symbol_local)
                toggleSymbol();

            var code = $(this).val();
            updateKV('Updating Local Currency', 'update-currency', code, function() {
                var original_code = symbol_local.code;
                symbol_local.code = code;
                MyWallet.get_history();
                symbol_local.code = original_code;
            });
        });

        $('#btc_currency').unbind().change(function() {
            if (symbol != symbol_btc)
                toggleSymbol();

            var code = $(this).val();
            updateKV('Updating BTC Currency', 'update-btc-currency', code, function() {
                var original_code = symbol_btc.code;
                symbol_btc.code = code;
                MyWallet.get_history();
                symbol_btc.code = original_code;
            });
        });

        $('#language_select').unbind().change(function() {
            var language = $(this).val();

            updateKV('Updating Language', 'update-language', language, function() {
                MyWallet.setLanguage(language);

                if (!isExtension) {
                    updateCacheManifest(function() {
                        window.location.reload();
                    });
                }
            });
        });

        $('#notifications-confirmations').unbind().change(function(e) {
            updateKV('Updating Notification Confirmations', 'update-notifications-confirmations', $(this).val());
        });

        $('#account-logging').unbind().on('show', function() {

            var table = $(this).find('table').hide();

            var tbody = table.find('tbody');

            MyWallet.securePost('wallet', {method : 'list-logs', format : 'json'}, function(obj) {
                try {
                    table.show();

                    tbody.empty();

                    if (obj == null) {
                        throw 'Failed to get backups';
                    }

                    var results = obj.results;

                    if (results.length == 0) {
                        throw 'No logs found';
                    }

                    for (var i in results) {
                        var result = results[i];


                        tbody.append('<tr><td style="width:130px">'+dateToString(new Date(result.time))+'</td><td style="width:170px">'+result.action+'</td><td style="text-overflow: ellipsis;max-width:100px;overflow: hidden;">'+result.ip_address+'</td><td>'+result.user_agent+'</td></tr>')
                    }
                } catch (e) {
                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            }, function(data) {
                MyWallet.makeNotice('error', 'misc-error', data.responseText);
            });
        });

        $('#logging-level').unbind().change(function(e) {

            $('.logl').hide();

            $('.logl.l'+$(this).val()).show();

            updateKV('Updating Logging Level', 'update-logging-level', $(this).val(), function() {
                $('#account-logging').trigger('show');
            });
        });

        $('#block-tor-ips').unbind().change(function(e) {
            updateKV('Updating TOR ip block', 'update-block-tor-ips', $(this).is(':checked') ? 1 : 0);
        });

        $('#wallet-yubikey').unbind().change(function(e) {
            updateKV('Updating Yubikey', 'update-yubikey', $(this).val());
        });

        $('#wallet-skype').unbind().change(function(e) {
            updateKV('Updating Skype Username', 'update-skype', $(this).val());
        });

        $('#wallet-boxcar').unbind().change(function(e) {
            updateKV('Updating Boxcar Email', 'update-boxcar', $(this).val());
        });

        $('#wallet-http-url').unbind().change(function(e) {
            updateKV('Updating HTTP url', 'update-http-url', $(this).val());
        });

        $('#wallet-phrase').unbind().change(function(e) {
            var phrase = $.trim($(this).val());

            if (phrase == null || phrase.length == 0 || phrase.length > 255) {
                MyWallet.makeNotice('error', 'misc-error', 'You must enter a secret phrase');
                return;
            }

            updateKV('Updating Secret Phrase', 'update-phrase', phrase);
        });

        $('#wallet-alias').unbind().change(function(e) {
            var alias_field = $(this);

            var old_value = $.trim(alias_field.val());

            alias_field.val(alias_field.val().replace(/[\.,\/ #!$%\^&\*;:{}=`~()]/g,""));

            var new_value = $.trim(alias_field.val());

            if (new_value.length > 0) {
                $('.alias').fadeIn(200);
                $('.alias').text('https://blockchain.info/wallet/'+new_value);
            }

            updateKV('Updating Alias', 'update-alias', new_value, null, function(){
                alias_field.val(old_value);
            });
        });
    }
}