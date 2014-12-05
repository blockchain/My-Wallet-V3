function HDAccount(wallet, label, idx) {
    var accountObject = {
        wallet : wallet,
        idx : idx,
        label : label,
        archived : false,
        balance : 0,
        paymentRequests : [],
        changeAddressToNTxs : {},
        getAccountJsonData : function() {
            var accountJsonData = {
                label : this.getLabel(),
                archived : this.isArchived(),
                paymentRequests : this.getPaymentRequestsJson(),
                change_addresses : this.getChangeAddressesCount(),
                xpriv : this.getAccountExtendedKey(true),
                xpub : this.getAccountExtendedKey(false)
            };
            return accountJsonData;
        },
        getNTxsForChangeAddress : function(address) {
            return this.changeAddressToNTxs[address];
        },
        setChangeAddressNTxs : function(address, NTxs) {
            this.changeAddressToNTxs[address] = NTxs;
        },
        getLabel : function() {
            return this.label;
        },
        setLabel : function(label) {
            this.label = label;
        },
        isArchived : function() {
            return this.archived;
        },
        setIsArchived : function(archived) {
            this.archived = archived;
        },
        isAddressPartOfAccount : function(address) {
            if (this.wallet.addresses.indexOf(address) > -1)
                return true;
            if (this.wallet.changeAddresses.indexOf(address) > -1)
                return true;

            return false;
        },
        isAddressPartOfExternalAccountAddress : function(address) {
            if (this.wallet.addresses.indexOf(address) > -1)
                return true;
            return false;
        },
        isAddressPartOfInternalAccountAddress : function(address) {
            if (this.wallet.changeAddresses.indexOf(address) > -1)
                return true;
            return false;
        },
        getAddresses : function() {
            return this.wallet.addresses;
        },
        getAddressAtIdx : function(idx) {
            return this.wallet.addresses[idx];
        },
        getAddressesCount : function() {
            return this.wallet.addresses.length;
        },
        getChangeAddresses : function() {
            return this.wallet.changeAddresses;
        },
        getChangeAddressAtIdx : function(idx) {
            return this.wallet.changeAddresses[idx];
        },
        getChangeAddressesCount : function() {
            return this.wallet.changeAddresses.length;
        },        
        getAccountExtendedKey : function(isPrivate) {
            return this.wallet.getAccountZero().toBase58(isPrivate);
        },
        generateAddress : function() {
            return this.wallet.generateAddress();
        },
        undoGenerateAddress : function() {
            return this.wallet.addresses.pop();
        },
        generateChangeAddress : function() {
            return this.wallet.generateChangeAddress();
        },
        undoGenerateChangeAddress : function() {
            return this.wallet.changeAddresses.pop();
        },
        getUnspentOutputs : function() {
            return this.wallet.getUnspentOutputs();
        },        
        setUnspentOutputs : function(utxo) {
            return this.wallet.setUnspentOutputs(utxo);
        },                
        incBalance : function(amount) {
            this.balance += amount;
        },
        decBalance : function(amount) {
            this.balance -= amount;
        },
        getBalance : function() {
            return this.balance;
        },
        setBalance : function(balance) {
            return this.balance = balance;
        },
        resetBalance : function() {
            return this.balance = 0;
        },
        getAddressForPaymentRequest : function(paymentRequest) {
            return this.getAddressAtIdx(paymentRequest.index);
        },
        getPaymentRequestsJson : function() {
            var paymentRequestsJson = [];
            for (var i in this.paymentRequests) {
                var paymentRequest = {};
                paymentRequest.amount = this.paymentRequests[i].amount;
                paymentRequest.paid = this.paymentRequests[i].paid;
                paymentRequest.canceled = this.paymentRequests[i].canceled;
                paymentRequest.complete = this.paymentRequests[i].complete;
                paymentRequest.index = this.paymentRequests[i].index;
                paymentRequestsJson.push(paymentRequest);
            }

            return paymentRequestsJson;
        },
        getPaymentRequests : function() {
            return this.paymentRequests;
        },
        setPaymentRequests : function(paymentRequests) {
            this.paymentRequests = paymentRequests;
        },
        generatePaymentRequest : function(amount) {
            for (var i in this.paymentRequests) {
                var paymentRequest = this.paymentRequests[i];
                if (paymentRequest.canceled == true) {
                    paymentRequest.canceled = false;
                    paymentRequest.complete = false;
                    paymentRequest.amount = amount;
                    paymentRequest.paid = 0;
                    return paymentRequest;
                }
            }

            var address = this.generateAddress();
            var paymentRequest = {amount: amount,
                                   paid: 0,
                                   txidList: [],
                                   canceled : false,
                                   complete: false,
                                   index: this.getAddressesCount()-1}
            this.paymentRequests.push(paymentRequest);
            return paymentRequest;
        },
        updatePaymentRequest : function(address, amount) {
            var idx = this.wallet.addresses.indexOf(address);
            var paymentRequest = this.paymentRequests[idx];
            if (idx > -1) {
                paymentRequest.amount = amount;
                return true;
            }
            return false;
        },
        acceptPaymentRequest : function(address) {
            var idx = this.wallet.addresses.indexOf(address);
            var paymentRequest = this.paymentRequests[idx];
            if (idx > -1) {
                paymentRequest.complete = true;
                return true;
            }
            return false;
        },
        addTxToPaymentRequest : function(address, paid, txid) {
            var idx = this.wallet.addresses.indexOf(address);
            var paymentRequest = this.paymentRequests[idx];
            if (idx > -1) {
                paymentRequest.paid += paid;
                paymentRequest.txidList.push(txid);
                return true;
            }
            return false;
        },
        checkToAddTxToPaymentRequest: function(address, txHash, amount, checkCompleted) {
            var idx = this.wallet.addresses.indexOf(address);
            var paymentRequest = this.paymentRequests[idx];
            var haveAddedTxToPaymentRequest = false;
            if (idx > -1) {
                if ((checkCompleted == true || paymentRequest.complete == false) &&
                    paymentRequest.txidList.indexOf(txHash) < 0) {

                    if (checkCompleted == true && paymentRequest.complete == true) {
                        paymentRequest.complete = false;
                    }

                    this.addTxToPaymentRequest(address, amount, txHash);
                    if (paymentRequest.paid == paymentRequest.amount) {
                        this.acceptPaymentRequest(address);
                        MyWallet.sendEvent('hw_wallet_accepted_payment_request', {"address": address, amount: paymentRequest.amount});
                    } else if (amount > 0 && paymentRequest.paid < paymentRequest.amount) {
                        MyWallet.sendEvent('hw_wallet_payment_request_received_too_little', {"address": address, amountRequested: paymentRequest.amount, amountReceived: paymentRequest.paid});
                    } else if (paymentRequest.paid > paymentRequest.amount) {
                        MyWallet.sendEvent('hw_wallet_payment_request_received_too_much', {"address": address, amountRequested: paymentRequest.amount, amountReceived: paymentRequest.paid});
                    }

                    haveAddedTxToPaymentRequest = true;
                }
            }

            return haveAddedTxToPaymentRequest;
        },
        cancelPaymentRequest : function(address) {
            var idx = this.wallet.addresses.indexOf(address);
            var paymentRequest = this.paymentRequests[idx];
            if (idx > -1) {
                paymentRequest.canceled = true;
                return true;
            }
            return false;
        },
        createTx : function(to, value, fixedFee) {
            var utxos = this.wallet.getUnspentOutputs();
            var changeAddress = this.wallet.getChangeAddress();

            var NTxs = this.getNTxsForChangeAddress(changeAddress);
            if (NTxs != null && NTxs > 0) {
                changeAddress = this.wallet.generateChangeAddress();
            }

            return this.wallet.createTx(to, value, fixedFee, changeAddress);
        },
        recommendedTransactionFee : function(amount) {
            try {
                //12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX is dummy address, first ever bitcoin address
                var tx = this.createTx("12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX", amount, null, null);
                return this.wallet.estimatePaddedFee(tx, Bitcoin.networks.bitcoin);
            } catch (e) {
                return 10000;
            }

        }
    };

    return accountObject;
}

function passphraseHexStringToPassphrase(passphraseHex) {
    return BIP39.entropyToMnemonic(passphraseHex);
}

function passphraseToPassphraseHexString(passphrase) {
    return BIP39.mnemonicToEntropy(passphrase);
}

function HDWallet(seedHex, bip39Password) {

    var walletObject = {
        seedHex : seedHex,
        bip39Password : bip39Password,
        accountArray : [],
        getPassphraseString : function() {
            return passphraseHexStringToPassphrase(this.seedHex);
        },
        setSeedHexString : function(seedHex) {
            this.seedHex = seedHex;
        },
        getSeedHexString : function() {
            return this.seedHex;
        },
        getMasterHex : function() {
            return BIP39.mnemonicToSeed(passphraseHexStringToPassphrase(this.seedHex), this.bip39Password);
        },
        getAccountsCount : function() {
            return this.accountArray.length;
        },
        getAccount : function(accountIdx) {
          account = this.accountArray[accountIdx];
          return account;
        },
        filterTransactionsForAccount : function(accountIdx, transactions) {
            var account = this.accountArray[accountIdx];
            

            var idx = accountIdx;

            var filteredTransactions = [];
            var rawTxs = transactions.filter(function(element) {
               return element.account_indexes.indexOf(idx) != -1;
            });

            // console.log("Raw:");
            // console.log(rawTxs);

            for (var i in rawTxs) {
                var tx = rawTxs[i];
                var transaction = {};

                // Default values:
                transaction.to_account= null;
                transaction.from_account = null;
                transaction.from_addresses = [];
                transaction.to_addresses = [];
                transaction.amount = 0;

                var isOrigin = false;
                for (var i = 0; i < tx.inputs.length; ++i) {
                    var output = tx.inputs[i].prev_out;
                    if (!output || !output.addr)
                        continue;

                    if (output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
                        isOrigin = true;
                        transaction.amount -= output.value;
                    } else {
                        transaction.from_addresses.push(output.addr);
                    }
                }

                transaction.intraWallet = false;
                for (var i = 0; i < tx.out.length; ++i) {
                    var output = tx.out[i];
                    if (!output || !output.addr)
                        continue;
                    if (output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
                        transaction.amount += output.value;
                    } else {
                        transaction.to_addresses.push(output.addr);
                        if (! isOrigin) {
                            for (var j in this.getAccounts()) {
                                var otherAccount = this.getAccount(j);
                                if (otherAccount.getAccountExtendedKey(false) == output.xpub.m) {
                                    transaction.intraWallet = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                transaction.hash = tx.hash;
                transaction.confirmations = MyWallet.getConfirmationsForTx(MyWallet.getLatestBlock(), tx);

                if(isOrigin) {
                    transaction.from_account = idx;
                } else {
                    transaction.to_account = idx;
                }

                // transaction.note = tx.note ? tx.note : tx_notes[tx.hash];

                if (tx.time > 0) {
                    transaction.txTime = new Date(tx.time * 1000);
                }

                filteredTransactions.push(transaction);
            }

            return filteredTransactions;

        },
        getAccounts : function() {
            return this.accountArray;
        },
        createAccount : function(label) {
            var accountIdx = this.accountArray.length;

            var walletAccount = new HDWalletAccount(this.getMasterHex());
            //walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(0).derive(accountIdx);

            walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(44).deriveHardened(0).deriveHardened(accountIdx);
            walletAccount.externalAccount = walletAccount.getAccountZero().derive(0);
            walletAccount.internalAccount = walletAccount.getAccountZero().derive(1);

            var account = HDAccount(walletAccount, label, this.accountArray.length);
            this.accountArray.push(account);

            return account;
        }
    };

    return walletObject;
}

function buildHDWallet(seedHexString, accountsArrayPayload, bip39Password) {
    var hdwallet = HDWallet(seedHexString, bip39Password);

    for (var i = 0; i < accountsArrayPayload.length; i++) {
        var accountPayload = accountsArrayPayload[i];
        var archived = accountPayload.archived;
        if (archived == true)
            continue;
        var label = accountPayload.label;
        var external_addresses = accountPayload.paymentRequests.length;
        var change_addresses = accountPayload.change_addresses;
        var paymentRequests = accountPayload.paymentRequests;

        console.log("label: ", label);

        var hdaccount = hdwallet.createAccount(label);
        hdaccount.setIsArchived(archived);
        if (paymentRequests != null) {
            for (var m in paymentRequests) {
                var paymentRequest = paymentRequests[m];
                if (paymentRequest.complete == false &&
                    paymentRequest.canceled == false) {
                        paymentRequest.paid = 0;
                    }
                paymentRequest.txidList = [];
                hdaccount.paymentRequests.push(paymentRequest);
            }
        }

        for (var j = 0; j < external_addresses; j++) {
            var address = hdaccount.generateAddress();
            console.log("\taddress: ", address);
        }

        for (var k = 0; k < change_addresses; k++) {
            var changeAddress = hdaccount.generateChangeAddress();
            console.log("\tchangeAddress: ", changeAddress);
        }
    }

    return hdwallet;
}

function recoverHDWallet(hdwallet) {
    var LOOK_AHEAD_ADDRESS_COUNT = 20;
    var accountIdx = 0;

    var continueLookingAheadAccount = true;

    while(continueLookingAheadAccount) {
        var account = hdwallet.createAccount("Account " + accountIdx.toString());
        //console.log("accountIdx: " + accountIdx.toString());


        var lookAheadOffset = 0;
        var accountAddressIdx = -1;
        var continueLookingAheadAddress = true;
        while(continueLookingAheadAddress) {
            var addresses = [];
            var addressToIdxDict = {};

            for (var i = lookAheadOffset; i < lookAheadOffset + LOOK_AHEAD_ADDRESS_COUNT; i++) {
                var address = account.generateAddress();
                addresses.push(address);
                addressToIdxDict[address] = i;
            }

            MyWallet.get_history_with_addresses(addresses, function(obj) {
                for (var i = 0; i < obj.addresses.length; ++i) {
                    console.log("i: " + i);
                    console.log("Idx: ", addressToIdxDict[obj.addresses[i].address], "address: ", obj.addresses[i].address, " n_tx: ", obj.addresses[i].n_tx);
                    if (obj.addresses[i].n_tx > 0 && addressToIdxDict[obj.addresses[i].address] > accountAddressIdx) {
                        accountAddressIdx = addressToIdxDict[obj.addresses[i].address];
                    }
                }

                console.log("accountAddressIdx : " + accountAddressIdx);
                console.log("lookAheadOffset : " + lookAheadOffset);
                if (accountAddressIdx < lookAheadOffset) {
                    continueLookingAheadAddress = false;
                }

                lookAheadOffset += LOOK_AHEAD_ADDRESS_COUNT;
            }, function() {
            });
        }

        while(account.getAddressesCount() > accountAddressIdx+1) {
            account.undoGenerateAddress();
        }
        var addresses = account.getAddresses();
        for (var i in addresses) {
            var address = addresses[i];
            var paymentRequest = {  amount: 0,
                                    paid: 0,
                                    txidList: [],
                                    canceled : false,
                                    complete: true,
                                    index: parseInt(i)}

            account.paymentRequests.push(paymentRequest);
        }


        lookAheadOffset = 0;
        var accountChangeAddressIdx = -1;
        var continueLookingAheadChangeAddress = true;
        while(continueLookingAheadChangeAddress) {
            var addresses = [];
            var addressToIdxDict = {};

            for (var i = lookAheadOffset; i < lookAheadOffset + LOOK_AHEAD_ADDRESS_COUNT; i++) {
                var address = account.generateChangeAddress();
                addresses.push(address);
                addressToIdxDict[address] = i;
            }

            MyWallet.get_history_with_addresses(addresses, function(obj) {
                for (var i = 0; i < obj.addresses.length; ++i) {
                    console.log("Idx: ", addressToIdxDict[obj.addresses[i].address], "change address: ", obj.addresses[i].address, " n_tx: ", obj.addresses[i].n_tx);
                    if (obj.addresses[i].n_tx > 0 && addressToIdxDict[obj.addresses[i].address] > accountChangeAddressIdx) {
                        accountChangeAddressIdx = addressToIdxDict[obj.addresses[i].address];
                    }
                }

                console.log("accountChangeAddressIdx : " + accountChangeAddressIdx);
                console.log("lookAheadOffset : " + lookAheadOffset);
                if (accountChangeAddressIdx < lookAheadOffset) {
                    continueLookingAheadChangeAddress = false;
                }

                lookAheadOffset += LOOK_AHEAD_ADDRESS_COUNT;
            }, function() {
            });
        }

        while(account.getChangeAddressesCount() > accountChangeAddressIdx+1) {
            account.undoGenerateChangeAddress();
        }

        if (accountAddressIdx == -1 && accountChangeAddressIdx == -1) {
            continueLookingAheadAccount = false;
            hdwallet.accountArray.pop();
        } else {
            accountIdx += 1;
        }
    }

    if (hdwallet.getAccountsCount() < 1) {
        hdwallet.createAccount("Account 1");
    }

    return hdwallet;
}

function recoverHDWalletFromSeedHex(seedHex, bip39Password) {
    var hdwallet = HDWallet(seedHex, bip39Password);
    return recoverHDWallet(hdwallet);
}

function recoverHDWalletFromMnemonic(passphrase, bip39Password) {
    var hdwallet = HDWallet(passphraseToPassphraseHexString(passphrase), bip39Password);
    return recoverHDWallet(hdwallet);
}
