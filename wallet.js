function valueToBigInt(valueBuffer) {
    if (valueBuffer instanceof Bitcoin.BigInteger) return valueBuffer;

    // Prepend zero byte to prevent interpretation as negative integer
    //return Bitcoin.BigInteger.fromByteArrayUnsigned(valueBuffer);
    return new Bitcoin.BigInteger.fromByteArrayUnsigned(valueBuffer);
}

function formatValueBitcoin(valueBuffer) {
    var value = valueToBigInt(valueBuffer).toString();
    var integerPart = value.length > 8 ? value.substr(0, value.length-8) : '0';
    var decimalPart = value.length > 8 ? value.substr(value.length-8) : value;
    while (decimalPart.length < 8) decimalPart = "0"+decimalPart;
    decimalPart = decimalPart.replace(/0*$/, '');
    while (decimalPart.length < 2) decimalPart += "0";
    return integerPart+"."+decimalPart;
}

function parseValueBitcoin(valueString) {
    var valueString = valueString.toString();
    // TODO: Detect other number formats (e.g. comma as decimal separator)
    var valueComp = valueString.split('.');
    var integralPart = valueComp[0];
    var fractionalPart = valueComp[1] || "0";
    while (fractionalPart.length < 8) fractionalPart += "0";
    fractionalPart = fractionalPart.replace(/^0+/g, '');
    var value = Bitcoin.BigInteger.valueOf(parseInt(integralPart));
    value = value.multiply(Bitcoin.BigInteger.valueOf(100000000));
    value = value.add(Bitcoin.BigInteger.valueOf(parseInt(fractionalPart)));
    return value;
}

//------
//Should find somewhere else for these
//user precision (e.g. BTC or mBTC) to satoshi big int
function precisionToSatoshiBN(x) {
    return parseValueBitcoin(x).divide(Bitcoin.BigInteger.valueOf(Math.pow(10, sShift(symbol_btc)).toString()));
}

//user precision (e.g. 0.02 BTC or 0.02 mBTC) to BTC decimal
function precisionToBTC(x) {
    return formatValueBitcoin(precisionToSatoshiBN(x));
}

//Satoshi BN to precision decimal
function precisionFromSatoshi(x) {
    return formatValueBitcoin(x.multiply(Bitcoin.BigInteger.valueOf(Math.pow(10, sShift(symbol_btc)))));
}

//BTC decimal to user precision (e.g. BdeleteAddressTC or mBTC)
function precisionFromBTC(x) {
    return precisionFromSatoshi(parseValueBitcoin(x));
}

//user precision to display string
function formatPrecision(x) {
    return formatBTC(precisionToSatoshiBN(x).toString());
}
//-----

var MyWallet = new function() {
    var MyWallet = this;

    this.skip_init = false; //Set on sign up page
    var demo_guid = 'abcaa314-6f67-6705-b384-5d47fbe9d7cc';
    var encrypted_wallet_data; //Encrypted wallet data (Base64, AES 256)
    var guid; //Wallet identifier
    var cVisible; //currently visible view
    var password; //Password
    var dpassword; //double encryption Password
    var dpasswordhash; //double encryption Password
    var sharedKey; //Shared key used to prove that the wallet has succesfully been decrypted, meaning you can't overwrite a wallet backup even if you have the guid
    var final_balance = 0; //Final Satoshi wallet balance
    var total_sent = 0; //Total Satoshi sent
    var total_received = 0; //Total Satoshi received
    var n_tx = 0; //Number of transactions
    var n_tx_filtered = 0; //Number of transactions after filtering
    var latest_block; //Chain head block
    var address_book = {}; //Holds the address book addr = label
    var transactions = []; //List of all transactions (initially populated from /multiaddr updated through websockets)
    var double_encryption = false; //If wallet has a second password
    var tx_page = 0; //Multi-address page
    var tx_filter = 0; //Transaction filter (e.g. Sent Received etc)
    var maxAddr = 1000; //Maximum number of addresses
    var addresses = {}; //{addr : address, priv : private key, tag : tag (mark as archived), label : label, balance : balance}
    var payload_checksum; //SHA256 hash of the current wallet.aes.json
    var archTimer; //Delayed Backup wallet timer
    var mixer_fee = 0.5; //Default mixer fee 1.5%
    var recommend_include_fee = true; //Number of unconfirmed transactions in blockchain.info's memory pool
    var default_pbkdf2_iterations = 10; //Not ideal, but limitations of using javascript
    var main_pbkdf2_iterations = default_pbkdf2_iterations; //The number of pbkdf2 iterations used for the main password
    var tx_notes = {}; //A map of transaction notes, hash -> note
    var auth_type; //The two factor authentication type used. 0 for none.
    var real_auth_type = 0; //The real two factor authentication. Even if there is a problem with the current one (for example error 2FA sending email).
    var logout_timeout; //setTimeout return value for the automatic logout
    var event_listeners = []; //Emits Did decrypt wallet event (used on claim page)
    var monitor_listeners = []; //success, errors, notices
    var last_input_main_password; //The time the last password was entered
    var main_password_timeout = 60000;
    var isInitialized = false;
    var language = 'en'; //Current language
    var supported_encryption_version = 2.0;  //The maxmimum supported encryption version
    var encryption_version_used = 0.0; //The encryption version of the current wallet. Set by decryptWallet()
    var serverTimeOffset = 0; //Difference between server and client time
    var haveSetServerTime = false; //Whether or not we have synced with server time
    var sharedcoin_endpoint; //The URL to the sharedcoin node
    var disable_logout = false;
    var haveBoundReady = false;
    var isRestoringWallet = false;
    var sync_pubkeys = false;

    var BigInteger = Bitcoin.BigInteger;
    var ECKey = Bitcoin.ECKey;
    var buffer = Bitcoin.Buffer;

    var myHDWallet = null;
    var isSynchronizedWithServer = true;
    var localWalletJsonString = null;
    var haveBuildHDWallet = false;


    var wallet_options = {
        pbkdf2_iterations : default_pbkdf2_iterations, //Number of pbkdf2 iterations to default to for second password and dpasswordhash
        fee_policy : 0,  //Default Fee policy (-1 Tight, 0 Normal, 1 High)
        html5_notifications : false, //HTML 5 Desktop notifications
        logout_time : 600000, //Default 10 minutes
        tx_display : 0, //Compact or detailed transactions
        always_keep_local_backup : false, //Whether to always keep a backup in localStorage regardless of two factor authentication
        transactions_per_page : 30, //Number of transactions per page
        additional_seeds : []
    };

    this.setEncryptedWalletData = function(data) {
        if (!data || data.length == 0) {
            encrypted_wallet_data = null;
            payload_checksum = null;
            return;
        }

        encrypted_wallet_data = data;

        //Generate a new Checksum
        payload_checksum = generatePayloadChecksum();

        try {
            //Save Payload when two factor authentication is disabled
            if (real_auth_type == 0 || wallet_options.always_keep_local_backup)
                MyStore.put('payload', encrypted_wallet_data);
            else
                MyStore.remove('payload');
        } catch (e) {
            console.log(e);
        }
    }


    this.isSynchronizedWithServer = function() {
        return isSynchronizedWithServer;
    }

    this.setRealAuthType = function(val) {
        real_auth_type = val;
    }

    this.addAdditionalSeeds = function(val) {
        wallet_options.additional_seeds.push(val);
    }

    this.getAdditionalSeeds = function(val) {
        return wallet_options.additional_seeds;
    }

    this.getLanguage = function() {
        return language;
    }

    this.setLanguage = function(_language) {
        MyStore.put('language', _language);
        language = _language;
    }

    this.addEventListener = function(func) {
        event_listeners.push(func);
    }

    this.sendEvent = function(event_name, obj) {
        for (var listener in event_listeners) {
            event_listeners[listener](event_name, obj)
        }
    }

    this.monitor = function(func) {
        monitor_listeners.push(func);
    }

    this.sendMonitorEvent = function(obj) {
        for (var listener in monitor_listeners) {
            monitor_listeners[listener](obj)
        }
    }

    this.getLogoutTime = function() {
        return wallet_options.logout_time;
    }

    this.getSecondPasswordPbkdf2Iterations = function() {
        return wallet_options.pbkdf2_iterations;
    }

    this.getMainPasswordPbkdf2Iterations = function() {
        return main_pbkdf2_iterations;
    }

    this.getDefaultPbkdf2Iterations = function() {
        return default_pbkdf2_iterations;
    }

    this.getSharedKey = function() {
        return sharedKey;
    }

    this.getSharedcoinEndpoint = function() {
        return sharedcoin_endpoint;
    }

    this.disableLogout = function(value) {
        disable_logout = value;
    }

    this.getFinalBalance = function() {
        return final_balance;
    }

    this.getTotalSent = function() {
        return total_sent;
    }

    this.getTotalReceived = function() {
        return total_received;
    }

    this.setLogoutTime = function(logout_time) {
        wallet_options.logout_time = logout_time;

        clearInterval(logout_timeout);

        logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
    }

    this.getDoubleEncryption = function() {
        return double_encryption;
    }

    this.getEncryptedWalletData = function() {
        return encrypted_wallet_data;
    }

    this.getFeePolicy = function() {
        return wallet_options.fee_policy;
    }

    this.setFeePolicy = function(policy) {
        wallet_options.fee_policy = parseInt(policy);
    }

    this.setAlwaysKeepLocalBackup = function(val) {
        wallet_options.always_keep_local_backup = val;
    }

    this.getAlwaysKeepLocalBackup = function() {
        return wallet_options.always_keep_local_backup;
    }

    this.setNTransactionsPerPage = function(val) {
        wallet_options.transactions_per_page = val;
    }

    this.getNTransactionsPerPage = function() {
        return wallet_options.transactions_per_page;
    }

    this.getGuid = function() {
        return guid;
    }

    this.getHTML5Notifications = function() {
        return wallet_options.html5_notifications;
    }

    this.setHTML5Notifications = function(val) {
        wallet_options.html5_notifications = val;
    }

    this.getNTransactions = function() {
        return n_tx;
    }

    this.getTransactions = function() {
        return transactions;
    }
    
    this.parseTransaction = function(transaction) {
        return parseTransaction(transaction);
    }

    this.addressExists = function(address) {
        return addresses[address] != null;
    }

    this.getAddressTag = function(address) {
        return addresses[address].tag;
    }

    this.setAddressTag = function(address, tag) {
        addresses[address].tag = tag;
    }

    this.getAddressBook = function() {
        return address_book;
    }

    this.getAddressLabel = function(address) {
        if (addresses[address])
            return addresses[address].label;
        else
            return null;
    }

    this.setAddressLabel = function(address, label) {
        addresses[address].label = label;
    }

    this.setAddressBalance = function(address, balance) {
        addresses[address].balance = balance;
    }

    this.getAddressBookLabel = function(address) {
        return address_book[address];
    }

    this.isWatchOnly = function(address) {
        return !addresses[address] || addresses[address].priv == null;
    }

    this.getAddressBalance = function(address) {
        return addresses[address].balance;
    }

    this.getMixerFee = function() {
        return mixer_fee;
    }

    this.getRecommendIncludeFee = function() {
        return recommend_include_fee;
    }

    this.deleteAddress = function(addr) {
        delete addresses[addr];
    }

    this.addAddressBookEntry = function(addr, label) {
        address_book[addr] = label;
    }

    //TODO Depreciate this. Need to restructure signer.js
    this.getPrivateKey = function(address) {
        return addresses[address].priv;
    }

    this.setLabel = function(address, label) {
        addresses[address].label = label;

        MyWallet.backupWalletDelayed();

        buildVisibleView();
    }

    this.securePost = function(url, data, success, error) {
        var clone = jQuery.extend({}, data);

        if (!data.sharedKey) {
            if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
                throw 'Shared key is invalid';
            }

            //Rather than sending the shared key plain text
            //send a hash using a totp scheme
            var now = new Date().getTime();
            var timestamp = parseInt((now - serverTimeOffset) / 10000);

            var SKHashHex = Crypto.SHA256(sharedKey.toLowerCase() + timestamp);

            var i = 0;
            var tSKUID = SKHashHex.substring(i, i+=8)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=12);

            clone.sharedKey = tSKUID;
            clone.sKTimestamp = timestamp;
            clone.sKDebugHexHash = SKHashHex;
            clone.sKDebugTimeOffset = serverTimeOffset;
            clone.sKDebugOriginalClientTime = now;
            clone.sKDebugOriginalSharedKey = sharedKey; //Debugging only needs removing ASAP
        }

        if (!data.guid)
            clone.guid = guid;

        clone.format =  data.format ? data.format : 'plain'

        var dataType = 'text';
        if (data.format == 'json')
            dataType = 'json';

        $.ajax({
            dataType: dataType,
            type: "POST",
            timeout: 60000,
            url: root + url,
            data : clone,
            success: success,
            error : error
        });
    }

    this.isCorrectMainPassword = function(_password) {
        return password == _password;
    }

    function hashPassword(password, iterations) {
        //N rounds of SHA 256
        var round_data = Crypto.SHA256(password, {asBytes: true});
        for (var i = 1; i < iterations; ++i) {
            round_data = Crypto.SHA256(round_data, {asBytes: true});
        }
        return Crypto.util.bytesToHex(round_data);
    }

    this.setPbkdf2Iterations = function(pbkdf2_iterations, success) {
        var panic = function(e) {
            console.log('Panic ' + e);

            //If we caught an exception here the wallet could be in a inconsistent state
            //We probably haven't synced it, so no harm done
            //But for now panic!
            window.location.reload();
        };

        MyWallet.getSecondPassword(function() {
            try {
                //If double encryption is enabled we need to rencrypt all keys
                if (double_encryption) {
                    //Rencrypt all keys
                    for (var key in addresses) {
                        var addr = addresses[key];

                        if (addr.priv) {
                            addr.priv = MyWallet.encrypt(MyWallet.decryptPK(addr.priv), sharedKey + dpassword, pbkdf2_iterations);

                            if (!addr.priv) throw 'addr.priv is null';
                        }
                    }

                    //Set the second password iterations
                    wallet_options.pbkdf2_iterations = pbkdf2_iterations;

                    //Generate a new password hash
                    dpasswordhash = hashPassword(sharedKey + dpassword, pbkdf2_iterations);
                }

                //Must use new encryption format
                encryption_version_used = 2.0;

                //Set the main password pbkdf2 iterations
                main_pbkdf2_iterations = pbkdf2_iterations;

                MyWallet.backupWallet('update', function() {
                    success();
                }, function() {
                    panic(e);
                });

            } catch (e) {
                panic(e);
            }
        }, function (e) {
            panic(e);
        });
    }

    this.setDoubleEncryption = function(value, tpassword, success) {
        var panic = function(e) {
            console.log('Panic ' + e);

            //If we caught an exception here the wallet could be in a inconsistent state
            //We probably haven't synced it, so no harm done
            //But for now panic!
            window.location.reload();
        };

        try {
            if (double_encryption == value)
                return;

            if (value) {
                //Ask the use again before we backup
                MyWallet.getSecondPassword(function() {
                    try {
                        double_encryption = true;
                        dpassword = tpassword;

                        for (var key in addresses) {
                            var addr = addresses[key];

                            if (addr.priv) {
                                addr.priv = encodePK(new BigInteger(Bitcoin.base58.decode(addr.priv)));

                                if (!addr.priv) throw 'addr.priv is null';
                            }
                        }

                        dpasswordhash = hashPassword(sharedKey + dpassword, wallet_options.pbkdf2_iterations);

                        //Clear the password to force the user to login again
                        //Incase they have forgotten their password already
                        dpassword = null;

                        MyWallet.getSecondPassword(function() {
                            try {
                                MyWallet.checkAllKeys();

                                MyWallet.backupWallet('update', function() {
                                    success();
                                }, function() {
                                    panic(e);
                                });
                            } catch(e) {
                                panic(e);
                            }
                        }, function(e) {
                            panic(e);
                        });
                    } catch(e) {
                        panic(e);
                    }
                }, function (e) {
                    panic(e);
                });
            } else {
                MyWallet.getSecondPassword(function() {
                    try {
                        for (var key in addresses) {

                            var addr = addresses[key];

                            if (addr.priv) {
                                addr.priv = MyWallet.decryptPK(addr.priv);

                                if (!addr.priv) throw 'addr.priv is null';
                            }
                        }

                        double_encryption = false;

                        dpassword = null;

                        MyWallet.checkAllKeys();

                        MyWallet.backupWallet('update', function() {
                            success();
                        }, function() {
                            panic(e);
                        });
                    } catch (e) {
                        panic(e);
                    }
                }, function(e) {
                    panic(e);
                });
            }
        } catch (e) {
            panic(e);
        }
    }

    this.unArchiveAddr = function(addr) {
        var addr = addresses[addr];
        if (addr.tag == 2) {
            addr.tag = null;

            buildVisibleView();

            MyWallet.backupWalletDelayed('update', function() {
                MyWallet.get_history();
            });
        } else {
            MyWallet.makeNotice('error', 'add-error', 'Cannot Unarchive This Address');
        }
    }

    this.archiveAddr = function(addr) {
        if (MyWallet.getActiveAddresses().length <= 1) {
            MyWallet.makeNotice('error', 'add-error', 'You must leave at least one active address');
            return;
        }

        var addr = addresses[addr];
        if (addr.tag == null || addr.tag == 0) {
            addr.tag = 2;

            buildVisibleView();

            MyWallet.backupWalletDelayed('update', function() {
                MyWallet.get_history();
            });

        } else {
            MyWallet.makeNotice('error', 'add-error', 'Cannot Archive This Address');
        }
    }
    this.addWatchOnlyAddress = function(address) {
        return internalAddKey(address);
    }

    //temperary workaround instead instead of modding bitcoinjs to do it TODO: not efficient
    this.getCompressedAddressString = function(key) {
        return new ECKey(key.d, true).pub.getAddress().toString();
    }
    this.getUnCompressedAddressString = function(key) {
        return new ECKey(key.d, false).pub.getAddress().toString();
    }
    this.getCompressedPubKey = function(key) {
        return new ECKey(key.d, true).pub;
    }
    this.getUncompressedPubKey = function(key) {
        return new ECKey(key.d, false).pub;
    }
    this.getCompressedKey = function(key) {
        return new ECKey(key.d, true);
    }
    this.getUnCompressedAddressString = function(key) {
        return new ECKey(key.d, false).pub.getAddress().toString();
    }

    this.extractAddresses = function(script, addresses) {
        switch (Bitcoin.scripts.classifyOutput(script)) {
        case 'pubkeyhash':
            addresses.push(Bitcoin.Address.fromOutputScript(script));
            return 1;
        case 'pubkey':
            addresses.push(new Bitcoin.Address(Bitcoin.crypto.hash160(script.chunks[0]), Bitcoin.networks.bitcoin.pubKeyHash));
            return 1;
        case 'scripthash':
            //if script output is to a multisig address, classifyOutput will return scripthash
            addresses.push(Bitcoin.Address.fromOutputScript(script));
            return 1;
        case 'multisig':
            for (var i = 1; i < script.chunks.length-2; ++i) {
                addresses.push(new Bitcoin.Address(Bitcoin.crypto.hash160(script.chunks[i]), Bitcoin.networks.bitcoin.pubKeyHash));
            }
            return script.chunks[0] - Bitcoin.opcodes.OP_1 + 1;
        default:
            throw 'Encountered non-standard scriptPubKey';
        }
    }

    this.simpleInPubKeyHash = function(script) {
        switch (Bitcoin.scripts.classifyInput(script)) {
        case 'pubkeyhash':
            return Bitcoin.crypto.hash160(script.chunks[1]);
        case 'pubkey':
          throw new Error("Script does not contain pubkey.");
        default:
          throw new Error("Encountered non-standard scriptSig");
        }
    }

    //opts = {compressed, app_name, app_version, created_time}
    this.addPrivateKey = function(key, opts) {
        if (walletIsFull()) {
            throw 'Wallet is full.';
        }

        if (key == null) {
            throw 'Cannot add null key.';
        }

        if (opts == null)
            opts = {};

        var addr = opts.compressed ? MyWallet.getCompressedAddressString(key) : MyWallet.getUnCompressedAddressString(key);

        var encoded = encodePK(key.d);

        if (encoded == null)
            throw 'Error Encoding key';

        var decoded_key = new ECKey(new BigInteger.fromBuffer(MyWallet.decodePK(encoded)), opts.compressed);

        if (addr != MyWallet.getUnCompressedAddressString(key) && addr != MyWallet.getCompressedAddressString(key)) {
            throw 'Decoded Key address does not match generated address';
        }

        if (internalAddKey(addr, encoded)) {
            addresses[addr].tag = 1; //Mark as unsynced
            addresses[addr].created_time = opts.created_time ? opts.created_time : 0; //Stamp With Creation time
            addresses[addr].created_device_name = opts.app_name ? opts.app_name : APP_NAME; //Created Device
            addresses[addr].created_device_version = opts.app_version ? opts.app_version : APP_VERSION; //Created App Version

            if (addresses[addr].priv != encoded)
                throw 'Address priv does not match encoded';

            //Subscribe to transaction updates through websockets
            try {
                ws.send('{"op":"addr_sub", "addr":"'+addr+'"}');
            } catch (e) { }
        } else {
            throw 'Unable to add generated private key.';
        }

        return addr;
    }

    this.generateNewKey = function(_password) {
        var key = Bitcoin.ECKey.makeRandom(false);

        // key is uncompressed, so cannot passed in opts.compressed = true here
        if (MyWallet.addPrivateKey(key)) {
            return key;
        }
    }

    this.setLoadingText = function(txt) {
        $('.loading-text').text(txt);
    }

    function hidePopovers() {
        try {
            $('.popover').remove();
        } catch (e) {}
    }

    $(window).resize(function() {
        $('.modal:visible').center();

        hidePopovers();
    });

    function bindTx(tx_tr, tx) {
        tx_tr.click(function(){
            openTransactionSummaryModal(tx.txIndex, tx.result);
        });

        tx_tr.find('.show-note').unbind('mouseover').mouseover(function() {
            var note = tx.note ? tx.note : tx_notes[tx.hash];
            showNotePopover(this, note, tx.hash);
        });

        tx_tr.find('.add-note').unbind('mouseover').mouseover(function() {
            addNotePopover(this, tx.hash);
        });

        return tx_tr;
    }

    function calcTxResult(tx, is_new) {
        /* Calculate the result */
        var result = 0;
        for (var i = 0; i < tx.inputs.length; ++i) {
            var output = tx.inputs[i].prev_out;

            if (!output || !output.addr)
                continue;

            //If it is our address then subtract the value
            var addr = addresses[output.addr];
            if (addr) {
                var value = parseInt(output.value);

                result -= value;

                if (is_new) {
                    total_sent += value;
                    addr.balance -= value;
                }
            }

            for (var i in myHDWallet.getAccounts()) {
                var account = myHDWallet.getAccount(i);
                if (account.isAddressPartOfAccount(output.addr)) {
                    if (tx.account_indexes.indexOf(i) < 0) {
                        tx.account_indexes.push(parseInt(i));
                   }
                }
            }

        }

        for (var ii = 0; ii < tx.out.length; ++ii) {
            var output = tx.out[ii];

            if (!output || !output.addr)
                continue;

            var addr = addresses[output.addr];
            if (addr) {
                var value = parseInt(output.value);

                result += value;

                if (is_new) {
                    total_received += value;
                    addr.balance += value;
                }
            }

            for (var i in myHDWallet.getAccounts()) {
                var account = myHDWallet.getAccount(i);
                if (account.isAddressPartOfAccount(output.addr)) {
                    if (tx.account_indexes.indexOf(i) < 0) {
                        tx.account_indexes.push(parseInt(i));
                    }
                }

                MyWallet.checkToAddTxToPaymentRequestForAccount(account, output.addr, tx.hash, output.value);
            }

        }
        return result;
    }

    function generatePayloadChecksum() {
        return Crypto.util.bytesToHex(Crypto.SHA256(encrypted_wallet_data, {asBytes: true}));
    }

    function wsSuccess(ws) {
        var last_on_change = null;

        ws.onmessage = function(e) {

            try {
                var obj = $.parseJSON(e.data);

                if (obj.op == 'on_change') {
                    var old_checksum = generatePayloadChecksum();
                    var new_checksum = obj.checksum;

                    console.log('On change old ' + old_checksum + ' ==  new '+ new_checksum);

                    if (last_on_change != new_checksum && old_checksum != new_checksum) {
                        last_on_change = new_checksum;

                        MyWallet.getWallet();
                    }

                } else if (obj.op == 'utx') {
                    var tx = TransactionFromJSON(obj.x);

                    //Check if this is a duplicate
                    //Maybe should have a map_prev to check for possible double spends
                    for (var key in transactions) {
                        if (transactions[key].txIndex == tx.txIndex)
                            return;
                    }

                    var result = calcTxResult(tx, true);

                    tx.result = result;

                    final_balance += result;

                    n_tx++;

                    tx.setConfirmations(0);

                    for (var i = 0; i <  tx.account_indexes.length; i++) {
                        MyWallet.asyncGetAndSetUnspentOutputsForAccount(tx.account_indexes[i]);
                    }

                    transactions.push(tx);

                    playSound('beep');

                    MyWallet.sendEvent('on_tx');

                }  else if (obj.op == 'block') {
                    //Check any transactions included in this block, if the match one our ours then set the block index
                    for (var i = 0; i < obj.x.txIndexes.length; ++i) {
                        for (var ii = 0; ii < transactions.length; ++ii) {
                            if (transactions[ii].txIndex == obj.x.txIndexes[i]) {
                                if (transactions[ii].blockHeight == null || transactions[ii].blockHeight == 0) {
                                    transactions[ii].blockHeight = obj.x.height;
                                    break;
                                }
                            }
                        }
                    }

                    setLatestBlock(BlockFromJSON(obj.x));

                    MyWallet.sendEvent('on_block');
                }

            } catch(e) {
                console.log(e);

                console.log(e.data);
            }
        };

        ws.onopen = function() {
            MyWallet.sendEvent('ws_on_open');

            var msg = '{"op":"blocks_sub"}';

            if (guid != null)
                msg += '{"op":"wallet_sub","guid":"'+guid+'"}';

            try {
                var addrs = MyWallet.getActiveAddresses();
                for (var key in addrs) {
                    //msg += '{"op":"addr_sub", "addr":"'+ addrs[key] +'"}'; //Subscribe to transactions updates through websockets
                }
                MyWallet.listenToHDWalletAccounts();
            } catch (e) {
                alert(e);
            }

            ws.send(msg);
        };

        ws.onclose = function() {
            MyWallet.sendEvent('ws_on_close');

        };
    }

    var logout_status = 'ok';
    function setLogoutImageStatus(_status) {
        var logout_btn = $('#logout');

        if (_status == 'loading_start') {
            logout_btn.attr('src', resource + 'logout-orange.png');
            return;
        } else if (_status != 'loading_stop') {
            logout_status = _status;
        }

        if (logout_status == 'ok')
            logout_btn.attr('src', resource + 'logout.png');
        else if (logout_status == 'error')
            logout_btn.attr('src', resource + 'logout-red.png');
    }

    this.showNotification = function(options, timeout) {
        try {
            var notification;

            if (window.webkitNotifications && webkitNotifications.checkPermission() == 0) {
                notification = webkitNotifications.createNotification(options.iconUrl, options.title, options.body);

                notification.show();
            } else if (window.Notification && window.Notification.permissionLevel() == 'granted') {
                notification = new window.Notification(options.title, options).show();
            }

            if (notification) {
                setTimeout(function() {
                    notification.cancel();
                }, timeout ? timeout : 5000);
            }
        } catch (e) { }
    };

    this.makeNotice = function(type, id, msg, timeout) {

        if (msg == null || msg.length == 0)
            return;

        console.log(msg);

        var el = $('<div class="alert alert-block alert-'+type+'"></div>');

        el.text(''+msg);

        if ($('#'+id).length > 0) {
            el.attr('id', id);
            return;
        }

        $("#notices").append(el).hide().fadeIn(200);

        (function() {
            var tel = el;

            setTimeout(function() {
                tel.fadeOut(250, function() {
                    $(this).remove();
                });
            }, timeout ? timeout : 5000);
        })();
    }

    this.pkBytesToSipa = function(bytes, addr) {
        var bytesBigInt = new BigInteger.fromBuffer(bytes);
        var eckey = new ECKey(bytesBigInt, false);

        bytes = bytesBigInt.toByteArray();

        while (bytes.length < 32) bytes.unshift(0);

        bytes.unshift(0x80); // prepend 0x80 byte

        if (MyWallet.getUnCompressedAddressString(eckey) == addr) {
        } else if (MyWallet.getCompressedAddressString(eckey) == addr) {
            bytes.push(0x01);    // append 0x01 byte for compressed format
        } else {
            throw 'Private Key does not match bitcoin address' + addr;
        }

        var checksum = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), { asBytes: true });

        bytes = bytes.concat(checksum.slice(0, 4));

        var privWif = Bitcoin.base58.encode(new buffer.Buffer(bytes));

        return privWif;
    }

    function noConvert(x) { return x; }
    function base58ToBase58(x) { return MyWallet.decryptPK(x); }
    function base58ToBase64(x) { var bytes = MyWallet.decodePK(x); return Crypto.util.bytesToBase64(bytes); }
    function base58ToHex(x) { var bytes = MyWallet.decodePK(x); return Crypto.util.bytesToHex(bytes); }
    this.base58ToSipa = function(x, addr) {
        return MyWallet.pkBytesToSipa(MyWallet.decodePK(x), addr);
    }


    this.getLabelForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).getLabel();
    }

    this.setLabelForAccount = function(accountIdx, label) {
        myHDWallet.getAccount(accountIdx).setLabel(label);
        MyWallet.backupWalletDelayed();
    }

    this.isArchivedForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).isArchived();
    }

    this.setIsArchivedForAccount = function(accountIdx, isArchived) {
        myHDWallet.getAccount(accountIdx).setIsArchived(isArchived);
        MyWallet.backupWalletDelayed('update', function() {
            MyWallet.get_history();
        });
    }

    this.getAddressesForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).getAddresses();
    }

    this.getChangeAddressesForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).getChangeAddresses();
    }

    this.getBalanceForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).getBalance();
    }

    this.getPaymentRequestsForAccount = function(accountIdx) {
        return myHDWallet.getAccount(accountIdx).getPaymentRequests();
    }

    this.generatePaymentRequestForAccount = function(accountIdx, amount) {
        var paymentRequest = myHDWallet.getAccount(accountIdx).generatePaymentRequest(amount);
        MyWallet.backupWalletDelayed();
        try {
            ws.send('{"op":"addr_sub", "addr":"'+paymentRequest.address+'"}');
        } catch (e) { }
        return paymentRequest
    }

    this.updatePaymentRequestForAccount = function(accountIdx, address, amount) {
        var account = myHDWallet.getAccount(accountIdx);
        var success = account.updatePaymentRequest(address, amount);

        if (success) {
            MyWallet.backupWalletDelayed();
        }
        return success;
    }

    this.acceptPaymentRequestForAccount = function(accountIdx, address) {
        var success = myHDWallet.getAccount(accountIdx).acceptPaymentRequest(address);
        if (success) {
            MyWallet.backupWalletDelayed();
        }
        return success;
    }

    this.checkToAddTxToPaymentRequestForAccount = function(account, address, txHash, amount) {
        var haveAddedTxToPaymentRequest = account.checkToAddTxToPaymentRequest( address, txHash, amount);
        if (haveAddedTxToPaymentRequest) {
            MyWallet.backupWalletDelayed();
        }
    }

    this.cancelPaymentRequestForAccount = function(accountIdx, address) {
        var success = myHDWallet.getAccount(accountIdx).cancelPaymentRequest(address);
        if (success) {
            MyWallet.backupWalletDelayed();
        }
        return success;
    }

    this.getTransactionsForAccount = function(accountIdx) {
        return myHDWallet.filterTransactionsForAccount(accountIdx, MyWallet.getTransactions());
    }

    this.asyncGetAndSetUnspentOutputsForAccount = function(accountIdx, successCallback, errorCallback) {
        var account = myHDWallet.getAccount(accountIdx);
        var addresses = account.getAddresses();
        addresses = addresses.concat(account.getChangeAddresses());

        BlockchainAPI.get_unspent(addresses, function (obj) {

            obj.unspent_outputs.forEach(function(utxo) {
                var txBuffer = new Bitcoin.Buffer.Buffer(utxo.tx_hash, "hex");
                Array.prototype.reverse.call(txBuffer)
                utxo.hash = txBuffer.toString("hex");
                utxo.index = utxo.tx_output_n;
                var script = Bitcoin.Script.fromHex(utxo.script);
                utxo.address = Bitcoin.Address.fromOutputScript(script).toString();
            });

            account.setUnspentOutputs(obj.unspent_outputs);

            MyWallet.sendEvent('hw_wallet_balance_updated');
            if (successCallback) {
                successCallback();
            }
        }, function(e) {
            if (errorCallback) {
                errorCallback(e);
            }
            MyWallet.sendMonitorEvent({type: "error", message: e, code: 0});
        }, 0, true);
    }

    this.recommendedTransactionFeeForAccount = function(accountIdx, amount) {
        return myHDWallet.getAccount(accountIdx).recommendedTransactionFee(amount);
    }

    this.sendBitcoinsForAccount = function(accountIdx, to, value, fixedFee, note, successCallback, errorCallback) {
        MyWallet.asyncGetAndSetUnspentOutputsForAccount(accountIdx, function () {
            var tx = myHDWallet.getAccount(accountIdx).createTx(to, value, fixedFee);

            BlockchainAPI.push_tx(tx, note, function(response) {
                if (successCallback)
                    successCallback(response);
            }, function(response) {
                if (errorCallback)
                    errorCallback(response);
            });

        }, function(e) {
            if (errorCallback)
                errorCallback(e);
        });
    }

    this.getAccounts = function() {
        return myHDWallet.getAccounts();
    }

    this.getAccountsCount = function() {
        return myHDWallet.getAccountsCount();
    }

    this.createAccount = function(label) {
        myHDWallet.createAccount(label);
        MyWallet.backupWalletDelayed();
    }

    this.getHDWallet = function() {
        return myHDWallet;
    }

    this.recoverMyWalletHDWalletFromSeedHex = function(seedHex) {
        myHDWallet = recoverHDWalletFromSeedHex(seedHex);
        MyWallet.backupWalletDelayed('update', function() {
            MyWallet.get_history();
        });
    }

    this.recoverMyWalletHDWalletFromMnemonic = function(passphrase) {
        myHDWallet = recoverHDWalletFromMnemonic(passphrase);
        MyWallet.backupWalletDelayed('update', function() {
            MyWallet.get_history();
        });
    }

    this.listenToHDWalletAccountAddresses = function(accountIdx) {
        var account = myHDWallet.getAccount(accountIdx);
        var msg = "";

        var paymentRequests = account.getPaymentRequests();
        var addresses = account.getChangeAddresses();
        for (var i in paymentRequests) {
            var paymentRequest = paymentRequests[i];
            if (paymentRequest.complete == true || paymentRequest.canceled == true)
                continue;

            try {
                msg += '{"op":"addr_sub", "addr":"'+ paymentRequest.address +'"}';
            } catch (e) { }
        }

        var changeAdresses = account.getChangeAddresses();
        for (var i in changeAdresses) {
            var address = changeAdresses[i];
            try {
                msg += '{"op":"addr_sub", "addr":"'+ address +'"}';
            } catch (e) { }
        }

        ws.send(msg);
    }

    this.listenToHDWalletAccounts = function() {
        if (myHDWallet) {
            for (var i in myHDWallet.getAccounts()) {
                MyWallet.listenToHDWalletAccountAddresses(i);
            }
        }
    }

    this.buildHDWallet = function(seedHexString, accountsArrayPayload) {
        myHDWallet = buildHDWallet(seedHexString, accountsArrayPayload);
    }

    this.generateHDWalletPassphrase = function() {
        return BIP39.generateMnemonic();
    }

    this.generateHDWalletSeedHex = function() {
        var passPhrase = this.generateHDWalletPassphrase();
        return passphraseToPassphraseHexString(passPhrase);
    }

    this.initializeHDWallet = function(passphrase) {
        var seedHexString = null;
        if (passphrase == null)
            seedHexString = this.generateHDWalletSeedHex();
        else
            seedHexString = passphraseToPassphraseHexString(passphrase);

        MyWallet.buildHDWallet(seedHexString, []);
        MyWallet.createAccount("Spending");
    }

    this.isValidAddress = function(address) {
        try {
            Bitcoin.Address.fromBase58Check(address);
            return true;
        } catch (e) {
            return false;
        }
    }

    this.makeWalletJSON = function(format) {
        return MyWallet.makeCustomWalletJSON(format, guid, sharedKey);
    }

    this.makeCustomWalletJSON = function(format, guid, sharedKey) {

        var encode_func = noConvert;

        if (format == 'base64')
            encode_func = base58ToBase64;
        else if (format == 'hex')
            encode_func = base58ToHex;
        else if (format == 'sipa')
            encode_func = MyWallet.base58ToSipa;
        else if (format == 'base58')
            encode_func = base58ToBase58;

        var out = '{\n	"guid" : "'+guid+'",\n	"sharedKey" : "'+sharedKey+'",\n';

        if (double_encryption && dpasswordhash != null && encode_func == noConvert) {
            out += '	"double_encryption" : '+double_encryption+',\n	"dpasswordhash" : "'+dpasswordhash+'",\n';
        }

        if (wallet_options) {
            out += '	"options" : ' + JSON.stringify(wallet_options)+',\n';
        }

        out += '	"keys" : [\n';

        for (var key in addresses) {
            var addr = $.extend({}, addresses[key]);

            if (addr.tag == 1) {
                delete addr.tag;
            }

            if (addr.priv != null) {
                addr.priv = encode_func(addr.priv, addr.addr);
            }

            //Delete null values
            for (var i in addr) {
                if (addr[i] === null || addr[i] === undefined) {
                    delete addr[i];
                }
            }

            //balance property should not be saved
            delete addr.balance;

            out += JSON.stringify(addr) + ',\n';

            atLeastOne = true;
        }

        if (atLeastOne) {
            out = out.substring(0, out.length-2);
        }

        out += "\n	]";

        if (nKeys(address_book) > 0) {
            out += ',\n	"address_book" : [\n';

            for (var key in address_book) {
                out += '	{"addr" : "'+ key +'",\n';
                out += '	 "label" : "'+ address_book[key] + '"},\n';
            }

            //Remove the extra comma
            out = out.substring(0, out.length-2);

            out += "\n	]";
        }

        if (nKeys(tx_notes) > 0) {
            out += ',\n	"tx_notes" : ' + JSON.stringify(tx_notes)
        }


        out += ',\n	"hd_wallets" : [\n';

        if (myHDWallet != null) {
            out += '	{"seed_hex" : "'+ myHDWallet.getSeedHexString() +'",\n';
            out += '	"accounts" : [\n';

            for (var i in myHDWallet.getAccounts()) {
                var account = myHDWallet.getAccount(i);

                var accountJsonData = account.getAccountJsonData();
                out += JSON.stringify(accountJsonData);
                if (i < myHDWallet.getAccountsCount() - 1) {
                    out += ",\n";
                }
            }
            out += "\n	]";
            out += '\n	}';
        }

        out += "\n	]";

        out += '\n}';

        //Write the address book
        return out;
    }

    this.get_ticker = function(successCallback, errorCallback) {
        BlockchainAPI.get_ticker(successCallback, errorCallback);
    }

    this.get_account_info = function(successCallback, errorCallback) {
        BlockchainAPI.get_account_info(successCallback, errorCallback);
    }

    this.change_language = function(language, successCallback, errorCallback) {
        BlockchainAPI.change_language(language, function() {
            MyWallet.setLanguage(language);

            if (successCallback)
                successCallback();
        }, function() {
            if (errorCallback)
               errorCallback();
        });
    }

    this.change_local_currency = function(code, successCallback, errorCallback) {
        BlockchainAPI.change_local_currency(code, function() {
            var original_code = symbol_local.code;
            symbol_local.code = code;
            MyWallet.get_history();
            symbol_local.code = original_code;

            if (successCallback)
                successCallback();
        }, function() {
            if (errorCallback)
               errorCallback();
        });
    }

    this.change_btc_currency = function(code, successCallback, errorCallback) {
        BlockchainAPI.change_btc_currency(code, function() {
            var original_code = symbol_btc.code;
            symbol_btc.code = code;
            MyWallet.get_history();
            symbol_btc.code = original_code;

            if (successCallback)
                successCallback();
        }, function() {
            if (errorCallback)
               errorCallback();
        });
    }

    this.update_tor_ip_block = function(enabled, successCallback, errorCallback) {
        BlockchainAPI.update_tor_ip_block(enabled ? 1 : 0, function() {
            if (successCallback)
                successCallback();
        }, function() {
            if (errorCallback)
               errorCallback();
        });
    }

    this.get_history_with_addresses = function(addresses, success, error) {
        BlockchainAPI.get_history_with_addresses(addresses, function(data) {
            if (success) success(data);
        }, function() {
            if (error) error();

        }, tx_filter, tx_page*MyWallet.getNTransactionsPerPage(), MyWallet.getNTransactionsPerPage());
    }

    this.get_history = function(success, error) {
        BlockchainAPI.get_history(function(data) {

            parseMultiAddressJSON(data, false);

            if (success) success();

        }, function() {
            if (error) error();

        }, tx_filter, tx_page*MyWallet.getNTransactionsPerPage(), MyWallet.getNTransactionsPerPage());
    }

    this.deleteAddressBook = function(addr) {
        delete address_book[addr];

        MyWallet.backupWalletDelayed();

        $('#send-coins').find('.tab-pane').trigger('show', true);
    }

    function buildSendTxView(reset) {
        $('#send-coins').find('.tab-pane.active').trigger('show', reset);

        if (reset) {
            BlockchainAPI.get_ticker();

            $('.send').prop('disabled', false);
        }
    }

    function buildSelect(select, zero_balance, reset) {
        var old_val = select.val();

        select.empty();

        for (var key in addresses) {
            var addr = addresses[key];

            //Don't include archived addresses
            if (!addr || addr.tag == 2)
                continue;

            var label = addr.label;

            if (!label)
                label = addr.addr.substring(0, 15) + '...';

            if (zero_balance || addr.balance > 0) {
                //On the sent transactions page add the address to the from address options
                select.prepend('<option value="'+addr.addr+'">' + label + ' - ' + formatBTC(addr.balance) + '</option>');
            }
        }

        select.prepend('<option value="any" selected>Any Address</option>');

        if (!reset && old_val)
            select.val(old_val);
    }

    function buildSendForm(el, reset) {
        buildSelect(el.find('select[name="from"]'), false, reset);

        buildSelect(el.find('select[name="change"]'), true, reset);

        el.find('select[name="change"]').prepend('<option value="new">New Address</option>');

        el.find('.local-symbol').text(symbol_local.symbol);

        el.find('.btc-symbol').text(symbol_btc.symbol);

        if (reset) {
            el.find('input').val('');
            el.find('.send-value-usd').text(formatSymbol(0, symbol_local)).val('');
            el.find('.amount-needed').text(0);
        }

        var recipient_container = el.find(".recipient-container");

        if (reset) {
            var first_child = recipient_container.find(".recipient:first-child").clone();

            recipient_container.empty().append(first_child);
        }

        function totalValueBN() {
            var total_value = BigInteger.ZERO;
            el.find('.send-value').each(function(){
                total_value = total_value.add(precisionToSatoshiBN($(this).val()));
            });
            return total_value;
        }

        function bindRecipient(recipient) {

            recipient.find('input[name="send-to-address"]').typeahead({
                source : getActiveLabels()
            }).next().unbind().click(function() {
                    var input = $(this).prev();
                    MyWallet.scanQRCode(function(data) {
                        console.log(data);

                        try {
                            new Bitcoin.Address(data);

                            input.val(data);
                        } catch (e) {

                            //If invalid address try and parse URI
                            MyWallet.handleURI(data, recipient);
                        }
                    }, function(e) {
                        MyWallet.makeNotice('error', 'misc-error', e);
                    });
                });

            recipient.find('.send-value').unbind().bind('keyup change', function(e) {
                if (e.keyCode == '9') {
                    return;
                }

                el.find('.amount-needed').text(formatBTC(totalValueBN().toString()));

                recipient.find('.send-value-usd').val(convert($(this).val() *  symbol_btc.conversion, symbol_local.conversion)).text(formatSymbol($(this).val() *  symbol_btc.conversion, symbol_local));
            });

            recipient.find('.send-value-usd').text(formatSymbol(0, symbol_local)).unbind().bind('keyup change', function(e) {
                if (e.keyCode == '9') {
                    return;
                }

                recipient.find('.send-value').val(formatSatoshi(parseFloat($(this).val()) * symbol_local.conversion, sShift(symbol_btc), true));
            });
        }

        recipient_container.find(".recipient").each(function(){
            bindRecipient($(this));
        });

        el.find('.remove-recipient').unbind().click(function() {
            var n = recipient_container.find(".recipient").length;

            if (n > 1) {
                if (n == 2)
                    $(this).hide(200);

                recipient_container.find(".recipient:last-child").remove();
            }
        });

        el.find('.add-recipient').unbind().click(function() {
            var recipient = recipient_container.find(".recipient:first-child").clone();

            recipient.find('input[type="text"]').val('');

            recipient.appendTo(recipient_container);

            bindRecipient(recipient);

            el.find('.remove-recipient').show(200);
        });

        el.find('select[name="from"]').unbind().change(function() {
            var total_selected = 0;

            var values = $(this).val();
            for (var i in values) {
                if (values[i] == 'any') {
                    $(this).val('any');

                    total_selected = final_balance;
                    break;
                } else {
                    var addr = addresses[values[i]];
                    if (addr && addr.balance)
                        total_selected += addr.balance;
                }
            }

            el.find('.amount-available').text(formatBTC(total_selected));
        }).trigger('change');
    }

    this.getAllAddresses = function() {
        var array = [];
        for (var key in addresses) {
            array.push(key);
        }
        return array;
    }

    //Find the preferred address to use for change
    //Order deposit / request coins
    this.getPreferredAddress = function() {
        var preferred = null;
        for (var key in addresses) {
            var addr = addresses[key];

            if (preferred == null)
                preferred = addr;

            if (addr.priv != null) {
                if (preferred == null)
                    preferred = addr;

                if (addr.tag == null || addr.tag == 0) {
                    preferred = addr;
                    break;
                }
            }
        }

        return preferred.addr;
    }

    function backupInstructionsModal() {
        var modal = $('#restore-backup-modal');

        modal.modal({
            keyboard: true,
            backdrop: "static",
            show: true
        });

        modal.find('.btn.btn-secondary').unbind().click(function() {
            modal.modal('hide');
        });
    }

    this.scanQRCode = function(success, error) {

        var modal = $('#qr-code-reader-modal');

        modal.modal({
            keyboard: false,
            backdrop: "static",
            show: true
        });

        //WebCam
        loadScript('wallet/qr.code.reader', function() {
            QRCodeReader.init(modal, function(data) {
                QRCodeReader.stop();

                modal.modal('hide');

                success(data);
            }, function(e) {
                modal.modal('hide');

                error(e);
            });
        }, error);

        modal.find('.btn.btn-secondary').unbind().click(function() {
            QRCodeReader.stop();

            modal.modal('hide');

            error();
        });
    }

    this.getActiveAddresses = function() {
        var array = [];
        for (var key in addresses) {
            var addr = addresses[key];
            //Don't include archived addresses
            if (addr.tag != 2)
                array.push(addr.addr);
        }
        return array;
    }


    this.getArchivedAddresses = function() {
        var array = [];
        for (var key in addresses) {
            var addr = addresses[key];
            //Don't include archived addresses
            if (addr.tag == 2)
                array.push(addr.addr);
        }
        return array;
    }

    this.getLatestBlock = function() {
        return latest_block;
    }

    this.getConfirmationsForTx = function(latest_block, tx) {
        if (tx.blockHeight != null && tx.blockHeight > 0) {
            return latest_block.height - tx.blockHeight + 1;
        } else {
            tx.setConfirmations(0);
            return 0;
        }
    }

    function setLatestBlock(block) {

        if (block != null) {
            latest_block = block;

            for (var key in transactions) {
                var tx = transactions[key];
                tx.setConfirmations(MyWallet.getConfirmationsForTx(latest_block, tx));
            }

            MyWallet.sendEvent('did_set_latest_block');
        }
    }



    function openTransactionSummaryModal(txIndex, result) {
        loadScript('wallet/frame-modal', function() {
            showFrameModal({
                title : 'Transaction Summary',
                description : '',
                src : root + 'tx-summary/'+txIndex+'?result='+result+'&symbol_btc='+symbol_btc.code+'&symbol_local='+symbol_local.code
            });
        });
    }

    this.deleteNote = function(tx_hash) {
        delete tx_notes[tx_hash];

        buildVisibleView();

        MyWallet.backupWalletDelayed();
    }


    function isAlphaNumericSpace(input) {
        return /^[\w\-,._  ]+$/.test(input);
    }

    function addNotePopover(el, tx_hash) {
        (function(el, tx_hash) {
            el = $(el);

            try {
                el.data('popover').tip().remove();
                el.removeData('popover');
            } catch (e) {}

            console.log('addNotePopover()');

            el.popover({
                title : 'Add Note <span style="float:right"><i class="icon-remove-sign"></i></span>',
                trigger : 'manual',
                content : '<textarea style="width:97%;height:50px;margin-top:2px" placeholder="Enter the note here..."></textarea><div style="text-align:right"><button class="btn btn-small">Save</button></div>'
            });

            el.popover('show');

            el.unbind('mouseleave').mouseleave(function() {
                if (!el.__timeout) {
                    el.__timeout = setTimeout(function() {
                        el.popover('hide');
                    }, 250);
                }
            });

            function clearT() {
                if (el.__timeout) {
                    clearTimeout(el.__timeout);
                    el.__timeout = null;
                }
            }

            var tip = el.data('popover').tip().mouseenter(clearT);

            tip.find('textarea').focus(clearT);

            tip.mouseleave(function() {
                el.__timeout = setTimeout(function() {
                    el.popover('hide');
                }, 250);
            });

            tip.find('i').unbind().click(function() {
                el.popover('hide');
            });


            tip.find('button').click(function() {
                //Strip HTML and replace quotes

                var note = $.trim(tip.find('textarea').val());

                if (!isAlphaNumericSpace(note)) {
                    MyWallet.makeNotice('error', 'misc-error', 'Note must be contain letters and numbers only');
                    return;
                }

                if (note.length > 0) {
                    tx_notes[tx_hash] = note;

                    MyWallet.backupWalletDelayed();
                }

                buildVisibleView();
            });
        })(el, tx_hash);
    }

    function showNotePopover(el, content, tx_hash) {
        (function(el, content, tx_hash) {
            el = $(el);

            try {
                el.data('popover').tip().remove();
                el.removeData('popover');
            } catch (e) {}


            var title = 'Note';

            //Only if it is a custom (not public note do we show the delete button
            if (tx_notes[tx_hash])
                title += ' <span style="float:right"><img src="'+resource+'delete.png" /></span>';

            el.popover({
                title : title,
                trigger : 'manual',
                content : content
            })

            el.popover('show');

            el.unbind('mouseleave').mouseleave(function() {
                if (!el.__timeout) {
                    el.__timeout = setTimeout(function() {
                        el.popover('hide');
                    }, 250);
                }
            });

            var tip = el.data('popover').tip().mouseenter(function() {
                if (el.__timeout) {
                    clearTimeout(el.__timeout);
                    el.__timeout = null;
                }
            });

            tip.find('img').unbind().click(function() {
                MyWallet.deleteNote(tx_hash);
            });

            tip.mouseleave(function() {
                el.__timeout = setTimeout(function() {
                    el.popover('hide');
                }, 250);
            });
        })(el, content, tx_hash);
    }


    /* For a given transaction, figure out if it was coins moved between 
    addresses inside the wallet, or coming from someone in the users address
    book, etc.. Based on getCompactHTML. */
    function parseTransaction(tx) {
      var result = {balance: tx.balance, result: tx.result, hash: tx.hash, confirmations: tx.confirmations, doubleSpend: tx.double_spend, coinbase: null, sender: null, receipient: null, intraWallet: null, note: null, txTime: null}
            
      var all_from_self = true;
      if (tx.result >= 0) {
          for (var i = 0; i < tx.inputs.length; ++i) {
              var out = tx.inputs[i].prev_out;

              if (!out || !out.addr) {
                  all_from_self = false;
                  result.coinbase = true
              } else {
                  var my_addr = addresses[out.addr];

                  result.sender = parseOutput(out)

                  if (my_addr)
                      continue;

                  all_from_self = false;
                  
              }
          }
      } else if (tx.result < 0) {
          for (var i = 0; i < tx.out.length; ++i) {
              var out = tx.out[i];

              var my_addr = addresses[out.addr];

              result.receipient = parseOutput(out)

              if (my_addr && out.type == 0)
                  continue;

              all_from_self = false;

          }
      }

      if (all_from_self)
          result.intraWallet = true;

      result.note = tx.note ? tx.note : tx_notes[tx.hash];

      if (tx.time > 0) {
        result.txTime = new Date(tx.time * 1000);
      }
      
      return result;
    }
    
    /* Given a transaction output returns information about the sender.
    */
    
    function parseOutput(output) {
        result = {address: output.addr, label: null}
      
        var myAddr = null;
        if (addresses != null)
            myAddr = addresses[output.addr];

        if (myAddr != null) {
            if (myAddr.label != null)
                result.label = myAddr.label;
        } else {
            if (address_book && address_book[output.addr])
              result.label = address_book[output.addr]
        }
        
        return result;
    }
    

    function getCompactHTML(tx, myAddresses, addresses_book) {
        var result = tx.result;

        var html = '<tr class="pointer" id="tx-' + tx.txIndex + '"><td class="hidden-phone" style="width:365px"><div><ul style="margin-left:0px;" class="short-addr">';

        var all_from_self = true;
        if (result >= 0) {
            for (var i = 0; i < tx.inputs.length; ++i) {
                var out = tx.inputs[i].prev_out;

                if (!out || !out.addr) {
                    all_from_self = false;

                    html += '<span class="label">Newly Generated Coins</span>';
                } else {
                    var my_addr = myAddresses[out.addr];

                    //Don't Show sent from self
                    if (my_addr)
                        continue;

                    all_from_self = false;

                    html += formatOutput(out, myAddresses, addresses_book);
                }
            }
        } else if (result < 0) {
            for (var i = 0; i < tx.out.length; ++i) {
                var out = tx.out[i];

                var my_addr = myAddresses[out.addr];

                //Don't Show sent to self
                if (my_addr && out.type == 0)
                    continue;

                all_from_self = false;

                html += formatOutput(out, myAddresses, addresses_book);
            }
        }

        if (all_from_self)
            html += '<span class="label">Moved Between Wallet</info>';

        html += '</ul></div></td><td><div>';

        var note = tx.note ? tx.note : tx_notes[tx.hash];

        if (note) {
            html += '<img src="'+resource+'note.png" class="show-note"> ';
        } else {
            html += '<img src="'+resource+'note_grey.png" class="add-note"> ';
        }

        if (tx.time > 0) {
            html += dateToString(new Date(tx.time * 1000));
        }

        if (tx.confirmations == 0) {
            html += ' <span class="label label-important hidden-phone">Unconfirmed Transaction!</span> ';
        } else if (tx.confirmations > 0) {
            html += ' <span class="label label-info hidden-phone">' + tx.confirmations + ' Confirmations</span> ';
        }

        html += '</div></td>';

        if (result > 0)
            html += '<td style="color:green"><div>' + formatMoney(result, true) + '</div></td>';
        else if (result < 0)
            html += '<td style="color:red"><div>' + formatMoney(result, true) + '</div></td>';
        else
            html += '<td><div>' + formatMoney(result, true) + '</div></td>';

        if (tx.balance == null)
            html += '<td></td></tr>';
        else
            html += '<td class="hidden-phone"><div>' + formatMoney(tx.balance) + '</div></td></tr>';

        return html;
    };


    //Reset is true when called manually with changeview
    function buildVisibleViewPre() {
        //Hide any popovers as they can get stuck whent the element is re-drawn
        hidePopovers();

        //Update the account balance
        if (final_balance == null) {
            $('#balance').html('Loading...');
        } else {
            $('#balance').html(formatSymbol(final_balance, symbol, true));
            $('#balance2').html(formatSymbol(final_balance, (symbol === symbol_local) ? symbol_btc : symbol_local), true);
        }

        //Only build when visible
        return cVisible.attr('id');
    }

    //Reset is true when called manually with changeview
    function buildVisibleView(reset) {

        var id = buildVisibleViewPre();

        if ("send-coins" == id)
            buildSendTxView(reset);
        else if ("home-intro" == id)
            buildHomeIntroView(reset);
        else if ("receive-coins" == id)
            buildReceiveCoinsView(reset)
        else if ("my-transactions" == id)
            buildTransactionsView(reset)
    }

    function buildHomeIntroView(reset) {
        $('#summary-n-tx').html(n_tx);

        $('#summary-received').html(formatMoney(total_received, true));

        $('#summary-sent').html(formatMoney(total_sent, true));

        $('#summary-balance').html(formatMoney(final_balance, symbol));

        $('.paper-wallet-btn').unbind().click(function() {
            loadScript('wallet/paper-wallet', function() {
                PaperWallet.showModal();
            });
        });

        var preferred = MyWallet.getPreferredAddress();

        if (preferred == null)
            return;

        if (MyWallet.isWatchOnly(preferred)) {
            $('.no-watch-only').hide();
        } else {
            $('.no-watch-only').show();

            var primary_address = $('#my-primary-address');
            if (primary_address.text() != preferred) {
                primary_address.text(preferred);

                loadScript('wallet/jquery.qrcode', function() {
                    $('#my-primary-addres-qr-code').empty().qrcode({width: 125, height: 125, text: preferred})
                });
            }
        }

        $('#tweet-for-btc').unbind().click(function() {
            MyWallet.openWindow('https://twitter.com/share?url=https://blockchain.info/wallet&hashtags=tweet4btc,bitcoin,'+preferred+'&text=Sign Up For a Free Bitcoin Wallet @ Blockchain.info');
        });

    }

    //Show a Advanced Warning, The show Import-Export Button After Main Password is Entered
    function buildImportExportView() {
        var warning = $('#export-warning').show();

        var content = $('#import-export-content').hide();

        $('#show-import-export').unbind().click(function () {
            MyWallet.getMainPassword(function() {
                warning.hide();

                loadScript('wallet/import-export', function() {
                    ImportExport.init(content, function() {
                        content.show();
                    }, function() {
                        changeView($("#home-intro"));
                    });
                }, function (e) {
                    MyWallet.makeNotice('error', 'misc-error', e);

                    changeView($("#home-intro"));
                });
            }, function() {
                changeView($("#home-intro"));
            });
        });
    };

    //Display The My Transactions view
    function buildTransactionsView() {
        var interval = null;
        var start = 0;

        if (interval != null) {
            clearInterval(interval);
            interval = null;
        }

        var txcontainer;
        if (wallet_options.tx_display == 0) {
            $('#transactions-detailed').hide();
            txcontainer = $('#transactions-compact').show().find('tbody').empty();
        } else {
            $('#transactions-compact').hide();
            txcontainer = $('#transactions-detailed').empty().show();
        }

        if (transactions.length == 0) {
            $('#transactions-detailed, #transactions-compact').hide();
            $('#no-transactions').show();
            return;
        } else {
            $('#no-transactions').hide();
        }

        var buildSome = function() {
            for (var i = start; i < transactions.length && i < (start+MyWallet.getNTransactionsPerPage()); ++i) {
                var tx = transactions[i];

                if (wallet_options.tx_display == 0) {
                    txcontainer.append(bindTx($(getCompactHTML(tx, addresses, address_book)), tx));
                } else {
                    txcontainer.append(tx.getHTML(addresses, address_book));
                }
            }

            start += MyWallet.getNTransactionsPerPage();

            if (start < transactions.length) {
                interval = setTimeout(buildSome, 15);
            } else {
                setupSymbolToggle();

                hidePopovers();

                var pagination = $('.pagination ul').empty();

                if (tx_page == 0 && transactions.length < MyWallet.getNTransactionsPerPage()) {
                    pagination.hide();
                    return;
                } else {
                    pagination.show();
                }

                var pages = Math.ceil(n_tx_filtered / MyWallet.getNTransactionsPerPage());

                var disabled = ' disabled';
                if (tx_page > 0)
                    disabled = '';

                var maxPagesToDisplay = 10;

                var start_page = Math.max(0, Math.min(tx_page-(maxPagesToDisplay/2), pages-maxPagesToDisplay));

                pagination.append($('<li class="prev'+disabled+'"><a>&larr; Previous</a></li>').click(function() {
                    MyWallet.setPage(tx_page-1);
                }));

                if (start_page > 0) {
                    pagination.append($('<li><a>≤</a></li>').click(function() {
                        MyWallet.setPage(0);
                    }));
                }

                for (var i = start_page; i < pages && i < start_page+maxPagesToDisplay; ++i) {
                    (function(i){
                        var active = '';
                        if (tx_page == i)
                            active = ' class="active"';

                        pagination.append($('<li'+active+'><a class="hidden-phone">'+(i+1)+'</a></li>').click(function() {
                            MyWallet.setPage(i);
                        }));
                    })(i);
                }

                if (start_page+maxPagesToDisplay < pages) {
                    pagination.append($('<li><a>≥</a></li>').click(function() {
                        MyWallet.setPage(pages-1);
                    }));
                }

                var disabled = ' disabled';
                if (tx_page < pages-1)
                    disabled = '';

                pagination.append($('<li class="next'+disabled+'"><a>Next &rarr;</a></li>').click(function() {
                    MyWallet.setPage(tx_page+1)
                }));
            }
        };

        buildSome();
    }

    this.setPage = function(i) {
        tx_page = i;

        scroll(0,0);

        MyWallet.get_history();
    }

    function exportHistory() {
        loadScript('wallet/frame-modal', function() {
            showFrameModal({
                title : 'Export History',
                description : '',
                src : root + 'export-history?active='+ MyWallet.getActiveAddresses().join('|')+'&archived='+MyWallet.getArchivedAddresses().join("|")
            });
        });
    }

    function handlePartners(obj) {

        /* Partner buttons on Home View */
        var home_buttons= $('#partner-home-buttons');
        if (obj.home_buttons && obj.home_buttons.length > 0) {
            home_buttons.show();
            home_buttons.find('p').empty();

            for (var key in obj.home_buttons) {
                var button =  obj.home_buttons[key];

                var a = $('<a class="btn" style="margin-left:3px;" href="" target="blank"><img src=""></a>');

                if (button.button_class)
                    a.addClass(button.button_class);

                a.attr('href', button.link);
                a.text(' ' + button.title);

                if (button.image) {
                    a.prepend('<img>').find('img').attr('src', button.image.replace('{0}', resource));
                }

                home_buttons.find('p').append(a);
            }
        } else {
            home_buttons.hide();
        }

        /* Send Coins Partner buttons */
        var send_coins_nav = $('#send-coins-nav');
        send_coins_nav.find('li.send_partner').remove();
        var send_coins_divider = $('#partners-send-divider');
        if (obj.send_buttons && obj.send_buttons.length > 0) {
            send_coins_divider.show().next().show();

            for (var key in obj.send_buttons) {
                var button =  obj.send_buttons[key];
                var el = $('<li class="send_partner"><a target="blank"></a></li>');

                var a = el.find('a');

                a.attr('href', button.link);
                a.text(' ' + button.title);
                if (button.image) {
                    a.prepend('<i class="icon-dice" style="background-position:0px;width:16px;height:16px;"></i>').find('i').css('background-image', 'url(' + button.image.replace('{0}', resource) + ')');
                }

                send_coins_divider.next().after(el);
            }
        } else {
            send_coins_divider.hide().next().hide();
        }


        /* Deposit Buttons */
        var home_deposit_container = $('#home-deposit-container').empty();

        if (obj.deposit_buttons.length > 0) {
            home_deposit_container.show();

            var ul = $('<ul id="myTab" class="nav nav-tabs">');

            var country_codes = {
                US : [],
                GB : [],
                EU : []
            };

            var all = [];
            for (var key in obj.deposit_buttons) {
                var button =  obj.deposit_buttons[key];

                if (button.country_code == null || button.country_code.length == 0) {
                    all.push(button);
                    continue;
                }

                var array = country_codes[button.country_code];

                if (array == null) {
                    array = [];
                    country_codes[button.country_code] = array;
                }

                array.push(button);
            }

            var ii = 0;
            for (var cc in country_codes) {
                var array =  country_codes[cc];

                if (array.length == 0 && all.length == 0)
                    continue;

                var li = $('<li><a></a></li>');

                if (ii == 0)
                    li.addClass('active');

                var a = li.find('a');

                a.attr('href', '#deposit-' + cc.toLowerCase());

                a.text(' ' + cc.toUpperCase())

                a.prepend('<img>').find('img').attr('src', resource + 'flags/' + cc.toLowerCase() + '.png');

                ++ii;

                ul.append(li);

            }

            ul.find('a').click(function() {
                $(this).tab('show');
            });

            home_deposit_container.append(ul);

            var content = $('<div class="tab-content page-header">');

            var ii = 0;
            for (var cc in country_codes) {
                var array =  country_codes[cc];

                var pane = $('<div class="tab-pane" style="text-align:right">');

                if (ii == 0)
                    pane.addClass('active');

                pane.attr('id', 'deposit-' + cc.toLowerCase());

                array = array.concat(all);

                if (array.length == 0)
                    continue;

                for (var i in array) {
                    var button = array[i];

                    var a = $('<a style="margin-left:3px;" class="btn" target="blank"></a>');

                    if (button.button_class)
                        a.addClass(button.button_class);

                    a.attr('href', button.link);
                    a.text(' ' + button.title);
                    if (button.image) {
                        a.prepend('<img>').find('img').attr('src', button.image.replace('{0}', resource));
                    }

                    pane.append(a);
                }

                ++ii;

                content.append(pane);
            }

            home_deposit_container.append(content);

        } else {
            home_deposit_container.hide();
        }
    }

    function parseMultiAddressJSON(obj, cached) {
        if (!cached) {
            if (obj.mixer_fee) {
                mixer_fee = obj.mixer_fee;
            }

            recommend_include_fee = obj.recommend_include_fee;

            if (obj.info) {
                if (obj.info.symbol_local)
                    setLocalSymbol(obj.info.symbol_local);

                if (obj.info.symbol_btc)
                    setBTCSymbol(obj.info.symbol_btc);
            }
        }

        if (obj.disable_mixer) {
            //$('#shared-addresses,#send-shared').hide();
        }

        sharedcoin_endpoint = obj.sharedcoin_endpoint;

        transactions.length = 0;

        if (obj.wallet == null) {
            total_received = 0;
            total_sent = 0;
            final_balance = 0;
            n_tx = 0;
            n_tx_filtered = 0;
            return;
        }

        total_received = obj.wallet.total_received;
        total_sent = obj.wallet.total_sent;
        final_balance = obj.wallet.final_balance;
        n_tx = obj.wallet.n_tx;
        n_tx_filtered = obj.wallet.n_tx_filtered;

        for (var i = 0; i < obj.addresses.length; ++i) {
            if (addresses[obj.addresses[i].address])
                addresses[obj.addresses[i].address].balance = obj.addresses[i].final_balance;

            for (var j in myHDWallet.getAccounts()) {
                var account = myHDWallet.getAccount(j);
                if (account.isAddressPartOfInternalAccountAddress(obj.addresses[i].address)) {
                    account.setChangeAddressNTxs(obj.addresses[i].address, obj.addresses[i].n_tx);
                }
            }
        }

        for (var i = 0; i < obj.txs.length; ++i) {
            var tx = TransactionFromJSON(obj.txs[i]);

            //Don't use the result given by the api because it doesn't include archived addresses
            tx.result = calcTxResult(tx, false);

            transactions.push(tx);
        }

        for (var i in myHDWallet.getAccounts()) {
            MyWallet.asyncGetAndSetUnspentOutputsForAccount(i);
        }

        if (!cached) {
            if (obj.info.latest_block)
                setLatestBlock(obj.info.latest_block);
        }

        MyWallet.sendEvent('did_multiaddr');
    }

    this.handleURI = function(hash, recipient) {
        loadScript('wallet/jsuri-1.1.1', function() {
            try {
                var uri = new Uri(hash);

                var address = new Bitcoin.Address(uri.host());

                recipient.find('input[name="send-to-address"]').val(address.toString());

                var value = parseFloat(uri.getQueryParamValue('amount'));

                if (value > 0 && !isNaN(value)) {
                    recipient.find('.send-value').val(value);
                }

            } catch (e) {
                console.log(e);

                MyWallet.makeNotice('error', 'error', 'Invalid Bitcoin Address or URI');
            }
        }, function() {
            MyWallet.makeNotice('error', 'error', 'Invalid Bitcoin Address or URI');
        });
    }

    function didDecryptWallet() {

        //We need to check if the wallet has changed
        MyWallet.getWallet();

        logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());

        MyWallet.sendEvent('did_decrypt');

        ///Get the list of transactions from the http API
        MyWallet.get_history(null, function() {
            MyStore.get('multiaddr', function(multiaddrjson) {
                if (multiaddrjson != null) {
                    parseMultiAddressJSON($.parseJSON(multiaddrjson), true);
                }
            });
        });
    }

    function checkWalletChecksum(payload_checksum, success, error) {
        var data = {method : 'wallet.aes.json', format : 'json', checksum : payload_checksum};

        MyWallet.securePost("wallet", data, function(obj) {
            if (!obj.payload || obj.payload == 'Not modified') {
                if (success) success();
            } else if (error) error();
        }, function(e) {
            if (error) error();
        });
    }

    //Fetch a new wallet from the server
    //success(modified true/false)
    this.getWallet = function(success, error) {
        var data = {method : 'wallet.aes.json', format : 'json'};

        if (payload_checksum && payload_checksum.length > 0)
            data.checksum = payload_checksum;

        MyWallet.sendMonitorEvent({type: "info", message: "Checking For Wallet Updates", code: 0});


        MyWallet.securePost("wallet", data, function(obj) {
            if (!obj.payload || obj.payload == 'Not modified') {
                if (success) success();
                return;
            }

            MyWallet.setEncryptedWalletData(obj.payload);

            internalRestoreWallet(function() {
                MyWallet.get_history();

                if (success) success();
            }, function() {
                if (error) error();
            });
        }, function(e) {
            if (error) error();
        });
    }

    function internalRestoreWallet(success, error) {
        if (encrypted_wallet_data == null || encrypted_wallet_data.length == 0) {
            error('No Wallet Data To Decrypt');
            return;
        }

        MyWallet.decryptWallet(encrypted_wallet_data, password, function(obj, rootContainer) {
            try {
                sharedKey = obj.sharedKey;

                if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
                    throw 'Shared Key is invalid';
                }

                if (rootContainer) {
                    encryption_version_used = rootContainer.version;
                    main_pbkdf2_iterations = rootContainer.pbkdf2_iterations;
                }

                if (obj.double_encryption && obj.dpasswordhash) {
                    double_encryption = obj.double_encryption;
                    dpasswordhash = obj.dpasswordhash;
                }


                if (obj.options) {
                    $.extend(wallet_options, obj.options);
                }

                addresses = {};
                for (var i = 0; i < obj.keys.length; ++i) {
                    var key = obj.keys[i];
                    if (!key.addr || !isAlphaNumericSpace(key.addr)) {
                        MyWallet.makeNotice('error', 'null-error', 'Your wallet contains an invalid address. This is a sign of possible corruption, please double check all your BTC is accounted for. Backup your wallet to remove this error.', 15000);
                        continue;
                    }

                    if (key.tag == 1 || !isAlphaNumericSpace(key.tag)) {
                        key.tag = null;
                    }

                    if (key.label && !isAlphaNumericSpace(key.label)) {
                        key.label = null;
                    }

                    addresses[key.addr] = key;
                }

                address_book = {};
                if (obj.address_book) {
                    for (var i = 0; i < obj.address_book.length; ++i) {
                        var entry = obj.address_book[i];

                        if (entry.label && isAlphaNumericSpace(entry.label) && isAlphaNumericSpace(entry.addr)) {
                            MyWallet.addAddressBookEntry(entry.addr, entry.label);
                        }
                    }
                }

                if (obj.hd_wallets) {
                    var defaultHDWallet = obj.hd_wallets[0];
                    if (haveBuildHDWallet == false) {
                        MyWallet.buildHDWallet(defaultHDWallet.seed_hex, defaultHDWallet.accounts);
                        haveBuildHDWallet = true;
                    }
                } else {
                    MyWallet.sendEvent('hd_wallets_does_not_exist');
                }

                if (obj.tx_notes) {
                    for (var tx_hash in obj.tx_notes) {
                        var note = obj.tx_notes[tx_hash];

                        if (note && isAlphaNumericSpace(note)) {
                            tx_notes[tx_hash] = note;
                        }
                    }
                }

                //If we don't have a checksum then the wallet is probably brand new - so we can generate our own
                if (payload_checksum == null || payload_checksum.length == 0) {
                    payload_checksum = generatePayloadChecksum();
                }

                setIsInitialized();

                success();
            } catch (e) {
                error(e);
            };
        }, error);
    }

    this.getPassword = function(modal, success, error) {

        if (!modal.is(':visible')) {
            modal.trigger('hidden');
            modal.unbind();
        }

        modal.modal({
            keyboard: false,
            backdrop: "static",
            show: true
        });

        //Center
        modal.center();

        var input = modal.find('input[name="password"]');

        //Virtual On-Screen Keyboard
        var $write = input,
            shift = false,
            capslock = false;

        modal.find('.vkeyboard li').unbind().click(function(){

            var $this = $(this),
                character = $this.html(); // If it's a lowercase letter, nothing happens to this variable

            // Shift keys
            if ($this.hasClass('left-shift') || $this.hasClass('right-shift')) {
                $('.letter').toggleClass('uppercase');
                $('.symbol span').toggle();

                shift = (shift === true) ? false : true;
                capslock = false;
                return false;
            }

            // Caps lock
            if ($this.hasClass('capslock')) {
                $('.letter').toggleClass('uppercase');
                capslock = true;
                return false;
            }

            // Delete
            if ($this.hasClass('delete')) {
                var html = $write.val();

                $write.val(html.substr(0, html.length - 1));
                return false;
            }

            // Special characters
            if ($this.hasClass('symbol')) character = $('span:visible', $this).html();
            if ($this.hasClass('space')) character = ' ';
            if ($this.hasClass('tab')) character = "\t";
            if ($this.hasClass('return')) character = "\n";

            // Uppercase letter
            if ($this.hasClass('uppercase')) character = character.toUpperCase();

            // Remove shift once a key is clicked.
            if (shift === true) {
                $('.symbol span').toggle();
                if (capslock === false) $('.letter').toggleClass('uppercase');

                shift = false;
            }

            // Add the character
            $write.val($write.val() + character);
        });

        input.keypress(function(e) {
            if(e.keyCode == 13) { //Pressed the return key
                e.preventDefault();
                modal.find('.btn.btn-primary').click();
            }
        });

        input.val('');

        var primary_button = modal.find('.btn.btn-primary');
        primary_button.click(function() {
            if (success) {
                error = null;

                var ccopy = success;
                success = null;

                setTimeout(function() {
                    modal.modal('hide');

                    ccopy(input.val());
                }, 10);
            } else {
                modal.modal('hide');
            }
        });

        var secondary_button = modal.find('.btn.btn-secondary');
        secondary_button.click(function() {
            if (error) {
                var ccopy = error;

                error = null;
                success = null;

                setTimeout(function() {
                    modal.modal('hide');

                    try { ccopy(); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                }, 10);
            } else {
                modal.modal('hide');
            }
        });

        modal.on('hidden', function () {
            input.unbind();
            secondary_button.unbind();
            primary_button.unbind();
            modal.unbind();

            if (error) {
                var ccopy = error;

                error = null;
                success = null;

                setTimeout(function() {
                    try { ccopy(); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                }, 10);
            }
        });
    }

    this.makePairingQRCode = function(success, version) {

        MyWallet.getMainPassword(function() {
            loadScript('wallet/jquery.qrcode', function() {
                try {
                    if (version == 1) {
                        MyWallet.securePost("wallet", { method : 'pairing-encryption-password' }, function(encryption_phrase) {
                            success($('<div></div>').qrcode({width: 300, height: 300, text: '1|'+ guid + '|' + MyWallet.encrypt(sharedKey + '|' + Crypto.util.bytesToHex(UTF8.stringToBytes(password)), encryption_phrase, MyWallet.getDefaultPbkdf2Iterations())}));
                        }, function(e) {
                            MyWallet.makeNotice('error', 'misc-error', e);
                        });
                    } else if (version == 0) {
                        //Depreciate this ASAP
                        success($('<div></div>').qrcode({width: 300, height: 300, text: guid + '|' + sharedKey + '|' + password}));
                    }
                } catch (e) {
                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            });
        }, function() {
            MyWallet.logout();
        });
    }

    this.getMainPassword = function(success, error) {
        //If the user has input their password recently just call the success handler
        if (last_input_main_password > new Date().getTime() - main_password_timeout)
            return success(password);

        MyWallet.getPassword($('#main-password-modal'), function(_password) {

            if (password == _password) {
                last_input_main_password = new Date().getTime();

                if (success) {
                    try { success(password); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                }
            } else {
                MyWallet.makeNotice('error', 'misc-error', 'Password incorrect.');

                if (error) {
                    try { error(); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                }
            }
        }, error);
    }

    this.getSecondPassword = function(success, error) {
        if (!double_encryption || dpassword != null) {
            if (success) {
                try { success(dpassword); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e);  }
            }
            return;
        }

        MyWallet.getPassword($('#second-password-modal'), function(_password) {
            try {
                if (MyWallet.validateSecondPassword(_password)) {
                    if (success) {
                        try { success(_password); } catch (e) { console.log(e); MyWallet.makeNotice('error', 'misc-error', e); }
                    }
                } else {
                    MyWallet.makeNotice('error', 'misc-error', 'Password incorrect.');

                    if (error) {
                        try { error(); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                    }
                }
            } catch (e) {
                if (error) {
                    try { error(); } catch (e) { MyWallet.makeNotice('error', 'misc-error', e); }
                }
            }
        }, error);
    }

    this.restoreWallet = function(pw, auth_key) {

        if (isInitialized || isRestoringWallet) {
            return;
        }

        function error(e) {
            isRestoringWallet = false;
            MyWallet.sendMonitorEvent({type: "error", message: e, code: 0});

            MyWallet.sendEvent('error_restoring_wallet');
        }

        try {
            isRestoringWallet = true;

            password = pw;

            //Main Password times out after 10 minutes
            last_input_main_password = new Date().getTime();

            //If we don't have any wallet data then we must have two factor authentication enabled
            if (encrypted_wallet_data == null || encrypted_wallet_data.length == 0) {
                MyWallet.sendMonitorEvent({type: "info", message: 'Validating Authentication key', code: 0});

                if (auth_key == null) {
                    throw 'Two Factor Authentication code this null';
                }

                if (auth_key.length == 0 || auth_key.length > 255) {
                    throw 'You must enter a Two Factor Authentication code';
                }

                $.ajax({
                    timeout: 60000,
                    type: "POST",
                    url: root + "wallet",
                    data :  { guid: guid, payload: auth_key, length : auth_key.length,  method : 'get-wallet', format : 'plain' },
                    success: function(data) {
                        try {
                            if (data == null || data.length == 0) {
                                throw 'Server Return Empty Wallet Data';
                            }

                            if (data != 'Not modified') {
                                MyWallet.setEncryptedWalletData(data);
                            }

                            internalRestoreWallet(function() {
                                isRestoringWallet = false;

                                didDecryptWallet();
                            }, error);
                        } catch (e) {
                            error(e);
                        }
                    },
                    error : function (response) {
                        error(response.responseText);
                    }
                });
            } else {
                internalRestoreWallet(function() {
                    isRestoringWallet = false;

                    didDecryptWallet();
                }, error);
            }
        } catch (e) {
            error(e);
        }
    }

    this.getIsInitialized = function() {
        return isInitialized;
    }

    function setIsInitialized() {
        if (isInitialized) return;

        setLogoutImageStatus('error');

        webSocketConnect(wsSuccess);

        isInitialized = true;

        $('#tech-faq').hide();

        $('#intro-text').hide();

        $('#large-summary').show();
    }

    this.quickSendNoUI = function(to, value, listener) {
        loadScript('wallet/signer', function() {
            MyWallet.getSecondPassword(function() {
                try {
                    var obj = initNewTx();

                    obj.webworker_resource_prefix = '';

                    obj.from_addresses = MyWallet.getActiveAddresses();

                    obj.to_addresses.push({address: Bitcoin.Address.fromBase58Check(to), value :  parseValueBitcoin(value)});

                    obj.addListener(listener);

                    obj.start();
                } catch (e){
                    console.log("quickSendNoUI error: " + e);
                    listener.on_error(e);
                }
            }, function(e) {
                console.log("getSecondPassword error: " + e);
                listener.on_error(e);
            });
        });
    }

    function emailBackup() {
        MyWallet.setLoadingText('Sending email backup');

        MyWallet.securePost("wallet", { method : 'email-backup' }, function(data) {
            MyWallet.makeNotice('success', 'backup-success', data);
        }, function(e) {
            MyWallet.makeNotice('error', 'misc-error', e.responseText);
        });
    }

    this.getLocalWalletJson = function() {
            var obj = null;
            try {
                var obj = $.parseJSON(localWalletJsonString);
                return obj;
            } catch (e) {
                return null;
            }
    }

    //Can call multiple times in a row and it will backup only once after a certain delay of activity
    this.backupWalletDelayed = function(method, success, error, extra) {
        if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
            throw 'Cannot backup wallet now. Shared key is not set';
        }

        MyWallet.disableLogout(true);
        isSynchronizedWithServer = false;
        if (archTimer) {
            clearInterval(archTimer);
            archTimer = null;
        }

        archTimer = setTimeout(function (){
            MyWallet.backupWallet(method, success, error, extra);
        }, 3000);
    }

    //Save the javascript wallet to the remote server
    this.backupWallet = function(method, successcallback, errorcallback) {
        if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
            throw 'Cannot backup wallet now. Shared key is not set';
        }

        MyWallet.disableLogout(true);
        if (archTimer) {
            clearInterval(archTimer);
            archTimer = null;
        }

        var _errorcallback = function(e) {
            MyWallet.sendEvent('on_backup_wallet_error')

            MyWallet.sendMonitorEvent({type: "error", message: 'Error Saving Wallet: ' + e, code: 0});

            //Fetch the wallet agin from server
            MyWallet.getWallet();

            if (errorcallback != null)
                errorcallback(e);
        };

        try {
            if (method == null) {
                method = 'update';
            }

            if (nKeys(addresses) == 0) {
                throw 'Addresses Length 0';
            }

            var data = MyWallet.makeWalletJSON();
            localWalletJsonString = data;

            //Everything looks ok, Encrypt the JSON output
            var crypted = MyWallet.encryptWallet(data, password);

            if (crypted.length == 0) {
                throw 'Error encrypting the JSON output';
            }

            //Now Decrypt the it again to double check for any possible corruption
            MyWallet.decryptWallet(crypted, password, function(obj) {
                try {
                    var old_checksum = payload_checksum;

                    MyWallet.setLoadingText('Saving wallet');

                    MyWallet.setEncryptedWalletData(crypted);

                    var new_checksum = payload_checksum;

                    var data =  {
                        length: crypted.length,
                        payload: crypted,
                        checksum: new_checksum,
                        old_checksum : old_checksum,
                        method : method,
                        format : 'plain',
                        language : language
                    };

                    if (sync_pubkeys) {
                        data.active = MyWallet.getActiveAddresses().join('|');
                    }

                    MyWallet.securePost("wallet", data, function(data) {
                        checkWalletChecksum(new_checksum, function() {
                            for (var key in addresses) {
                                var addr = addresses[key];
                                if (addr.tag == 1) {
                                    delete addr.tag; //Make any unsaved addresses as saved
                                }
                            }

                            MyWallet.sendMonitorEvent({type: "success", message: data, code: 0});


                            if (successcallback != null)
                                successcallback();

                            isSynchronizedWithServer = true;
                            MyWallet.disableLogout(false);
                            logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
                            MyWallet.sendEvent('on_backup_wallet_success')
                        }, function() {
                            _errorcallback('Checksum Did Not Match Expected Value')
                            MyWallet.disableLogout(false);
                        });
                    }, function(e) {
                        _errorcallback(e.responseText);
                        MyWallet.disableLogout(false);
                    });
                } catch (e) {
                    _errorcallback(e);
                    MyWallet.disableLogout(false);
                };
            });
        } catch (e) {
            _errorcallback(e);
            MyWallet.disableLogout(false);
        }
    }

    function encryptPK(base58) {
        if (double_encryption) {
            if (dpassword == null)
                throw 'Cannot encrypt private key without a password';

            return MyWallet.encrypt(base58, sharedKey + dpassword, MyWallet.getSecondPasswordPbkdf2Iterations());
        } else {
            return base58;
        }

        return null;
    }

    this.isBase58 = function(str, base) {
        for (var i = 0; i < str.length; ++i) {
            if (str[i] < 0 || str[i] > 58) {
                return false;
            }
        }
        return true;
    }

    //Changed padding to CBC iso10126 9th March 2012 & iterations to pbkdf2_iterations
    this.encrypt = function(data, password, pbkdf2_iterations) {
        return Crypto.AES.encrypt(data, password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : pbkdf2_iterations});
    }

    //Changed padding to CBC iso10126 9th March 2012 & iterations to pbkdf2_iterations
    this.encryptWallet = function(data, password) {
        if (encryption_version_used == 2.0) {
            return JSON.stringify({
                pbkdf2_iterations : MyWallet.getMainPasswordPbkdf2Iterations(),
                version : encryption_version_used,
                payload : MyWallet.encrypt(data, password, MyWallet.getMainPasswordPbkdf2Iterations())
            });
        } else if (encryption_version_used == 0.0) {
            return MyWallet.encrypt(data, password, MyWallet.getDefaultPbkdf2Iterations());
        } else {
            throw 'Unknown encryption version ' + encryption_version_used;
        }
    }

    this.decryptWallet = function(data, password, success, error) {
        try {
            MyWallet.sendMonitorEvent({type: "info", message: 'Decrypting Wallet', code: 0});

            MyWallet.sendEvent('on_wallet_decrypt_start')

            var _success = function (root, obj) {
                MyWallet.sendEvent('on_wallet_decrypt_finish')

                if (success != null) {
                    success(root, obj);
                }
            }

            var _error = function (e) {
                MyWallet.sendEvent('on_wallet_decrypt_finish')

                if (error != null) {
                    error(e);
                }
            }

            //Test if the payload is valid json
            //If it is json then check the payload and pbkdf2_iterations keys are available
            var obj = null;
            try {
                var obj = $.parseJSON(data);
            } catch (e) {}

            var decryptNormal = function() {
                try {
                    var decrypted = Crypto.AES.decrypt(obj.payload, password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : obj.pbkdf2_iterations});

                    var root = $.parseJSON(decrypted);

                    _success(root, obj);
                } catch (e) {
                    _error('Error Decrypting Wallet. Please check your password is correct.');
                }
            };

            if (obj && obj.payload && obj.pbkdf2_iterations) {
                if (obj.version != supported_encryption_version)
                    throw 'Wallet version ' + obj.version + ' not supported';

                if (obj.pbkdf2_iterations > 0) {

                    MyWallet.decryptWebWorker(obj.payload, password, obj.pbkdf2_iterations, function(decrypted) {

                        try {
                            var root = $.parseJSON(decrypted);

                            _success(root, obj);
                        } catch (e) {
                            decryptNormal();
                        }
                    }, function(e) {

                        decryptNormal();
                    });
                } else {
                    decryptNormal();
                }
            } else {
                MyWallet.decrypt(data, password, MyWallet.getDefaultPbkdf2Iterations(), function(decrypted) {
                    try {
                        var root = $.parseJSON(decrypted);

                        try {
                            _success(root);
                        }  catch (e) {
                            console.log(e);
                        }
                        return true;
                    } catch (e) {
                        return false;
                    }
                }, function() {
                    _error('Error Decrypting Wallet. Please check your password is correct.');
                });
            }
        } catch (e) {
            _error(e);
        }
    }

    this.getWebWorkerLoadPrefix = function() {
        return resource + 'wallet/';
    }

    this.decryptWebWorker = function(data, password, pbkdf2_iterations, success, _error) {
        var didError = false;
        var error = function(e) {
            if (!didError) { _error(e); didError = true; }
        }

        try {
            var worker = new Worker(MyWallet.getWebWorkerLoadPrefix() + 'signer' + (min ? '.min.js' : '.js'));

            worker.addEventListener('message', function(e) {
                var data = e.data;

                try {
                    switch (data.cmd) {
                        case 'on_decrypt':
                            success(data.data);
                            worker.terminate();
                            break;
                        case 'on_error': {
                            throw data.e;
                        }
                    };
                } catch (e) {
                    worker.terminate();
                    error(e);
                }
            }, false);

            worker.addEventListener('error', function(e) {
                error(e);
            });

            worker.postMessage({cmd : 'load_resource' , path : MyWallet.getWebWorkerLoadPrefix() + 'bitcoinjs' + (min ? '.min.js' : '.js')});

            worker.postMessage({cmd : 'decrypt', data : data, password : password, pbkdf2_iterations : pbkdf2_iterations});
        } catch (e) {
            error(e);
        }
    }

    //When the ecryption format changes it can produce data which appears to decrypt fine but actually didn't
    //So we call success(data) and if it returns true the data was formatted correctly
    this.decrypt = function(data, password, pbkdf2_iterations, success, error) {
        //iso10126 with pbkdf2_iterations iterations
        try {
            var decoded = Crypto.AES.decrypt(data, password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : pbkdf2_iterations});

            if (decoded != null && decoded.length > 0) {
                if (success(decoded)) {
                    return decoded;
                };
            };
        } catch (e) {
            console.log(e);
        }

        //iso10126 with 10 iterations  (old default)
        if (pbkdf2_iterations != 10) {
            try {
                var decoded = Crypto.AES.decrypt(data, password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : 10 });

                if (decoded != null && decoded.length > 0) {
                    if (success(decoded)) {
                        return decoded;
                    };
                };
            } catch (e) {
                console.log(e);
            }
        }

        //Otherwise try the old default settings
        try {
            var decoded = Crypto.AES.decrypt(data, password);

            if (decoded != null && decoded.length > 0) {
                if (success(decoded)) {
                    return decoded;
                };
            };
        } catch (e) {
            console.log(e);
        }

        //OFB iso7816 padding with one iteration (old default)
        try {
            var decoded = Crypto.AES.decrypt(data, password, {mode: new Crypto.mode.OFB(Crypto.pad.iso7816), iterations : 1});

            if (decoded != null && decoded.length > 0) {
                if (success(decoded)) {
                    return decoded;
                };
            };
        } catch (e) {
            console.log(e);
        }

        //iso10126 padding with one iteration (old default)
        try {
            var decoded = Crypto.AES.decrypt(data, password, { mode: new Crypto.mode.CBC(Crypto.pad.iso10126), iterations : 1 });

            if (decoded != null && decoded.length > 0) {
                if (success(decoded)) {
                    return decoded;
                };
            };
        } catch (e) {
            console.log(e);
        }

        if (error) error();

        return null;
    }

    this.handleNTPResponse = function(obj, clientTime) {
        //Calculate serverTimeOffset using NTP alog
        var nowTime = (new Date()).getTime();
        if (obj.clientTimeDiff && obj.serverTime) {
            var serverClientResponseDiffTime = nowTime - obj.serverTime;
            var responseTime = (obj.clientTimeDiff - nowTime + clientTime - serverClientResponseDiffTime) / 2;

            var thisOffset = (serverClientResponseDiffTime - responseTime) / 2;

            if (haveSetServerTime) {
                serverTimeOffset = (serverTimeOffset + thisOffset) / 2;
            } else {
                serverTimeOffset = thisOffset;
                haveSetServerTime = true;
                MyStore.put('server_time_offset', ''+serverTimeOffset);
            }

            console.log('Server Time offset ' + serverTimeOffset + 'ms - This offset ' + thisOffset);
        }
    }


    //Fetch information on a new wallet identfier
    this.setGUID = function(user_guid, resend_code) {

//        console.log('Set GUID ' + user_guid);

        if (isInitialized) {
            throw 'Cannot Set GUID Once Initialized';
        }

        MyWallet.sendMonitorEvent({type: "info", message: 'Downloading Wallet', code: 0});

        var clientTime=(new Date()).getTime();
        var data = {format : 'json', resend_code : resend_code, ct : clientTime};

        if (payload_checksum) {
            data.checksum = payload_checksum;
        }

        if (sharedKey) {
            data.sharedKey = sharedKey;
        }

        $.ajax({
            type: "GET",
            dataType: 'json',
            url: root + 'wallet/'+user_guid,
            data : data,
            timeout: 60000,
            success: function(obj) {
                MyWallet.handleNTPResponse(obj, clientTime);

                if (!obj.guid) {
                    MyWallet.sendMonitorEvent({type: "error", message: 'Server returned null guid.', code: 0});
                    return;
                }

                guid = obj.guid;
                auth_type = obj.auth_type;
                real_auth_type = obj.real_auth_type;
                sync_pubkeys = obj.sync_pubkeys;

                if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
                    MyWallet.setEncryptedWalletData(obj.payload);
                }

                war_checksum = obj.war_checksum;

                setLocalSymbol(obj.symbol_local);

                setBTCSymbol(obj.symbol_btc);

                if (obj.initial_error) {
                    MyWallet.sendMonitorEvent({type: "error", message: obj.initial_error, code: 0});
                }

                if (obj.initial_success) {
                    MyWallet.sendMonitorEvent({type: "success", message: obj.initial_success, code: 0});
                }

                MyStore.get('guid', function(local_guid) {
                    if (local_guid != guid) {
                        MyStore.remove('guid');
                        MyStore.remove('multiaddr');
                        MyStore.remove('payload');

                        //Demo Account Guid
                        if (guid != demo_guid) {
                            MyStore.put('guid', guid);
                        }
                    }
                });

                if (obj.language && language != obj.language) {
                    MyWallet.setLanguage(obj.language);
                }

                MyWallet.sendEvent('did_set_guid');
            },
            error : function(e) {

                MyStore.get('guid', function(local_guid) {
                    MyStore.get('payload', function(local_payload) {
                        //Error downloading wallet from server
                        //But we can use the local cache

                        if (local_guid == user_guid && local_payload) {
                            MyWallet.setEncryptedWalletData(local_payload);

                            //Generate a new Checksum
                            guid = local_guid;
                            payload_checksum = generatePayloadChecksum();
                            auth_type = 0;

                            MyWallet.sendEvent('did_set_guid');
                        }  else {
                            MyWallet.sendEvent('did_fail_set_guid');

                            try {
                                var obj = $.parseJSON(e.responseText);

                                if (obj.authorization_required) {
                                    loadScript('wallet/poll-for-session-guid', function() {
                                        pollForSessionGUID();
                                    });
                                }

                                if (obj.initial_error) {
                                    MyWallet.sendMonitorEvent({type: "error", message: obj.initial_error, code: 0});
                                }

                                return;
                            } catch (ex) {}

                            if (e.responseText)
                                MyWallet.sendMonitorEvent({type: "error", message: e.responseText, code: 0});
                            else
                                MyWallet.sendMonitorEvent({type: "error", message: 'Error changing wallet identifier', code: 0});
                        }
                    });
                });
            }
        });
    }


    function encodePK(priv) {
        var base58 = Bitcoin.base58.encode(priv.toBuffer(32));

        return encryptPK(base58);
    }

    this.decryptPK = function(priv) {
        if (double_encryption) {
            if (dpassword == null)
                throw 'Cannot decrypt private key without a password';

            return MyWallet.decrypt(priv, sharedKey + dpassword, MyWallet.getSecondPasswordPbkdf2Iterations(), MyWallet.isBase58);
        } else {
            return priv;
        }

        return null;
    }

    this.decodePK = function(priv) {
        if (!priv) throw 'null PK passed to decodePK';

        var decrypted = MyWallet.decryptPK(priv);
        if (decrypted != null) {
            return Bitcoin.base58.decode(decrypted);
        }
        return null;
    }

    this.signmessage = function(address, message) {
        var addr = addresses[address];

        if (!addr.priv)
            throw 'Cannot sign a watch only address';

        var decryptedpk = MyWallet.decodePK(addr.priv);

        var key = new ECKey(new BigInteger.fromBuffer(decryptedpk), false);
        if (key.pub.getAddress().toString() != address) {
            key = new ECKey(new BigInteger.fromBuffer(decryptedpk), true);
        }

        var signatureBuffer = Bitcoin.Message.sign(key, message, Bitcoin.networks.bitcoin);
        return signatureBuffer.toString("base64", 0, signatureBuffer.length);
    }

    this.validateSecondPassword = function(input) {
        var thash = Crypto.SHA256(sharedKey + input, {asBytes: true});

        var password_hash = hashPassword(thash, MyWallet.getSecondPasswordPbkdf2Iterations()-1);  //-1 because we have hashed once in the previous line

        if (password_hash == dpasswordhash) {
            dpassword = input;
            return true;
        }

        //Try 10 rounds
        if (MyWallet.getSecondPasswordPbkdf2Iterations() != 10) {
            var iter_10_hash = hashPassword(thash, 10-1);  //-1 because we have hashed once in the previous line

            if (iter_10_hash == dpasswordhash) {
                dpassword = input;
                dpasswordhash = password_hash;
                return true;
            }
        }

        //Otherwise try SHA256 + salt
        if (Crypto.util.bytesToHex(thash) == dpasswordhash) {
            dpassword = input;
            dpasswordhash = password_hash;
            return true;
        }

        //Legacy as I made a bit of a mistake creating a SHA256 hash without the salt included
        var leghash = Crypto.SHA256(input);

        if (leghash == dpasswordhash) {
            dpassword = input;
            dpasswordhash = password_hash;
            return true;
        }

        return false;
    }

    this.runCompressedCheck = function() {
        var to_check = [];
        var key_map = {};

        for (var key in addresses) {
            var addr = addresses[key];

            if (addr.priv != null) {
                var decryptedpk = MyWallet.decodePK(addr.priv);

                var privatekey = new ECKey(new BigInteger.fromBuffer(decryptedpk), false);

                var uncompressed_address = MyWallet.getUnCompressedAddressString(privatekey);
                var compressed_address = MyWallet.getCompressedAddressString(privatekey);

                var isCompressed = false;
                if (addr.addr != uncompressed_address) {
                    key_map[uncompressed_address] = addr.priv;
                    to_check.push(uncompressed_address);
                }

                if (addr.addr != compressed_address) {
                    key_map[compressed_address] = addr.priv;
                    to_check.push(compressed_address);
                    isCompressed = true;
                }
            }
        }

        if (to_check.length == 0) {
            alert('to_check length == 0');
        }

        BlockchainAPI.get_balances(to_check, function(results) {
            var total_balance = 0;
            for (var key in results) {
                var balance = results[key].final_balance;
                if (balance > 0) {
                    var ecKey = new ECKey(new BigInteger.fromBuffer(MyWallet.decodePK(key_map[key])), isCompressed);

                    var address = ecKey.getBitcoinAddress().toString();

                    if (MyWallet.addPrivateKey(ecKey, {compressed : address != key, app_name : IMPORTED_APP_NAME, app_version : IMPORTED_APP_VERSION})) {
                        alert(formatBTC(balance) + ' claimable in address ' + key);
                    }
                }
                total_balance += balance;
            }

            alert(formatBTC(total_balance) + ' found in compressed addresses');

            if (total_balance > 0) {
                MyWallet.backupWallet('update', function() {
                    MyWallet.get_history();
                });
            }
        });
    }

    //Check the integreity of all keys in the wallet
    this.checkAllKeys = function(reencrypt) {
        for (var key in addresses) {
            var addr = addresses[key];

            if (addr.addr == null)
                throw 'Null Address Found in wallet ' + key;

            //Will throw an exception if the checksum does not validate
            if (addr.addr.toString() == null)
                throw 'Error decoding wallet address ' + addr.addr;

            if (addr.priv != null) {
                var decryptedpk = MyWallet.decodePK(addr.priv);

                var privatekey = new ECKey(new BigInteger.fromBuffer(decryptedpk), false);


                var actual_addr = MyWallet.getUnCompressedAddressString(privatekey);
                if (actual_addr != addr.addr && MyWallet.getCompressedAddressString(privatekey) != addr.addr) {
                    throw 'Private key does not match bitcoin address ' + addr.addr + " != " + actual_addr;
                }

                if (reencrypt) {
                    addr.priv = encodePK(decryptedpk);
                }
            }
        }

        MyWallet.makeNotice('success', 'wallet-success', 'Wallet verified.');
    }

    this.setMainPassword = function(new_password) {
        MyWallet.getMainPassword(function() {
            password = new_password;

            MyWallet.backupWallet('update', function() {
                MyWallet.logout();
            }, function() {
                MyWallet.logout();
            });
        });
    }

    function changeView(id) {
        if (id === cVisible)
            return;

        if (cVisible != null) {
            if ($('#' + cVisible.attr('id') + '-btn').length > 0)
                $('#' + cVisible.attr('id') + '-btn').parent().attr('class', '');

            cVisible.hide();
        }

        cVisible = id;

        cVisible.show();

        if ($('#' + cVisible.attr('id') + '-btn').length > 0)
            $('#' + cVisible.attr('id') + '-btn').parent().attr('class', 'active');

        buildVisibleView(true);
    }

    function nKeys(obj) {
        var size = 0, key;
        for (key in obj) {
            size++;
        }
        return size;
    };

    function internalDeletePrivateKey(addr) {
        addresses[addr].priv = null;
    }

    function walletIsFull() {
        if (nKeys(addresses) >= maxAddr) {
            MyWallet.sendMonitorEvent({type: "error", message: 'We currently support a maximum of '+maxAddr+' private keys, please remove some unused ones.', code: 0});
            return true;
        }

        return false;
    }

//Address (String), priv (base58 String), compresses boolean
    function internalAddKey(addr, priv) {
        var existing = addresses[addr];
        if (!existing || existing.length == 0) {
            addresses[addr] = {addr : addr, priv : priv, balance : 0};
            return true;
        } else if (!existing.priv && priv) {
            existing.priv = priv;
            return true;
        }
        return false;
    }

    function addAddressBookModal() {
        var modal = $('#add-address-book-entry-modal');

        modal.modal({
            keyboard: true,
            backdrop: "static",
            show: true
        });

        var labelField = modal.find('input[name="label"]');

        var addrField = modal.find('input[name="address"]');

        labelField.val('');
        addrField.val('');

        //Added address book button
        modal.find('.btn.btn-primary').unbind().click(function() {

            modal.modal('hide');

            var label = $.trim(labelField.val());
            var bitcoinAddress = $.trim(addrField.val());

            if (label.length == 0 || bitcoinAddress.length == 0) {
                MyWallet.makeNotice('error', 'misc-error', 'You must enter an address and label for the address book entry');
                return false;
            }

            if (!isAlphaNumericSpace(label) || !isAlphaNumericSpace(bitcoinAddress)) {
                MyWallet.makeNotice('error', 'misc-error', 'Label and Bitcoin Address must contain letters and numbers only');
                return false;
            }

            var addr;
            try {
                addr = Bitcoin.Address.fromBase58Check(bitcoinAddress);

                if (addr == null)
                    throw 'Null address';

            } catch (e) {
                MyWallet.makeNotice('error', 'misc-error', 'Bitcoin address invalid, please make sure you entered it correctly');
                return false;
            }

            if (address_book[bitcoinAddress] != null) {
                MyWallet.makeNotice('error', 'misc-error', 'Bitcoin address already exists');
                return false;
            }

            MyWallet.makeNotice('success', 'misc-success', 'Added Address book entry');

            MyWallet.addAddressBookEntry(bitcoinAddress, label);

            MyWallet.backupWalletDelayed();

            $('#send-coins').find('.tab-pane').trigger('show', true);
        });

        modal.find('.btn.btn-secondary').unbind().click(function() {
            modal.modal('hide');
        });
    }

    this.logout = function() {
        if (disable_logout)
            return;

        MyWallet.sendEvent('logging_out')

        if (guid == demo_guid) {
            window.location = root + 'wallet/logout';
        } else {
            $.ajax({
                type: "GET",
                timeout: 60000,
                url: root + 'wallet/logout',
                data : {format : 'plain'},
                success: function(data) {
                    window.location.reload();
                },
                error : function() {
                    window.location.reload();
                }
            });
        }
    }

    function deleteAddresses(addrs) {

        var modal = $('#delete-address-modal');

        modal.modal({
            keyboard: true,
            backdrop: "static",
            show: true
        });

        modal.find('.btn.btn-primary').hide();
        modal.find('.btn.btn-danger').hide();

        $('#change-mind').hide();

        modal.find('#to-delete-address').html(addrs.join(' '));

        modal.find('#delete-balance').empty();

        var dbalance = modal.find('#delete-balance');

        var addrs_with_priv = [];
        for (var i in addrs) {
            var address_string = addrs[i];
            if (addresses[address_string] && addresses[address_string].priv)
                addrs_with_priv.push(addrs[i]);
        }

        BlockchainAPI.get_balance(addrs_with_priv, function(data) {

            modal.find('.btn.btn-primary').show(200);
            modal.find('.btn.btn-danger').show(200);

            dbalance.html('Balance ' + formatBTC(data));

            if (data > 0)
                dbalance.css('color', 'red');
            else
                dbalance.css('color', 'black');


        }, function() {

            modal.find('.btn.btn-primary').show(200);
            modal.find('.btn.btn-danger').show(200);

            dbalance.text('Error Fetching Balance');
        });

        var isCancelled = false;
        var i = 0;
        var interval = null;
        var changeMindTime = 10;

        changeMind = function() {
            $('#change-mind').show();
            $('#change-mind-time').text(changeMindTime - i);
        };

        modal.find('.btn.btn-primary').unbind().click(function() {

            changeMind();

            modal.find('.btn.btn-primary').hide();
            modal.find('.btn.btn-danger').hide();

            interval = setInterval(function() {

                if (isCancelled)
                    return;

                ++i;

                changeMind();

                if (i == changeMindTime) {
                    //Really delete address
                    $('#delete-address-modal').modal('hide');

                    MyWallet.makeNotice('warning', 'warning-deleted', 'Private Key Removed From Wallet');

                    for (var ii in addrs) {
                        internalDeletePrivateKey(addrs[ii]);
                    }

                    //Update view with remove address
                    buildVisibleView();

                    MyWallet.backupWallet();

                    clearInterval(interval);
                }

            }, 1000);
        });

        modal.find('.btn.btn-danger').unbind().click(function() {

            changeMind();

            modal.find('.btn.btn-primary').hide();
            modal.find('.btn.btn-danger').hide();

            interval = setInterval(function() {

                if (isCancelled)
                    return;

                ++i;

                changeMind();

                if (i == changeMindTime) {
                    try {
                        //Really delete address
                        $('#delete-address-modal').modal('hide');

                        MyWallet.makeNotice('warning', 'warning-deleted', 'Address & Private Key Removed From Wallet');

                        for (var ii in addrs) {
                            MyWallet.deleteAddress(addrs[ii]);
                        }

                        buildVisibleView();

                        MyWallet.backupWallet('update', function() {
                            MyWallet.get_history();
                        });

                    } finally {
                        clearInterval(interval);
                    }
                }

            }, 1000);
        });

        modal.unbind().on('hidden', function () {
            if (interval) {
                isCancelled = true;
                clearInterval(interval);
                interval = null;
            }
        });

        modal.find('.btn.btn-secondary').unbind().click(function() {
            modal.modal('hide');
        });
    }

    function getActiveLabels() {
        var labels = [];
        for (var key in address_book) {
            labels.push(address_book[key]);
        }
        for (var key in addresses) {
            var addr =  addresses[key];
            if (addr.tag != 2 && addr.label)
                labels.push(addr.label);
        }
        return labels;
    }

    this.sweepAddressesModal = function(addresses, extra_private_keys) {
        MyWallet.getSecondPassword(function() {
            var modal = $('#sweep-address-modal');

            modal.modal('show');

            BlockchainAPI.get_balance(addresses, function(data) {
                modal.find('.balance').text('Amount: ' + formatBTC(data));
            }, function() {
                modal.find('.balance').text('Error Fetching Balance');
            });

            var sweepSelect = modal.find('select[name="change"]');

            buildSelect(sweepSelect, true);

            modal.find('.btn.btn-primary').unbind().click(function() {
                loadScript('wallet/signer', function() {
                    BlockchainAPI.get_balance(addresses, function(value) {
                        var obj = initNewTx();

                        var changeVal = sweepSelect.val();
                        if (changeVal == 'any') {
                            changeVal = MyWallet.getPreferredAddress();
                        }

                        obj.fee = obj.base_fee; //Always include a fee
                        obj.to_addresses.push({address: new Bitcoin.Address(changeVal), value : BigInteger.valueOf(value).subtract(obj.fee)});
                        obj.from_addresses = addresses;
                        obj.extra_private_keys = extra_private_keys;

                        obj.start();

                    }, function() {
                        MyWallet.makeNotice('error', 'misc-error', 'Error Getting Address Balance');
                    });
                });

                modal.modal('hide');
            });

            modal.find('.btn.btn-secondary').unbind().click(function() {
                modal.modal('hide');
            });
        });
    }

    this.openWindow = function(url) {
        function _hasPopupBlocker(poppedWindow) {
            var result = false;

            try {
                if (typeof poppedWindow == 'undefined' || !poppedWindow) {
                    // Safari with popup blocker... leaves the popup window handle undefined
                    result = true;
                }
                else if (poppedWindow && poppedWindow.closed) {
                    // This happens if the user opens and closes the client window...
                    // Confusing because the handle is still available, but it's in a "closed" state.
                    // We're not saying that the window is not being blocked, we're just saying
                    // that the window has been closed before the test could be run.
                    result = false;
                }
                else if (poppedWindow && poppedWindow.test) {
                    // This is the actual test. The client window should be fine.
                    result = false;
                }
            } catch (err) {
                //if (console) {
                //    console.warn("Could not access popup window", err);
                //}
            }

            return result;
        }

        window.open(url, null, "scroll=1,status=1,location=1,toolbar=1");

        if (_hasPopupBlocker(window)) {
            MyWallet.makeNotice('error', 'misc-error', "Popup Blocked. Try and click again.");
            return false;
        } else {
            return true;
        }
    }

    function buildPopovers() {
        try {
            $(".pop").popover({
                offset: 10,
                placement : 'bottom'
            });
        } catch(e) {}
    }

    function bindReady() {
        if (haveBoundReady) {
            return;
        }

        haveBoundReady = true;

        $('#add-address-book-entry-btn').click(function() {
            addAddressBookModal();
        });

        $("#home-intro-btn").click(function() {
            changeView($("#home-intro"));
        });

        $("#my-transactions-btn").click(function() {
            changeView($("#my-transactions"));
        });

        $("#send-coins-btn").click(function() {
            changeView($("#send-coins"));
        });

        $("#import-export-btn").click(function() {
            changeView($("#import-export"));

            buildImportExportView();
        });

        $('#chord-diagram').click(function() {
            loadScript('wallet/frame-modal', function() {
                showFrameModal({
                    title : 'Address Relationships',
                    description : '',
                    src : root + 'taint/' + MyWallet.getActiveAddresses().join('|')
                });
            });
        });

        $('#verify-message').click(function() {
            loadScript('wallet/address_modal', function() {
                verifyMessageModal();
            });
        });

        $('#generate-cold-storage').click(function() {
            loadScript('wallet/paper-wallet', function() {
                PaperWallet.showColdStorageModal();
            }, null, true);
        });

        $('#group-received').click(function() {
            loadScript('wallet/taint_grouping', function() {
                try{
                    loadTaintData();
                } catch (e) {
                    MyWallet.makeNotice('error', 'misc-error', 'Unable To Load Taint Grouping Data');
                }
            });
        });

        $("#my-account-btn").click(function() {
            changeView($("#my-account"));

            var warning = $('#account-settings-warning').show();

            var content = $('#my-account-content').hide();

            $('#show-account-settings').unbind().click(function () {
                MyWallet.getMainPassword(function() {
                    warning.hide();

                    loadScript('wallet/account', function() {
                        AccountSettings.init(content, function() {
                            content.show();
                        }, function() {
                            changeView($("#home-intro"));
                        })
                    }, function (e) {
                        MyWallet.makeNotice('error', 'misc-error', e);

                        changeView($("#home-intro"));
                    });
                }, function() {
                    changeView($("#home-intro"));
                });
            });
        });

        $('#shared-addresses').on('show', function() {
            var self = $(this);
            loadScript('wallet/shared-addresses', function() {
                buildSharedTable(self);
            });
        });

        $('#active-addresses').on('show', function() {
            var table = $(this).find('table:first');

            table.find("tbody:gt(0)").remove();

            var tbody = table.find('tbody').empty();

            for (var key in addresses) {
                var addr = addresses[key];

                //Hide Archived or un-synced
                if (addr.tag == 2 || addr.tag == 1)
                    continue;

                var noPrivateKey = '';

                if (addr.tag == 1) {
                    noPrivateKey = ' <font color="red" class="pop" title="Not Synced" data-content="This is a new address which has not yet been synced with our the server. Do not used this address yet.">(Not Synced)</font>';
                } else if (addr.priv == null) {
                    noPrivateKey = ' <font color="red" class="pop" title="Watch Only" data-content="Watch Only means there is no private key associated with this bitcoin address. <br /><br /> Unless you have the private key stored elsewhere you do not own the funds at this address and can only observe the transactions.">(Watch Only)</font>';
                }

                var extra = '';
                var label = addr.addr;
                if (addr.label != null) {
                    label = addr.label;
                    extra = '<span class="hidden-phone"> - ' + addr.addr + '</span>';
                }

                var action_tx = $('<tr><td><div class="short-addr"><a href="'+root+'address/'+addr.addr+'" target="new">' + label + '</a>'+ extra + ' ' + noPrivateKey +'<div></td><td><span style="color:green">' + formatMoney(addr.balance, true) + '</span></td>\
            <td><div class="btn-group pull-right"><a class="btn btn-mini dropdown-toggle" data-toggle="dropdown" href="#"><span class="hidden-phone">Actions </span><span class="caret"></span></a><ul class="dropdown-menu"> \
            <li><a href="#" class="pop act-archive" title="Archive Address" data-content="Click this button to hide the address from the main view. You can restore or delete later by finding it in the Archived addresses tab.">Archive Address</a></li>\
            <li><a href="#" class="pop act-label" title="Label Address" data-content="Set the label for this address.">Label Address</a></li>\
            <li><a href="#" class="pop act-qr" title="Show QR Code" data-content="Show a QR Code for this address.">QR Code</a></li>\
            <li><a href="#" class="pop act-sign" title="Sign Message" data-content="Sign A message with this address.">Sign Message</a></li>\
            <li><a href="#" class="pop act-request" title="Request Payment" data-content="Click here to create a new QR Code payment request. The QR Code can be scanned using most popular bitcoin software and mobile apps.">Create Payment Request</a></li>\
            <li><a href="#" class="pop act-pubkey">Show Public Key</a></li>\
            </ul></div></td></tr>');

                (function(address) {
                    action_tx.find('.act-archive').click(function() {
                        MyWallet.archiveAddr(address);
                    });

                    action_tx.find('.act-label').click(function() {
                        loadScript('wallet/address_modal', function() {
                            showLabelAddressModal(address);
                        });
                    });

                    action_tx.find('.act-qr').click(function() {
                        loadScript('wallet/address_modal', function() {
                            showAddressModalQRCode(address);
                        });
                    });

                    action_tx.find('.act-pubkey').click(function() {
                        MyWallet.getSecondPassword(function() {
                            var priv = MyWallet.getPrivateKey(address);

                            if (priv == null) {
                                MyWallet.makeNotice('eror', 'misc-error', 'Public Key Unknown');
                                return;
                            }

                            var key = new ECKey(new BigInteger.fromBuffer(MyWallet.decodePK(priv)), false);

                            if (MyWallet.getCompressedAddressString(key) == address) {
                                var pub = MyWallet.getCompressedPubKey(key);
                            } else {
                                var pub = MyWallet.getUncompressedPubKey(key);
                            }

                            MyWallet.makeNotice('success', 'pub-key', 'Public Key of '+ address +' is ' + pub.toHex(), 20000);

                        });
                    });

                    action_tx.find('.act-sign').click(function() {
                        loadScript('wallet/address_modal', function() {
                            showAddressModalSignMessage(address);
                        });
                    });

                    action_tx.find('.act-request').click(function() {
                        loadScript('wallet/frame-modal', function() {
                            showFrameModal({
                                title : 'Create Payment Request',
                                description : 'Request Payment into address <b>'+address+'</b>',
                                src : root + 'payment_request?address='+address
                            });
                        });
                    });
                })(addr.addr);

                if (addr.balance > 0 && addr.priv)  {
                    table.prepend(action_tx);
                } else {
                    table.append(action_tx);
                }
            }

            buildPopovers();
        });

        $('#archived-addresses').on('show', function() {

            $('#archived-addr tbody').empty();

            var table = $(this).find('tbody');

            var archived = MyWallet.getArchivedAddresses();

            var build = function() {
                table.empty();

                for (var key in archived) {
                    var addr = addresses[archived[key]];

                    //Hide none archived and unsynced
                    if (addr.tag != 2 || addr.tag == 1)
                        continue;

                    var noPrivateKey = '';
                    if (addr.priv == null) {
                        noPrivateKey = ' <font color="red">(Watch Only)</font>';
                    }

                    var extra = '';
                    var label = addr.addr;
                    if (addr.label != null) {
                        label = addr.label;
                        extra = '<span class="hidden-phone"> - ' + addr.addr + '</span>';
                    }

                    var tr = $('<tr><td style="width:20px;"><input type="checkbox" class="archived_checkbox" value="'+addr.addr+'"></td><td><div class="short-addr"><a href="'+root+'address/'+addr.addr+'" target="new">' + label + '</a>'+ extra + ' ' + noPrivateKey +'<div></td><td><span style="color:green">' + formatBTC(addr.balance) + '</span></td><td style="width:16px"><img src="'+resource+'unarchive.png" class="act-unarchive" /></td></tr>');

                    (function(address) {
                        tr.find('.act-unarchive').click(function() {
                            MyWallet.unArchiveAddr(address);
                        });
                    })(addr.addr);

                    if (addr.balance > 0 && addr.priv)  {
                        table.prepend(tr);
                    } else {
                        table.append(tr);
                    }
                }
            }

            build();

            BlockchainAPI.get_balances(archived, function(obj) {
                build();
            }, function(e) {
                MyWallet.makeNotice('error', 'misc-error', e);
            });
        });

        $('#archived-select-all').click(function() {
            $('.archived_checkbox').prop('checked', true);
        });

        $('#archived-select-none').click(function() {
            $('.archived_checkbox').prop('checked', false);
        });

        $('#archived-sweep').click(function() {

            var toSweep = [];

            $('.archived_checkbox:checked').each(function() {
                var addr = addresses[$(this).val()];

                if (addr.priv == null) {
                    MyWallet.makeNotice('error', 'misc-error', 'Cannot Sweep Watch Only Address');
                    return;
                }

                toSweep.push(addr.addr);
            });


            if (toSweep.length == 0)
                return;

            MyWallet.sweepAddressesModal(toSweep);
        });

        $('#archived-delete').click(function() {

            var toDelete = [];

            $('.archived_checkbox:checked').each(function() {
                toDelete.push($(this).val());
            });

            if (toDelete.length == 0)
                return;

            deleteAddresses(toDelete);
        });

        $('#shared-never-ask').click(function() {
            SetCookie('shared-never-ask', $(this).is(':checked'));
        });

        $('.deposit-btn').click(function() {
            var self = $(this);
            var address = MyWallet.getPreferredAddress();

            var extra = self.data('extra');
            if (extra == null) extra = '';

            loadScript('wallet/frame-modal', function() {
                showFrameModal({
                    title : self.data('title'),
                    description : 'Deposit into address <b>'+address+'</b>',
                    top_right : 'Have Questions? Read <a href="'+self.data('link')+'" target="new">How It Works</a>',
                    src : root + 'deposit?address='+address+'&ptype='+self.data('type')+'&guid='+guid+extra
                });
            });
        });

        $('.withdraw-btn').click(function() {
            var self = $(this);
            MyWallet.getSecondPassword(function() {
                var address = MyWallet.getPreferredAddress();
                loadScript('wallet/frame-modal', function() {
                    showFrameModal({
                        title : self.data('title'),
                        description : 'Your Wallet Balance is <b>'+formatBTC(final_balance)+'</b>',
                        src : root + 'withdraw?method='+self.data('type')+'&address='+address+'&balance='+final_balance+'&guid='+guid
                    });
                });
            });
        });

        $('#logout').click(MyWallet.logout);

        $('#refresh').click(function () {
            MyWallet.getWallet(function() {
                MyWallet.get_history();
            });
        });

        $('#summary-n-tx-chart').click(function() {
            loadScript('wallet/frame-modal', function() {
                showFrameModal({
                    title : 'Number of transactions',
                    description : '',
                    src : root + 'charts/n-transactions?show_header=false&address='+MyWallet.getActiveAddresses().join('|')
                });
            });
        });

        $('#summary-received-chart').click(function() {
            loadScript('wallet/frame-modal', function() {
                showFrameModal({
                    title : 'BTC Received Per Day',
                    description : '',
                    src : root + 'charts/received-per-day?show_header=false&address='+MyWallet.getActiveAddresses().join('|')
                });
            });
        });

        $('#summary-balance-chart').click(function() {
            loadScript('wallet/frame-modal', function() {
                showFrameModal({
                    title : 'Wallet Balance',
                    description : '',
                    src : root + 'charts/balance?show_header=false&address='+MyWallet.getActiveAddresses().join('|')
                });
            });
        });

        $("#new-addr").click(function() {
            MyWallet.getWallet(function() {
                MyWallet.getSecondPassword(function() {
                    var key = MyWallet.generateNewKey();

                    var address = key.pub.getAddress().toString();

                    MyWallet.backupWallet('update', function() {
                        MyWallet.makeNotice('info', 'new-address', 'Generated new Bitcoin Address ' + address);

                        loadScript('wallet/address_modal', function() {
                            showLabelAddressModal(address);
                        });

                        MyWallet.get_history();
                    });
                }, function() {
                    MyWallet.logout();
                });
            });
        });

        $('.tx_filter a').click(function(){
            tx_page = 0;
            tx_filter = $(this).data('value');

            MyWallet.get_history();
        });

        $('.tx_display a').click(function(){
            var value = $(this).data('value');
            if (value == 'export') {
                exportHistory();
                return;
            }

            wallet_options.tx_display = value;

            buildVisibleView();

            MyWallet.backupWalletDelayed();
        });

        $('#email-backup-btn').click(function() {
            emailBackup();
        });

        $('#dropbox-backup-btn').click(function() {
            MyWallet.openWindow(root + 'wallet/dropbox-login?guid=' + guid);
        });

        $('#gdrive-backup-btn').click(function() {
            MyWallet.openWindow(root + 'wallet/gdrive-login?guid=' + guid);
        });

        $('#balance').click(function() {
            toggleSymbol();

            buildVisibleView();
        });

        $('#send-quick').on('show', function(e, reset) {
            var self = $(this);

            buildSendForm(self, reset);

            self.find('.send').unbind().click(function() {
                loadScript('wallet/signer', function() {
                    startTxUI(self, 'quick', initNewTx());
                });
            });
        });

        $('#send-email').on('show', function(e, reset) {
            var self = $(this);

            buildSendForm(self, reset);

            self.find('.send').unbind().click(function() {
                loadScript('wallet/signer', function() {
                    startTxUI(self, 'email', initNewTx());
                });
            });
        });

        $('#send-shared').on('show', function(e, reset) {
            var self = $(this);

            buildSendForm(self, reset);

            self.find('.mixer_fee').text(mixer_fee);

            self.find('.fees,.free,.bonus').show();
            if (mixer_fee < 0) {
                self.find('.fees,.free').hide();
            } else if (mixer_fee == 0) {
                self.find('.fees,.bonus').hide();
            } else {
                self.find('.free,.bonus').hide();
            }

            self.find('.send').unbind().click(function() {
                loadScript('wallet/signer', function() {
                    startTxUI(self, 'shared', initNewTx());
                });
            });

            self.find('.shared-fees').text('0.00');
            self.find('input[name="send-before-fees"]').unbind().bind('keyup change', function() {
                var input_value = parseFloat($(this).val());

                var real_tx_value = 0;

                if (input_value > 0) {
                    if (mixer_fee > 0) {
                        real_tx_value = parseFloat(input_value + ((input_value / 100) *  mixer_fee));
                    } else {
                        real_tx_value = parseFloat(input_value);

                        self.find('.bonus-value').text(formatPrecision((Math.min(input_value, precisionFromBTC(200)) / 100) * mixer_fee));
                    }
                }

                if (precisionToBTC(input_value) < 0.1 || precisionToBTC(input_value) > 250) {
                    self.find('.shared-fees').text('0.00');

                    self.find('.send').prop('disabled', true);
                } else {
                    self.find('.shared-fees').text(formatBTC(real_tx_value*symbol_btc.conversion));

                    self.find('.send').prop('disabled', false);
                }

                self.find('.send-value').val(real_tx_value).trigger('keyup');
            })
        });

        $('#send-custom').on('show',  function(e, reset) {
            var self = $(this);

            buildSendForm(self, reset);

            self.find('.send').unbind().click(function() {

                var didError = false;
                if (self.find('textarea[name="public-note"]').val()) {
                    self.find('.send-value').each(function() {
                        if ($(this).val() < 0.0001) {
                            MyWallet.makeNotice('error', 'misc-error', 'You cannot attach a note to a transaction with an output size less than 0.0001 BTC');

                            didError = true;

                            return false;
                        }
                    });
                }

                if (!didError) {
                    loadScript('wallet/signer', function() {
                        startTxUI(self, 'custom', initNewTx());
                    });
                }
            });

            self.find('input[name="fees"]').unbind().bind('keyup change', function(e) {
                if (e.keyCode == '9') {
                    return;
                }

                $(this).parent().find('.send-value-usd').val(convert($(this).val() *  symbol_btc.conversion, symbol_local.conversion)).text(formatSymbol($(this).val() *  symbol_btc.conversion, symbol_local));
            });

            self.find('.reset').unbind().click(function() {
                buildSendForm(self, true);

                self.find('select[name="from"]').trigger('change');
            });
        });

        $('#shared-coin').on('show', function(e, reset) {
            var self = $(this);

            loadScript('wallet/sharedcoin', function() {
                try {
                    buildSendForm(self);

                    SharedCoin.init(self);
                } catch (e) {
                    console.log(e);

                    MyWallet.makeNotice('error', 'misc-error', e);
                }
            }, function (e) {
                MyWallet.makeNotice('error', 'misc-error', e);
            });
        });

        $('#send-sms').on('show', function(e, reset) {
            if (reset)
                return;

            var self = $(this);

            buildSendForm(self);

            $.ajax({
                type: "GET",
                timeout: 60000,
                url: resource + 'wallet/country_codes.html',
                success: function(data) {
                    self.find('select[name="sms-country-code"]').html(data);
                },
                error : function() {
                    MyWallet.makeNotice('error', 'misc-error', 'Error Downloading SMS Country Codes')
                }
            });

            self.find('.send').unbind().click(function() {
                loadScript('wallet/signer', function() {
                    var pending_transaction = initNewTx();

                    startTxUI(self, 'sms', pending_transaction);
                });
            });
        });


        $('#address-book').on('show', function() {
            var el = $('#address-book-tbl tbody');

            if (nKeys(address_book) > 0) {
                el.empty();

                for (var address in address_book) {
                    var tr = $('<tr><td>'+ address_book[address] + '</td><td><div class="addr-book-entry">'+ address + '</div></td><td style="width:16px" class="hidden-phone"><img src="'+resource+'delete.png" class="act-delete" /></td></tr>');

                    (function(address) {
                        tr.find('.act-delete').click(function() {
                            MyWallet.deleteAddressBook(address);
                        });
                    })(address);

                    el.append(tr);
                }
            }
        });

        $('a[data-toggle="tab"]').unbind().on('show', function(e) {
            $(e.target.hash).trigger('show');
        });


        $("#receive-coins-btn").click(function() {
            changeView($("#receive-coins"));
        });

        $("#cash-into-coins").click(function() {
            $(this).attr('href', $(this).attr('href')+MyWallet.getPreferredAddress());
        });

        $('.show_adv').click(function() {
            $('.modal:visible').center();
        });

        $('.download-backup-btn').show();

        buildPopovers();
    }

    function bindInitial() {
        $('.resend-code').click(function() {
            MyWallet.setGUID(guid, true);
        });

        $('#reset-two-factor-btn').click(function() {
            MyWallet.openWindow(root + 'wallet/reset-two-factor' + (guid ? '?guid=' + guid : ''));
        });

        $('.recover-wallet-btn').click(function() {
            MyWallet.openWindow(root + 'wallet/forgot-password'+ (guid ? '?guid=' + guid : ''));
        });

        $('.download-backup-btn').toggle(encrypted_wallet_data != null).click(function() {
            if (!encrypted_wallet_data) {
                MyWallet.makeNotice('error', 'error', 'No Wallet Data to Download');
                return;
            }


            try { var isFileSaverSupported = !!new Blob(); } catch(e) {}

            if (isFileSaverSupported) {
                loadScript('wallet/filesaver', function() {
                    var blob = new Blob([encrypted_wallet_data], {type: "text/plain;charset=utf-8"});

                    saveAs(blob, "wallet.aes.json");
                });
            } else {
                var popup = window.open(null, null, "width=700,height=800,toolbar=0");

                popup.document.write('<!DOCTYPE html><html><head></head><body><div style="word-wrap:break-word;" >'+encrypted_wallet_data+'</div></body></html>');

            }

            backupInstructionsModal();
        });

        $('.auth-0,.auth-1,.auth-2,.auth-3,.auth-4,.auth-5').unbind().keypress(function(e) {
            if(e.keyCode == 13) { //Pressed the return key
                e.preventDefault();

                $('#restore-wallet-continue').click();
            }
        });

        $("#restore-wallet-continue").unbind().click(function(e) {
            e.preventDefault();

            var tguid = $.trim($('#restore-guid').val());

            if (tguid.length == 0)
                return;

            if (guid != tguid) {
                sharedKey = null;
                MyWallet.setGUID(tguid, false);
            } else {
                var input_field = $("#restore-password");

                var pw = input_field.val();

                //Clear the password field now we are done with it
                input_field.val('');

                MyWallet.restoreWallet(pw, null);
            }
        });

        $('.modal').on('show', function() {
            hidePopovers();

            $(this).center();
        }).on('hidden', function () {
                var visible = $('.modal:visible');

                var notices = $('#notices').remove();

                if (visible.length > 0)
                    visible.find('.modal-body').prepend(notices);
                else
                    $('#main-notices-container').append(notices);

            }).on('shown', function() {
                hidePopovers();

                var self = $(this);
                setTimeout(function() {
                    if (self.is(':visible')) {
                        self.find('.modal-body').prepend($('#notices').remove());
                    }
                }, 100);

                self.center();
            });
    }

    function parseMiniKey(miniKey) {
        var check = Crypto.SHA256(miniKey + '?');

        switch(check.slice(0,2)) {
            case '00':
                var decodedKey = Crypto.SHA256(miniKey, {asBytes: true});
                return decodedKey;
                break;
            case '01':
                var x          = Crypto.util.hexToBytes(check.slice(2,4))[0];
                var count      = Math.round(Math.pow(2, (x / 4)));
                var decodedKey = Crypto.PBKDF2(miniKey, 'Satoshi Nakamoto', 32, { iterations: count, asBytes: true});
                return decodedKey;
                break;
            default:
                console.log('invalid key');
                break;
        }
    };

    function getSelectionText() {
        var sel, html = "";
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount) {
                var frag = sel.getRangeAt(0).cloneContents();
                var el = document.createElement("div");
                el.appendChild(frag);
                html = el.innerText;
            }
        } else if (document.selection && document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
        return html;
    }

    this.detectPrivateKeyFormat = function(key) {
        // 51 characters base58, always starts with a '5'
        if (/^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key))
            return 'sipa';

        //52 character compressed starts with L or K
        if (/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key))
            return 'compsipa';

        // 52 characters base58
        if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/.test(key) || /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{43}$/.test(key))
            return 'base58';

        if (/^[A-Fa-f0-9]{64}$/.test(key))
            return 'hex';

        if (/^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=+\/]{44}$/.test(key))
            return 'base64';

        if (/^6P[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{56}$/.test(key))
            return 'bip38';

        if (/^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{21}$/.test(key) ||
            /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25}$/.test(key) ||
            /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}$/.test(key) ||
            /^S[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{30}$/.test(key)) {

            var testBytes = Crypto.SHA256(key + "?", { asBytes: true });

            if (testBytes[0] === 0x00 || testBytes[0] === 0x01)
                return 'mini';
        }

        throw 'Unknown Key Format ' + key;
    }

    this.privateKeyStringToKey = function(value, format) {

        var key_bytes = null;
        if (format == 'base58') {
            key_bytes = BigInteger.fromBuffer(Bitcoin.base58.decode(value)).toByteArray();
        } else if (format == 'base64') {
            key_bytes = Crypto.util.base64ToBytes(value);
        } else if (format == 'hex') {
            key_bytes = Crypto.util.hexToBytes(value);
        } else if (format == 'mini') {
            key_bytes = parseMiniKey(value);
        } else if (format == 'sipa') {
            var tbytes = BigInteger.fromBuffer(Bitcoin.base58.decode(value)).toByteArray();
            tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
            tbytes.shift();
            key_bytes = tbytes.slice(0, tbytes.length - 4);

        } else if (format == 'compsipa') {
            var tbytes = BigInteger.fromBuffer(Bitcoin.base58.decode(value)).toByteArray();
            tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
            tbytes.shift();
            tbytes.pop();
            key_bytes = tbytes.slice(0, tbytes.length - 4);
        } else {
            throw 'Unsupported Key Format';
        }

        if (key_bytes.length != 32)
            throw 'Result not 32 bytes in length';

        return new ECKey(new BigInteger.fromByteArrayUnsigned(key_bytes), false);
    }

    $(document).ready(function() {

        if (!$.isEmptyObject({}) || !$.isEmptyObject([])) {
            MyWallet.makeNotice('error', 'error', 'Object.prototype has been extended by a browser extension. Please disable this extensions and reload the page.');
            return;
        }

        //Disable autocomplete in firefox
        $("input,button,select").attr("autocomplete","off");

        var body = $(document.body);

        function tSetGUID() {
            if (guid && guid.length == 36) {
                setTimeout(function(){
                    MyWallet.setGUID(guid, false);
                }, 10);
            } else {
                $('#signup-btn').show();
            }
        }

        //Load data attributes from html
        guid = body.data('guid');
        sharedKey = body.data('sharedkey');
        language = body.data('language');

        //Deposit pages set this flag so it can be loaded in an iframe
        if (MyWallet.skip_init)
            return;

        MyStore.get('server_time_offset', function (_serverTimeOffset) {
            serverTimeOffset = parseInt(_serverTimeOffset);

            if (isNaN(serverTimeOffset))
                serverTimeOffset = 0;
        });

        if ((!guid || guid.length == 0) && (isExtension || window.location.href.indexOf('/login') > 0)) {
            MyStore.get('guid', function(result) {
                guid = result;

                tSetGUID();

                bindInitial();
            });
        } else {
            tSetGUID();

            bindInitial();
        }

        //Frame break
        if (top.location != self.location) {
            top.location = self.location.href
        }

        body.click(function() {
            if (logout_timeout) {
                clearTimeout(logout_timeout);
                logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
            }

            rng_seed_time();
        }).keypress(function() {
                if (logout_timeout) {
                    clearTimeout(logout_timeout);
                    logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
                }

                rng_seed_time();
            }).mousemove(function(event) {
                if (event) {
                    rng_seed_int(event.clientX * event.clientY);
                }
            });

        $('.auth-'+auth_type).show();

        cVisible = $("#restore-wallet");

        cVisible.show();

        //Show a warning when the Users copies a watch only address to the clipboard
        var ctrlDown = false;
        var ctrlKey = 17, vKey = 86, cKey = 67, appleKey = 67;
        $(document).keydown(function(e) {
            try {
                if (e.keyCode == ctrlKey || e.keyCode == appleKey)
                    ctrlDown = true;

                if (ctrlDown &&  e.keyCode == cKey) {
                    var selection = $.trim(getSelectionText());

                    var addr = addresses[selection];

                    if (addr != null) {
                        if (addr.priv == null) {
                            $('#watch-only-copy-warning-modal').modal('show');
                        }
                    }
                }
            } catch (e) {
                console.log(e);
            }
        }).keyup(function(e) {
                if (e.keyCode == ctrlKey || e.keyCode == appleKey)
                    ctrlDown = false;
            }).ajaxStart(function() {
                setLogoutImageStatus('loading_start');

                $('.loading-indicator').fadeIn(200);
            }).ajaxStop(function() {
                setLogoutImageStatus('loading_stop');

                $('.loading-indicator').hide();
            });
    });

    function buildReceiveCoinsView() {
        $('#receive-coins').find('.tab-pane.active').trigger('show');

        setupToggle();
    }
};