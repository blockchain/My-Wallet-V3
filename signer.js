function exceptionToString(err) {
    var vDebug = "";
    for (var prop in err)  {
        vDebug += "property: "+ prop+ " value: ["+ err[prop]+ "]\n";
    }
    return "toString(): " + " value: [" + err.toString() + "]";
}

function generateNewMiniPrivateKey() {
    while (true) {
        //Use a normal ECKey to generate random bytes
        var key = Bitcoin.ECKey.makeRandom(false);

        //Make Candidate Mini Key
        var minikey = 'S' + Bitcoin.base58.encode(key.d.toBuffer(32)).substr(0, 21);

        //Append ? & hash it again
        var bytes_appended = Crypto.SHA256(minikey + '?', {asBytes: true});

        //If zero byte then the key is valid
        if (bytes_appended[0] == 0) {

            //SHA256
            var bytes = Crypto.SHA256(minikey, {asBytes: true});

            var eckey = new Bitcoin.ECKey(new Bitcoin.BigInteger.fromBuffer(bytes), false);

            if (MyWallet.addPrivateKey(eckey))
                return {key : eckey, miniKey : minikey};
        }
    }
}

function IsCanonicalSignature(vchSig) {
    if (vchSig.length < 9)
        throw 'Non-canonical signature: too short';
    if (vchSig.length > 73)
        throw 'Non-canonical signature: too long';
    var nHashType = vchSig[vchSig.length - 1];
    if (nHashType != Bitcoin.Transaction.SIGHASH_ALL && nHashType != Bitcoin.Transaction.SIGHASH_NONE && nHashType != Bitcoin.Transaction.SIGHASH_SINGLE && nHashType != Bitcoin.Transaction.SIGHASH_ANYONECANPAY)
        throw 'Non-canonical signature: unknown hashtype byte ' + nHashType;
    if (vchSig[0] != 0x30)
        throw 'Non-canonical signature: wrong type';
    if (vchSig[1] != vchSig.length-3)
        throw 'Non-canonical signature: wrong length marker';
    var nLenR = vchSig[3];
    if (5 + nLenR >= vchSig.length)
        throw 'Non-canonical signature: S length misplaced';
    var nLenS = vchSig[5+nLenR];
    if (nLenR+nLenS+7 != vchSig.length)
        throw 'Non-canonical signature: R+S length mismatch';

    var n = 4;
    if (vchSig[n-2] != 0x02)
        throw 'Non-canonical signature: R value type mismatch';
    if (nLenR == 0)
        throw 'Non-canonical signature: R length is zero';
    if (vchSig[n+0] & 0x80)
        throw 'Non-canonical signature: R value negative';
    if (nLenR > 1 && (vchSig[n+0] == 0x00) && !(vchSig[n+1] & 0x80))
        throw 'Non-canonical signature: R value excessively padded';

    var n = 6+nLenR;
    if (vchSig[n-2] != 0x02)
        throw 'Non-canonical signature: S value type mismatch';
    if (nLenS == 0)
        throw 'Non-canonical signature: S length is zero';
    if (vchSig[n+0] & 0x80)
        throw 'Non-canonical signature: S value negative';
    if (nLenS > 1 && (vchSig[n+0] == 0x00) && !(vchSig[n+1] & 0x80))
        throw 'Non-canonical signature: S value excessively padded';

    return true;
}


try {
//Init WebWorker
//Window is not defined in WebWorker
    if (typeof window == "undefined" || !window) {
        var window = {};

        self.addEventListener('message', function(e) {
            var data = e.data;
            try {
                switch (data.cmd) {
                    case 'seed':
                        var word_array = Crypto.util.bytesToWords(Crypto.util.hexToBytes(data.seed));

                        for (var i in word_array) {
                            rng_seed_int(word_array[i]);
                        }
                        break;
                    case 'decrypt':
                        var decoded = Crypto.AES.decrypt(data.data, data.password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : data.pbkdf2_iterations});

                        self.postMessage({cmd : 'on_decrypt', data : decoded});

                        break;
                    case 'load_resource':
                        importScripts(data.path);
                        break;
                    case 'sign_input':
                        var tx = new Bitcoin.Transaction(data.tx);

                        var connected_script = new Bitcoin.Script(data.connected_script);

                        var signed_script = signInput(tx, data.outputN, data.priv_to_use, connected_script);

                        if (signed_script) {
                            self.postMessage({cmd : 'on_sign', script : signed_script, outputN : data.outputN});
                        } else {
                            throw 'Unknown Error Signing Script ' + data.outputN;
                        }
                        break;
                    default:
                        throw 'Unknown Command';
                };
            } catch (e) {
                self.postMessage({cmd : 'on_error', e : exceptionToString(e)});
            }
        }, false);
    }
} catch (e) { }


function resolveAddress(label) {
    label = $.trim(label);

    try {
        return Bitcoin.Address.fromBase58Check(label).toString();
    } catch (e) {}

    label = label.toLowerCase();

    var address_book = MyWallet.getAddressBook();
    for (var key in address_book) {
        var a_label = MyWallet.getAddressBookLabel(key);
        if (a_label.toLowerCase() == label) {
            return $.trim(key);
        }
    }

    var addresses = MyWallet.getAllLegacyAddresses();
    for (var i = 0; i < addresses.length; ++i) {
        var key = addresses[i];
        var a_label = MyWallet.getLegacyAddressLabel(key);
        if (a_label && a_label.toLowerCase() == label)
            return key;
    }

    return null;
}


//Check for inputs and get unspent for before signing
function startTxUI(el, type, pending_transaction, dont_ask_for_anon) {

    function resetForm() {
        el.find('input[name="send-value"]').val('');
        el.find('input[name="send-to-address"]').val('');
    }

    try {
        el.find('input,select,button').prop('disabled', true);

        pending_transaction.addListener({
            on_success : function(e) {
                el.find('input,select,button').prop('disabled', false);
            },
            on_start : function(e) {
                el.find('input,select,button').prop('disabled', true);
            },
            on_error : function(e) {
                el.find('input,select,button').prop('disabled', false);
            }
        });

        var total_value = 0;
        el.find('input[name="send-value"]').each(function() {
            total_value += parseFloat($(this).val());
        });

        var custom_ask_for_fee = true;
        if (total_value > precisionFromBTC(10)) {
            if (type == 'email' || type == 'sms') {
                throw 'Cannot Send More Than 10 BTC via email or sms';
            } else if (type == 'quick') { //Any quick transactions over 10 BTC make them custom
                type = 'custom';
                custom_ask_for_fee = false;
            }
        } else if (type == 'shared' && total_value < precisionFromBTC(0.1)) {
            throw 'The Minimum Amount You Can Send Shared is ' + formatPrecision(precisionFromBTC(0.1));
        } else if (type == 'shared' && total_value > precisionFromBTC(250)) {
            throw 'The Maximum Amount You Can Send Shared is ' +  formatPrecision(precisionFromBTC(250));
        }


        if (type == 'custom' || type == 'shared') {

            var listener = {
                on_error : function(e) {
                    if (this.modal)
                        this.modal.modal('hide');
                },
                on_success : function() {
                    resetForm();
                },
                on_start : function() {
                    //Show the modal on start
                    var self = this;

                    //Create the modal
                    this.modal = $('#new-transaction-modal');

                    this.modal.modal({
                        keyboard: false,
                        backdrop: "static",
                        show: true
                    });

                    this.modal.find('.offline-transaction').hide();
                    this.modal.find('#missing-private-key').hide();
                    this.modal.find('#review-tx').hide();

                    this.modal.find('.modal-header h3').html('Creating transaction');

                    this.modal.find('#tx-sign-progress').hide();

                    //disable primary for now
                    this.modal.find('.btn.btn-primary').prop('disabled', true);

                    this.modal.find('.btn.btn-primary').text('Send Transaction');

                    this.modal.find('.btn.btn-secondary').unbind().click(function() {
                        if (self.modal)
                            self.modal.modal('hide');

                        self.cancel();
                    });
                },
                on_begin_signing : function() {
                    $('#tx-sign-progress').show().find('.t').text(this.tx.ins.length);
                },
                on_sign_progress : function(i) {
                    $('#tx-sign-progress').find('.n').text(i);
                },
                on_finish_signing : function() {
                    $('#tx-sign-progress').hide();
                }
            };

            pending_transaction.addListener(listener);


            if (custom_ask_for_fee) {
                pending_transaction.ask_for_fee = function(yes, no) {
                    var self = this;

                    if (self.modal)
                        self.modal.modal('hide'); //Hide the transaction progress modal

                    var modal = $('#ask-for-fee');

                    modal.modal({
                        keyboard: false,
                        backdrop: "static",
                        show: true
                    });

                    modal.find('.btn.btn-primary').unbind().click(function() {
                        modal.modal('hide');

                        yes();
                    });

                    modal.find('.btn.btn-secondary').unbind().click(function() {
                        modal.modal('hide');

                        no();
                    });

                    modal.unbind().on('hidden', function () {
                        if (self.modal)
                            self.modal.modal('show'); //Show the progress modal again
                    });
                };

                pending_transaction.ask_to_increase_fee = function(yes, no, customFee, recommendedFee) {
                    var self = this;

                    if (self.modal)
                        self.modal.modal('hide'); //Hide the transaction progress modal

                    var modal = $('#ask-to-increase-fee');

                    modal.modal({
                        keyboard: false,
                        backdrop: "static",
                        show: true
                    });

                    var modal_body = modal.find('.modal-body');

                    var spans = modal_body.find('span');

                    spans.eq(0).text(formatSymbol(customFee.intValue(), symbol_btc));

                    spans.eq(1).text(formatSymbol(recommendedFee.intValue(), symbol_btc));

                    modal.find('.btn.btn-primary').unbind().click(function() {
                        modal.modal('hide');

                        yes();
                    });

                    modal.find('.btn.btn-secondary').unbind().click(function() {
                        modal.modal('hide');

                        no();
                    });

                    modal.unbind().on('hidden', function () {
                        if (self.modal)
                            self.modal.modal('show'); //Show the progress modal again
                    });
                };
            }

            pending_transaction.ask_to_send = function() {
                var self = this;
                try {
                    self.modal.find('.modal-header h3').html(self.ready_to_send_header);

                    self.modal.find('#missing-private-key').hide();

                    self.modal.find('#review-tx').show();

                    setReviewTransactionContent(self.modal, self.tx, self.sendTxInAmounts, self.sendTxOutAmounts, self.type);

                    setAdv(false);

                    self.modal.center();

                    //We have the transaction ready to send, check if were online or offline
                    var btn = self.modal.find('.btn.btn-primary');

                    $.ajax({
                        timeout: 60000,
                        type: "GET",
                        url: BlockchainAPI.getRootURL() + 'ping',
                        data : {format : 'plain', date : new Date().getTime()},
                        success: function() {
                            btn.removeAttr('disabled');

                            btn.text('Send Transaction');

                            btn.unbind().click(function() {
                                btn.prop('disabled', true);

                                if (self.modal)
                                    self.modal.modal('hide');

                                self.send();
                            });
                        },
                        error : function() {
                            self.modal.find('.modal-header h3').html('Created Offline Transaction.');

                            btn.removeAttr('disabled');

                            btn.text('Show Offline Instructions');

                            btn.unbind().click(function() {

                                btn.prop('disabled', true);

                                self.modal.find('#missing-private-key').hide();
                                self.modal.find('#review-tx').hide();
                                self.modal.find('.offline-transaction').show();

                                var hex = self.tx.toHex();

                                self.modal.find('.offline-transaction textarea[name="data"]').val(hex);
                            });

                            self.modal.center();
                        }
                    });
                } catch (e) {
                    self.error(e);
                }
            };
        } else if (type == 'quick' || type == 'email' || type == 'dice' || type == 'sms') {
            var listener = {
                on_error : function(e) {
                    el.find('.send').show();
                    if (this.p)
                        this.p.hide();
                },
                on_success : function() {
                    try {
                        el.find('.send').show();

                        if (type != 'dice') {
                            resetForm();
                        }

                        if (this.p)
                            this.p.hide();
                    } catch (e) {
                        console.log(e);
                    }
                },
                on_start : function() {
                    this.p = el.find('.progress');

                    el.find('.send').hide();

                    this.p.show();

                    this.p.children().css('width', '10%');
                },
                on_begin_signing : function() {
                    this.p.children().css('width', '25%');
                },
                on_sign_progress : function(i) {
                    this.p.children().css('width', 25 + ((100 / this.tx.ins.length) * i) + '%');
                },
                on_finish_signing : function() {
                    this.p.children().css('width', '100%');
                }
            };

            pending_transaction.addListener(listener);

            if (type == 'sms') {
                pending_transaction.ask_to_send = function() {
                    try {
                        var self = this;

                        MyWallet.securePost('send-via', {
                            type : 'sms',
                            to : self.sms_data.number,
                            priv : self.sms_data.miniKey,
                            hash : self.tx.getId()
                        }, function() {
                            self.send();
                        }, function(data) {
                            self.error(data ? data.responseText : null);
                        });
                    } catch (e) {
                        self.error(e);
                    }
                };
            } else if (type == 'email') {
                pending_transaction.ask_to_send = function() {
                    var self = this;

                    var modal = $('#send-email-modal');

                    try {
                        MyWallet.securePost("wallet", { method : 'get-info', format : 'json' }, function(data) {
                            try {
                                modal.modal({
                                    keyboard: true,
                                    backdrop: "static",
                                    show: true
                                });

                                var from_name = data.alias;
                                if (from_name == null)
                                    from_name = data.email

                                if (from_name == null)
                                    from_name = 'Shared'

                                modal.find('.amount').text(formatBTC(self.email_data.amount.toString()));

                                modal.find('.email').text(self.email_data.email);

                                modal.find('.frame').html('<iframe frameBorder="0" style="box-sizing:border-box;width:100%;height:100%" src="'+BlockchainAPI.getRootURL()+'email-template?from_name='+from_name+'&amount='+self.email_data.amount+'&priv=Preview&type=send-bitcoins-get"></iframe>');

                                modal.find('.btn.btn-secondary').unbind().click(function() {
                                    self.cancel();
                                    modal.modal('hide');
                                });

                                modal.find('.btn.btn-primary').unbind().click(function() {
                                    modal.modal('hide');

                                    try {
                                        MyWallet.securePost('send-via', {
                                            type : 'email',
                                            to : self.email_data.email,
                                            priv : self.email_data.priv,
                                            hash : self.tx.getId()
                                        }, function(data) {
                                            self.send();
                                        }, function(data) {
                                            self.error(data ? data.responseText : null);
                                        });

                                    } catch (e) {
                                        self.error(e);
                                    }
                                });
                            } catch (e) {
                                modal.modal('hide');

                                self.error(e);
                            }
                        }, function(e) {
                            modal.modal('hide');

                            self.error('Error Getting Account Data');
                        });
                    } catch (e) {
                        modal.modal('hide');

                        self.error(e);
                    }
                };
            }
        }

        //Modal for when private key is missing (Watch Only)
        pending_transaction.insufficient_funds = function(amount_required, amount_available, yes, no) {
            var self = this;

            if (self.modal)
                self.modal.modal('hide'); //Hide the transaction progress modal

            var modal = $('#insufficient-funds');


            modal.find('.amount-required').text(formatBTC(amount_required));

            modal.find('.amount-available').text(formatBTC(amount_available));

            modal.modal({
                keyboard: false,
                backdrop: "static",
                show: true
            });

            modal.find('.btn.btn-primary').unbind().click(function() {
                modal.modal('hide');
                yes();
            });

            modal.find('.btn.btn-secondary').unbind().click(function() {
                modal.modal('hide');
                no();
            });

            modal.unbind().on('hidden', function () {
                if (self.modal)
                    self.modal.modal('show'); //Show the progress modal again
            });
        };

        //Modal for when private key is missing (Watch Only)
        pending_transaction.ask_for_private_key = function(success, error, addr) {
            var self = this;

            if (self.modal)
                self.modal.modal('hide'); //Hide the transaction progress modal

            showPrivateKeyModal(function(key, compressed) {
                if (self.modal)
                    self.modal.modal('show'); //Show the progress modal again

                success(key, compressed);
            }, function (e) {
                if (self.modal)
                    self.modal.modal('show'); //Show the progress modal again

                error(e);
            }, addr)
        };

        pending_transaction.type = type;

        //Default is 0.0001 Base Fee, No fee
        if (MyWallet.getFeePolicy() == 1) {
            pending_transaction.base_fee = Bitcoin.BigInteger.valueOf(100000); //0.001 BTC
            pending_transaction.fee = Bitcoin.BigInteger.valueOf(100000); //0.001 BTC
        } else if (MyWallet.getFeePolicy() == -1) {
            pending_transaction.base_fee = Bitcoin.BigInteger.valueOf(10000); //0.0001 BTC
            pending_transaction.ask_for_fee = function(yes, no) {
                no();
            };
        }

    } catch (e) {
        pending_transaction.error(e);
    }

    return pending_transaction;
};


function signInput(tx, inputN, base58Key, connected_script, type) {
    type = type ? type : Bitcoin.Transaction.SIGHASH_ALL;

    var inputBitcoinAddress = Bitcoin.Address.fromOutputScript(connected_script);
    
    var decoded = MyWallet.B58LegacyDecode(base58Key)
    
    var key = new Bitcoin.ECKey(new Bitcoin.BigInteger.fromBuffer(decoded), false);

    // var key = new Bitcoin.ECKey(new Bitcoin.BigInteger.fromBuffer(base58Key), false);
    
    if (MyWallet.getUnCompressedAddressString(key) == inputBitcoinAddress.toString()) {
    } else if (MyWallet.getCompressedAddressString(key) == inputBitcoinAddress.toString()) {
        key = new Bitcoin.ECKey(key.d, true);
    } else {
        throw 'Private key does not match bitcoin address ' + inputBitcoinAddress.toString() + ' != ' + MyWallet.getUnCompressedAddressString(key) + ' | '+ MyWallet.getCompressedAddressString(key);
    }
    var signature = tx.signInput(inputN, connected_script, key);

    if (!IsCanonicalSignature(signature)) {
        throw 'IsCanonicalSignature returned false';
    }

    tx.setInputScript(inputN, Bitcoin.scripts.pubKeyHashInput(signature, key.pub));

    if (tx.ins[inputN].script == null) {
        throw 'Error creating input script';
    }

    return tx.ins[inputN].script;
}


function formatAddresses(m, faddresses, resolve_labels) {
    var str = '';
    if (faddresses.length == 1) {
        var addr_string = faddresses[0].toString();

        if (resolve_labels && MyWallet.legacyAddressExists(addr_string) && MyWallet.getLegacyAddressLabel(addr_string))
            str = MyWallet.getLegacyAddressLabel(addr_string);
        else if (resolve_labels && MyWallet.getAddressBookLabel(addr_string))
            str = MyWallet.getAddressBookLabel(addr_string);
        else
            str = addr_string;

    } else {
        str = 'Escrow (<i>';
        for (var i = 0; i < faddresses.length; ++i) {
            str += faddresses[i].toString() + ', ';
        }

        str = str.substring(0, str.length-2);

        str += '</i> - ' + m + ' Required)';
    }
    return str;
}

function setReviewTransactionContent(modal, tx, sendTxInAmounts, sendTxOutAmounts, type) {

    $('#rtc-hash').html(tx.getId());
    $('#rtc-version').html(tx.version);
    $('#rtc-from').html('');
    $('#rtc-to').html('');

    var total = Bitcoin.BigInteger.ZERO;
    var total_fees =  Bitcoin.BigInteger.ZERO;
    var wallet_effect =  Bitcoin.BigInteger.ZERO;
    var basic_str = 'send ';
    var all_txs_to_self = true;
    var amount =  Bitcoin.BigInteger.ZERO;

    for (var i = 0; i < tx.ins.length; ++i) {
        var input = tx.ins[i];

        total_fees = total_fees.add(sendTxInAmounts[i]);

        wallet_effect = wallet_effect.add(sendTxInAmounts[i]);

        var addr = null;
        try {
            addr = new Bitcoin.Address(MyWallet.simpleInPubKeyHash(input.script), Bitcoin.networks.bitcoin.pubKeyHash);
        } catch(e) {
            addr = 'Unable To Decode Address';
        }

        $('#rtc-from').append(addr + ' <font color="green">' + formatBTC(sendTxInAmounts[i].toString()) + ' <br />');
    }

    var isFirst = true;
    for (var i = 0; i < tx.outs.length; ++i) {
        var out = tx.outs[i];

        var val =  sendTxOutAmounts[i];

        var out_addresses = [];

        var m = 1;

        try {
            m = MyWallet.extractAddresses(out.script, out_addresses);
        } catch (e) {
            out_addresses.push('Unknown Address!');
        }

        $('#rtc-to').append(formatAddresses(m, out_addresses) + ' <font color="green">' + formatBTC(val.toString()) + ' </font><br />');

        total = total.add(val);

        total_fees = total_fees.subtract(val);

        //If it's an escrow transaction we always subtract it from the wallet effect
        //As technically we are not in control of the funds anymore
        if (out_addresses.length > 1) {

            if (!isFirst) {
                basic_str += ' and ';
            }

            basic_str += '<b>' + formatBTC(val.toString())  + '</b> to ' + formatAddresses(m, out_addresses, true);

            all_txs_to_self = false;

            wallet_effect = wallet_effect.subtract(val);

            //check if it's an address in our wallet
            //If it is then we don't need to subtract it from wallet effect
        } else if (out_addresses.length > 0) {
            var address = out_addresses[0].toString();
            if (!MyWallet.legacyAddressExists(address)|| MyWallet.getLegacyAddressTag(address) == 2) {

                if (val.compareTo(Bitcoin.BigInteger.ZERO) == 0)
                    continue;

                //Our fees
                if (!isFirst) {
                    basic_str += ' and ';
                }

                if (type && type == 'shared') {
                    basic_str += '<b>' + formatBTC(val.toString())  + '</b> Shared';
                } else {
                    basic_str += '<b>' + formatBTC(val.toString())  + '</b> to ' + formatAddresses(1, [address], true);
                }

                all_txs_to_self = false;
            } else {
                wallet_effect = wallet_effect.subtract(val);

                amount = amount.add(val);
            }
        }

        isFirst = false;
    }

    if (total_fees.compareTo(Bitcoin.BigInteger.valueOf(1).multiply(Bitcoin.BigInteger.valueOf(satoshi))) >= 0) {
        alert('Warning fees are very high for this transaction. Please double check each output!');
    }

    if (all_txs_to_self == true) {
        basic_str = 'move <b>' + formatBTC(total.toString()) + '</b> between your own bitcoin addresses';
    }

    $('#rtc-basic-summary').html(basic_str);

    $('#rtc-effect').html("-" + formatBTC(wallet_effect.toString()));

    $('#rtc-fees').html(formatBTC(total_fees.toString()));

    $('#rtc-value').html(formatBTC(total.toString()));
}

/*

 pending_transaction {
 change_address : BitcoinAddress
 from_addresses : [String]
 to_addresses : [{address: BitcoinAddress, value : Bitcoin.BigInteger}]
 generated_addresses : [String]
 extra_private_keys : {addr : String, priv : ECKey}
 fee : Bitcoin.BigInteger
 on_error : function
 on_success : function
 on_ready_to_send : function
 on_before_send : function
 }
 */
function initNewTx() {
    var pending_transaction = {
        generated_addresses : [],
        to_addresses : [],
        fee : Bitcoin.BigInteger.ZERO,
        extra_private_keys : {},
        listeners : [],
        is_cancelled : false,
        base_fee : Bitcoin.BigInteger.valueOf(10000),
        min_free_output_size : Bitcoin.BigInteger.valueOf(1000000),
        min_non_standard_output_size : Bitcoin.BigInteger.valueOf(5460),
        allow_adjust : true,
        ready_to_send_header : 'Transaction Ready to Send.',
        min_input_confirmations : 0,
        do_not_use_unspent_cache : false,
        min_input_size : Bitcoin.BigInteger.ZERO,
        did_specify_fee_manually : false,
        sendTxInAmounts : [],
        sendTxOutAmounts : [],
        addListener : function(listener) {
            this.listeners.push(listener);
        },
        invoke : function (cb, obj, ob2) {
            for (var key in this.listeners) {
                try {
                    if (this.listeners[key][cb])
                        this.listeners[key][cb].call(this, obj, ob2);
                } catch(e) {
                    console.log(e);
                }
            }
        }, start : function(second_password) {
            if(second_password == undefined) {
              second_password = null;
            }
            var self = this;

            try {
                self.invoke('on_start');
                BlockchainAPI.get_unspent(self.from_addresses, function (obj) {
                    try {
                        if (self.is_cancelled) {
                            throw 'Transaction Cancelled';
                        }

                        if (obj.unspent_outputs == null || obj.unspent_outputs.length == 0) {
                            throw 'No Free Outputs To Spend';
                        }

                        self.unspent = [];

                        for (var i = 0; i < obj.unspent_outputs.length; ++i) {
                            var script;
                            try {
                                script = Bitcoin.Script.fromHex(obj.unspent_outputs[i].script);

                                if (Bitcoin.scripts.classifyOutput(script) == 'nonstandard')
                                    throw 'Strange Script';

                            } catch(e) {
                                MyWallet.sendEvent("msg", {type: "error", message: 'Error Saving Wallet: ' + e}); //Not a fatal error
                                continue;
                            }

                            var out = {script : script,
                                value : new Bitcoin.BigInteger.fromHex(obj.unspent_outputs[i].value_hex),
                                tx_output_n : obj.unspent_outputs[i].tx_output_n,
                                tx_hash : obj.unspent_outputs[i].tx_hash,
                                confirmations : obj.unspent_outputs[i].confirmations
                            };
                            
                            self.unspent.push(out);
                        }
                        
                        self.makeTransaction(second_password);
                    } catch (e) {
                        self.error(e);
                    }
                }, function(e) {
                    self.error(e);
                }, self.min_input_confirmations, self.do_not_use_unspent_cache);
            } catch (e) {
                self.error(e);
            }
        },
        isSelectedValueSufficient : function(txValue, availableValue) {
            return availableValue.compareTo(txValue) == 0 || availableValue.compareTo(txValue.add(this.min_free_output_size)) >= 0;
        },
        //Select Outputs and Construct transaction
        makeTransaction : function(second_password) {
            var self = this;

            try {
                if (self.is_cancelled) {
                    throw 'Transaction Cancelled';
                }

                self.selected_outputs = [];

                var txValue = Bitcoin.BigInteger.ZERO;
                for (var i = 0; i < self.to_addresses.length; ++i) {
                    txValue = txValue.add(self.to_addresses[i].value);
                }

                var availableValue = Bitcoin.BigInteger.ZERO;

                //Add the miners fees
                if (self.fee != null) {
                    txValue = txValue.add(self.fee);
                }

                var priority = 0;
                var addresses_used = [];
                var forceFee = false;

                //First try without including watch only
                //If we don't have enough funds ask for the watch only private key
                var unspent_copy = self.unspent.slice(0);
                function parseOut(out) {
                    var addr = Bitcoin.Address.fromOutputScript(out.script).toString();

                    if (addr == null) {
                        throw 'Unable to decode output address from transaction hash ' + out.tx_hash;
                    }

                    if (out.script == null) {
                        throw 'Output script is null (' + out.tx_hash + ':' + out.tx_output_n + ')';
                    }

                    var outTxHash = new Bitcoin.Buffer.Buffer(out.tx_hash, "hex");
                    Array.prototype.reverse.call(outTxHash);

                    var transactionInputDict = {outpoint: {hash: outTxHash.toString("hex"), index: out.tx_output_n, value:out.value}, script: out.script, sequence: 4294967295};

                    return {addr : addr , transactionInputDict : transactionInputDict}
                };

                //Loop once without watch only, then again with watch only
                var includeWatchOnly = false;
                while(true) {
                    for (var i = 0; i < unspent_copy.length; ++i) {
                        var out = unspent_copy[i];

                        if (!out) continue;

                        try {
                            var addr_input_obj = parseOut(out);

                            if (!includeWatchOnly && MyWallet.isWatchOnlyLegacyAddress(addr_input_obj.addr)) {
                                continue;
                            }

                            if (self.from_addresses != null && $.inArray(addr_input_obj.addr, self.from_addresses) == -1) {
                                continue;
                            }

                            //Ignore inputs less than min_input_size
                            if (out.value.compareTo(self.min_input_size) < 0) {
                                continue;
                            }

                            //If the output happens to be greater than tx value then we can make this transaction with one input only
                            //So discard the previous selected outs
                            //out.value.compareTo(self.min_free_output_size) >= 0 because we want to prefer a change output of greater than 0.01 BTC
                            //Unless we have the extact tx value
                            if (out.value.compareTo(txValue) == 0 || self.isSelectedValueSufficient(txValue, out.value)) {
                                self.selected_outputs = [addr_input_obj.transactionInputDict];

                                unspent_copy[i] = null; //Mark it null so we know it is used

                                addresses_used = [addr_input_obj.addr];

                                priority = out.value.intValue() * out.confirmations;

                                availableValue = out.value;

                                break;
                            } else {
                                //Otherwise we add the value of the selected output and continue looping if we don't have sufficient funds yet
                                self.selected_outputs.push(addr_input_obj.transactionInputDict);

                                unspent_copy[i] = null; //Mark it null so we know it is used

                                addresses_used.push(addr_input_obj.addr);

                                priority += out.value.intValue() * out.confirmations;

                                availableValue = availableValue.add(out.value);

                                if (self.isSelectedValueSufficient(txValue, availableValue))
                                    break;
                            }
                        } catch (e) {
                            //An error, but probably recoverable
                            MyWallet.sendEvent("msg", {type: "error", message: e});
                        }
                    }

                    if (self.isSelectedValueSufficient(txValue, availableValue)) {
                      break;
                    }

                    if (includeWatchOnly) {
                      break;
                    }

                    includeWatchOnly = true;
                }

                function insufficientError() {
                    self.error('Insufficient funds. Value Needed ' +  formatBTC(txValue.toString()) + '. Available amount ' + formatBTC(availableValue.toString()));
                }

                var difference = availableValue.subtract(txValue);
                                
                if (difference.compareTo(Bitcoin.BigInteger.ZERO) < 0) {
                    //Can only adjust when there is one recipient
                    if (self.to_addresses.length == 1 && availableValue.compareTo(Bitcoin.BigInteger.ZERO) > 0 && self.allow_adjust) {
                        self.insufficient_funds(txValue, availableValue, function() {

                            //Subtract the difference from the to address
                            var adjusted = self.to_addresses[0].value.add(difference);
                            if (adjusted.compareTo(Bitcoin.BigInteger.ZERO) > 0 && adjusted.compareTo(txValue) <= 0) {
                                self.to_addresses[0].value = adjusted;
                                self.makeTransaction(second_password);

                                return;
                            } else {
                                insufficientError();
                            }
                        }, function() {
                            insufficientError();
                        });
                    } else {
                        insufficientError();
                    }

                    return;
                }

                if (self.selected_outputs.length == 0) {
                    self.error('No Available Outputs To Spend.');
                    return;
                }

                var sendTx = new Bitcoin.Transaction();

                this.sendTxInAmounts = [];
                for (var i = 0; i < self.selected_outputs.length; i++) {
                    var transactionInputDict = self.selected_outputs[i];
                    sendTx.addInput(transactionInputDict.outpoint.hash, transactionInputDict.outpoint.index);
                    this.sendTxInAmounts.push(transactionInputDict.outpoint.value);
                }

                this.sendTxOutAmounts = [];
                for (var i =0; i < self.to_addresses.length; ++i) {
                    var addrObj = self.to_addresses[i];
                    if (addrObj.m != null) {
                        sendTx.addOutputScript(Bitcoin.scripts.multisigOutput(addrObj.m, addrObj.pubkeys), parseInt(addrObj.value));
                        this.sendTxOutAmounts.push(addrObj.value);
                    } else {
                        sendTx.addOutput(addrObj.address, parseInt(addrObj.value));
                        this.sendTxOutAmounts.push(addrObj.value);
                    }

                    //If less than 0.01 BTC force fee
                    if (addrObj.value.compareTo(self.min_free_output_size) < 0) {
                        forceFee = true;
                    }
                }

                //Now deal with the change
                var	changeValue = availableValue.subtract(txValue);

                //Consume the change if it would create a very small none standard output
                //Perhaps this behaviour should be user specified                
                if (changeValue.compareTo(self.min_non_standard_output_size) > 0) {
                  if (self.change_address != null) //If change address speicified return to that
                        sendTx.addOutput(self.change_address, parseInt(changeValue));
                    else if (addresses_used.length > 0) { //Else return to a random from address if specified
                        sendTx.addOutput(Bitcoin.Address.fromBase58Check(addresses_used[Math.floor(Math.random() * addresses_used.length)]), parseInt(changeValue));
                    } else { //Otherwise return to random unarchived
                        sendTx.addOutput(Bitcoin.Address.fromBase58Check(MyWallet.getPreferredLegacyAddress()), parseInt(changeValue));
                    }
                    this.sendTxOutAmounts.push(changeValue);

                    //If less than 0.01 BTC force fee
                    if (changeValue.compareTo(self.min_free_output_size) < 0) {
                        forceFee = true;
                    }
                }

                //Now Add the public note
                /*

                 function makeArrayOf(value, length) {
                 var arr = [], i = length;
                 while (i--) {
                 arr[i] = value;
                 }
                 return arr;
                 }

                 if (self.note)  {
                 var bytes = stringToBytes('Message: ' + self.note);

                 var ibyte = 0;
                 while (true) {
                 var tbytes = bytes.splice(ibyte, ibyte+120);

                 if (tbytes.length == 0)
                 break;

                 //Must pad to at least 33 bytes
                 //Decode function should strip appending zeros
                 if (tbytes.length < 33) {
                 tbytes = tbytes.concat(makeArrayOf(0, 33-tbytes.length));
                 }

                 sendTx.addOutputScript(Bitcoin.Script.createPubKeyScript(tbytes), 0);
                 this.sendTxOutAmounts.push(0);

                 ibyte += 120;
                 }
                 }  */

                //Estimate scripot sig (Cannot use serialized tx size yet becuase we haven't signed the inputs)
                //18 bytes standard header
                //standard scriptPubKey 24 bytes
                //Stanard scriptSig 64 bytes
                var estimatedSize = sendTx.toHex().length/2 + (138 * sendTx.ins.length);

                priority /= estimatedSize;

                var kilobytes = Math.max(1, Math.ceil(parseFloat(estimatedSize / 1000)));

                var fee_is_zero = (!self.fee || self.fee.compareTo(self.base_fee) < 0);

                var set_fee_auto = function() {
                    //Forced Fee
                    self.fee = self.base_fee.multiply(Bitcoin.BigInteger.valueOf(kilobytes));

                    self.makeTransaction(second_password);
                }

                //Priority under 57 million requires a 0.0005 BTC transaction fee (see https://en.bitcoin.it/wiki/Transaction_fees)
                if (fee_is_zero && (forceFee || kilobytes > 1)) {
                    if (self.fee && self.did_specify_fee_manually) {
                        self.ask_to_increase_fee(function() {
                            set_fee_auto();
                        }, function() {
                            self.tx = sendTx;
                            self.determinePrivateKeys(function() {
                                self.signInputs();
                            }, second_password);
                        }, self.fee, self.base_fee.multiply(Bitcoin.BigInteger.valueOf(kilobytes)));
                    } else {
                        //Forced Fee
                        set_fee_auto();
                    }
                } else if (fee_is_zero && (MyWallet.getRecommendIncludeFee() || priority < 77600000)) {
                    self.ask_for_fee(function() {
                        set_fee_auto();
                    }, function() {
                        self.tx = sendTx;

                        self.determinePrivateKeys(function() {
                            self.signInputs();
                        }, second_password);
                    });
                } else {
                    self.tx = sendTx;
                    
                    self.determinePrivateKeys(function() {
                      self.signInputs();
                    }, second_password);
                }
            } catch (e) {
                this.error(e);
            }
        },
        ask_for_fee : function(yes, no) {
            yes();
        },
        ask_to_increase_fee : function(yes, no, customFee, recommendedFee) {
            yes();
        },
        insufficient_funds : function(amount_required, amount_available, yes, no) {
            no();
        },
        determinePrivateKeys: function(success, second_password) {
            var self = this;

            try {
                if (self.is_cancelled) {
                    throw 'Transaction Cancelled';
                }

                if (self.selected_outputs.length != self.tx.ins.length) {
                   throw 'Selected Outputs Count != Tx Inputs Length'
                }

                var tmp_cache = {};

                for (var i = 0; i < self.selected_outputs.length; ++i) {
                    var connected_script = self.selected_outputs[i].script;

                    if (connected_script == null) {
                        throw 'determinePrivateKeys() Connected script is null';
                    }

                    if (connected_script.priv_to_use == null) {
                        var inputAddress = Bitcoin.Address.fromOutputScript(connected_script).toString();

                        //Find the matching private key
                        if (tmp_cache[inputAddress]) {
                            connected_script.priv_to_use = tmp_cache[inputAddress];
                        } else if (self.extra_private_keys && self.extra_private_keys[inputAddress]) {
                            connected_script.priv_to_use = Bitcoin.base58.decode(self.extra_private_keys[inputAddress]);
                        } else if (MyWallet.legacyAddressExists(inputAddress) && !MyWallet.isWatchOnlyLegacyAddress(inputAddress)) {
                            try {
                                connected_script.priv_to_use = second_password == null ? MyWallet.getPrivateKey(inputAddress) : MyWallet.decryptSecretWithSecondPassword(MyWallet.getPrivateKey(inputAddress), second_password);
                            } catch (e) {
                                console.log(e);
                            }
                        }
                        if (connected_script.priv_to_use == null) {
                            self.error("No private key found!");
                            // //No private key found, ask the user to provide it
                            // self.ask_for_private_key(function (key) {
                            //
                            //     try {
                            //         if (inputAddress == MyWallet.getUnCompressedAddressString(key) || inputAddress == MyWallet.getCompressedAddressString(key)) {
                            //             self.extra_private_keys[inputAddress] = Bitcoin.Base58.encode(key.priv);
                            //
                            //             self.determinePrivateKeys(success); //Try Again
                            //         } else {
                            //             throw 'The private key you entered does not match the bitcoin address';
                            //         }
                            //     } catch (e) {
                            //         self.error(e);
                            //     }
                            // }, function(e) {
                            //     //User did not provide it, try and re-construct without it
                            //     //Remove the address from the from list
                            //     self.from_addresses = $.grep(self.from_addresses, function(v) {
                            //         return v != inputAddress;
                            //     });
                            //
                            //     //Remake the transaction without the address
                            //     self.makeTransaction();
                            //
                            // }, inputAddress);

                            return false;
                        } else {
                            //Performance optimization
                            //Only Decode the key once sand save it in a temporary cache
                            tmp_cache[inputAddress] = connected_script.priv_to_use;
                        }
                    }
                }

                success();
            } catch (e) {
                self.error(e);
            }
        },
        signWebWorker : function(success, _error) {
            var didError = false;
            var error = function(e) {
                if (!didError) { _error(e); didError = true; }
            }

            try {
                var self = this;
                var nSigned = 0;
                var nWorkers = Math.min(3, self.tx.ins.length);
                var rng = new SecureRandom();

                self.worker = [];
                for (var i = 0; i < nWorkers; ++i)  {
                    self.worker[i] =  new Worker(MyWallet.getWebWorkerLoadPrefix() + 'signer' + (min ? '.min.js' : '.js'));

                    self.worker[i].addEventListener('message', function(e) {
                        var data = e.data;

                        try {
                            switch (data.cmd) {
                                case 'on_sign':
                                    self.invoke('on_sign_progress', parseInt(data.outputN)+1);

                                    self.tx.ins[data.outputN].script = new Bitcoin.Script(data.script);

                                    ++nSigned;

                                    if (nSigned == self.tx.ins.length) {
                                        self.terminateWorkers();
                                        success();
                                    }

                                    break;
                                case 'on_message': {
                                    console.log(data.message);
                                    break;
                                }
                                case 'on_error': {
                                    throw data.e;
                                }
                            };
                        } catch (e) {
                            self.terminateWorkers();
                            error(e);
                        }
                    }, false);

                    self.worker[i].addEventListener('error', function(e) {
                        error(e);
                    });

                    self.worker[i].postMessage({cmd : 'load_resource' , path : MyWallet.getWebWorkerLoadPrefix() + 'bitcoinjs' + (min ? '.min.js' : '.js')});

                    //Generate and pass seed to the webworker
                    var seed = new Array(32);

                    rng.nextBytes(seed);

                    self.worker[i].postMessage({cmd : 'seed', seed : Crypto.util.bytesToHex(seed)});
                }

                for (var outputN = 0; outputN < self.selected_outputs.length; ++ outputN) {
                    var connected_script = self.selected_outputs[outputN].script;

                    if (connected_script == null) {
                       throw 'signWebWorker() Connected Script Is Null';
                    }

                    self.worker[outputN % nWorkers].postMessage({cmd : 'sign_input', tx : self.tx, outputN : outputN, priv_to_use : connected_script.priv_to_use, connected_script : connected_script});
                }
            } catch (e) {
                error(e);
            }
        },
        signNormal : function(success, error) {
            var self = this;
            var outputN = 0;

            var signOne = function() {
                setTimeout(function() {
                    if (self.is_cancelled) {
                        error();
                        return;
                    }

                    try {
                        self.invoke('on_sign_progress', outputN+1);

                        var connected_script = self.selected_outputs[outputN].script;

                        if (connected_script == null) {
                            throw 'signNormal() Connected Script Is Null';
                        }

                        var signed_script = signInput(self.tx, outputN, connected_script.priv_to_use, connected_script);

                        if (signed_script) {
                            self.tx.ins[outputN].script = signed_script;

                            outputN++;

                            if (outputN == self.tx.ins.length) {
                                success();
                            } else {
                                signOne(); //Sign The Next One
                            }
                        } else {
                            throw 'Unknown error signing transaction';
                        }
                    } catch (e) {
                        error(e);
                    }

                }, 1);
            };

            signOne();
        },
        signInputs : function() {
            var self = this;

            try {
                self.invoke('on_begin_signing');

                var success = function() {
                    self.invoke('on_finish_signing');

                    self.is_ready = true;
                    self.ask_to_send();
                };

                self.signWebWorker(success, function(e) {
                    console.log(e);

                    self.signNormal(success, function(e){
                        self.error(e);
                    });
                });
            } catch (e) {
                self.error(e);
            }
        },
        terminateWorkers : function() {
            if (this.worker) {
                for (var i = 0; i < this.worker.length; ++i)  {
                    try {
                        this.worker[i].terminate();
                    } catch (e) { }
                }
            }
        },
        cancel : function() {
            if (!this.has_pushed) {
                this.terminateWorkers();
                this.error('Transaction Cancelled');
            }
        },
        send : function() {
            var self = this;

            if (self.is_cancelled) {
                self.error('This transaction has already been cancelled');
                return;
            }

            if (!self.is_ready) {
                self.error('Transaction is not ready to send yet');
                return;
            }

            self.invoke('on_before_send');

            if (self.generated_addresses.length > 0) {
                self.has_saved_addresses = true;

                MyWallet.backupWallet('update', function() {
                    self.pushTx();
                }, function() {
                    self.error('Error Backing Up Wallet. Cannot Save Newly Generated Keys.')
                });
            } else {
                self.pushTx();
            }
        },
        pushTx : function() {
            var self = this;

            if (self.is_cancelled) //Only call once
                return;

            self.has_pushed = true;

            BlockchainAPI.push_tx(self.tx, self.note, function(response) {
                self.success(response);
            }, function(response) {
                self.error(response);
            });
        },
        ask_for_private_key : function(success, error) {
            error('Cannot ask for private key without user interaction disabled');
        },
        ask_to_send : function() {
            this.send(); //By Default Just Send
        },
        error : function(error) {
            if (this.is_cancelled) //Only call once
                return;

            this.is_cancelled = true;

            if (!this.has_pushed && this.generated_addresses.length > 0) {
                //When an error occurs during send (or user cancelled) we need to remove the addresses we generated
                for (var i = 0; i < this.generated_addresses.length; ++i) {
                    MyWallet.deleteLegacyAddress(this.generated_addresses[i]);
                }

                if (this.has_saved_addresses)
                    MyWallet.backupWallet();
            }

            this.invoke('on_error', error);
        },
        success : function() {
            this.invoke('on_success');
        }
    };

    pending_transaction.addListener({
        on_error : function(e) {
            console.log(e);
        },
        on_begin_signing : function() {
            this.start = new Date().getTime();
        },
        on_finish_signing : function() {
            console.log('Signing Took ' + (new Date().getTime() - this.start) + 'ms');
        }
    });

    return pending_transaction;
}
