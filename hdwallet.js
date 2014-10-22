function HDAccount(wallet, label) {
    var accountObject = {
        wallet : wallet,
        label : label,
        archived : false,
        paymentRequests : [],
        changeAddressToNTxs : {},
        getAccountJsonData : function() {
            var accountJsonData = {
                label : this.getLabel(),
                archived : this.isArchived(),
                paymentRequests : this.paymentRequests,
                external_addresses : this.getAddressesCount(),
                change_addresses : this.getChangeAddressesCount()
            };
            return accountJsonData;
        },
        getNTxsForChangeAddress : function(address) {
            return changeAddressToNTxs[address];
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
        getAddressesCount : function() {
            return this.wallet.addresses.length;
        },
        getChangeAddresses : function() {
            return this.wallet.changeAddresses;
        },
        getChangeAddressesCount : function() {
            return this.wallet.changeAddresses.length;
        },        
        getAccountMainKey : function() {
            return this.wallet.getExternalAccount().toBase58();
        },
        getAccountChangeKey : function() {
            return this.wallet.getInternalAccount().toBase58();
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
        getBalance : function() {
            return this.wallet.getBalance();
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
            var paymentRequest = {address: address,
                                   amount: amount,
                                   paid: 0,
                                   txidList: [],
                                   canceled : false,
                                   complete: false}
            this.paymentRequests.push(paymentRequest);
            // returns {address: address, amount: amount, paid: 0, canceled: false, complete: false}
            return paymentRequest;
        },
        updatePaymentRequest : function(address, amount) {
            for (var i = 0; i < this.paymentRequests.length; i++) {
                var paymentRequest = this.paymentRequests[i];
                if (paymentRequest.address == address) {
                    paymentRequest.amount = amount;
                    return true;
                }
            }
            return false;
        },
        acceptPaymentRequest : function(address) {
            for (var i in this.paymentRequests) {
                var paymentRequest = this.paymentRequests[i];
                if (paymentRequest.address == address) {
                    paymentRequest.complete = true;
                    return true;
                }
            }
            return false;
        },
        addTxToPaymentRequest : function(address, paid, txid) {
            for (var i = 0; i < this.paymentRequests.length; i++) {
                var paymentRequest = this.paymentRequests[i];
                if (paymentRequest.address == address) {
                    paymentRequest.paid += paid;
                    paymentRequest.txidList.push(txid);
                    return true;
                }
            }
            return false;
        },
        checkToAddTxToPaymentRequest: function(address, txHash, amount) {
          var paymentRequests = this.getPaymentRequests();
          for (var j in paymentRequests) {
              var paymentRequest = paymentRequests[j];
              if (paymentRequest.complete == false &&
                  paymentRequest.address == address &&
                  paymentRequest.txidList.indexOf(txHash) < 0) {
                  
                  this.addTxToPaymentRequest(paymentRequest.address, amount, txHash);
                  if (paymentRequest.paid == paymentRequest.amount) {
                      this.acceptPaymentRequest(paymentRequest.address);
                      MyWallet.sendEvent('hw_wallet_accepted_payment_request', {"address": address, amount: paymentRequest.amount});
                  } else if (amount > 0 && paymentRequest.paid < paymentRequest.amount) {
                    MyWallet.sendEvent('hw_wallet_payment_request_received_too_little', {"address": address, amountRequested: paymentRequest.amount, amountReceived: paymentRequest.paid});
                  } else if (paymentRequest.paid > paymentRequest.amount) {
                    MyWallet.sendEvent('hw_wallet_payment_request_received_too_much', {"address": address, amountRequested: paymentRequest.amount, amountReceived: paymentRequest.paid});
                  }
              }
          }
        },
        cancelPaymentRequest : function(address) {
            for (var i in this.paymentRequests) {
                var paymentRequest = this.paymentRequests[i];
                if (paymentRequest.address == address) {
                    paymentRequest.canceled = true;
                    return true;
                }
            }
            return false;
        },
        createTx : function(to, value, fixedFee) {
            return this.wallet.createTx(to, value, fixedFee, null);
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
    return  new Bitcoin.Buffer.Buffer(passphraseHex, "hex").toString();
}

function passphraseToPassphraseHexString(passphrase) {
    return  new Bitcoin.Buffer.Buffer(passphrase).toString("hex");
}

function HDWallet(seedHexBuffer) {

    var walletObject = {
        seedHexBuffer : seedHexBuffer,
        accountArray : [],
        getPassphraseString : function() {
            return this.seedHexBuffer.toString();
        },
        getSeedHexString : function() {
            return this.seedHexBuffer.toString("hex");
        },
        bufferToMasterHex : function(buffer) {
            // TODO
            //var seed = Bitcoin.crypto.sha256(Bitcoin.crypto.sha256(buffer));
            var seed = Bitcoin.crypto.sha256(buffer);
            return seed;
        },
        getAccountsCount : function() {
            return this.accountArray.length;
        },
        getAccount : function(accountIdx) {
          account = this.accountArray[accountIdx];
          account.idx = accountIdx;
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

                    if (account.isAddressPartOfAccount(output.addr)) {
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

                    if (account.isAddressPartOfAccount(output.addr)) {
                        transaction.amount += output.value;
                    } else {
                        transaction.to_addresses.push(output.addr);
                        if (! isOrigin) {
                            for (var j in this.getAccounts()) {
                                var otherAccount = this.getAccount(j);
                                if (otherAccount.isAddressPartOfAccount(output.addr)) {
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
                    transaction.to_account = idx;
                } else {
                    transaction.from_account = idx;
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

            var walletAccount = new Bitcoin.Wallet(this.bufferToMasterHex(this.seedHexBuffer));
            walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(0).derive(accountIdx);
            walletAccount.externalAccount = walletAccount.getAccountZero().derive(0);
            walletAccount.internalAccount = walletAccount.getAccountZero().derive(1);

            var account = HDAccount(walletAccount, label);
            this.accountArray.push(account);

            return account;
        }
    };

    return walletObject;
}

function buildHDWallet(seedHexString, accountsArrayPayload) {
    var hdwallet = HDWallet(new Bitcoin.Buffer.Buffer(seedHexString, "hex"));

    for (var i = 0; i < accountsArrayPayload.length; i++) {
        if (archived == true)
            continue;

        var accountPayload = accountsArrayPayload[i];
        var label = accountPayload.label;
        var archived = accountPayload.archived;
        var external_addresses = accountPayload.external_addresses;
        var change_addresses = accountPayload.change_addresses;
        var paymentRequests = accountPayload.paymentRequests;

        console.log("label: ", label);

        var hdaccount = hdwallet.createAccount(label);
        hdaccount.setIsArchived(archived);
        if (paymentRequests != null) {
            hdaccount.setPaymentRequests(paymentRequests);
        }

        for (var j = 0; j < external_addresses+1; j++) {
            var address = hdaccount.generateAddress();
            console.log("\taddress: ", address);
        }

        for (var k = 0; k < change_addresses+1; k++) {
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

    return hdwallet;
}

function recoverHDWalletFromSeedHex(seedHex) {
    var hdwallet = HDWallet(new Bitcoin.Buffer.Buffer(seedHex, "hex"));
    return recoverHDWallet(hdwallet);
}

function recoverHDWalletFromMnemonic(passphrase) {
    var hdwallet = HDWallet(new Bitcoin.Buffer.Buffer(passphrase));
    return recoverHDWallet(hdwallet);
}

function test() {
    var passphrase = "don't use a string seed like this in real life";
    console.log("passphrase: ", passphrase);
    var accountsArrayPayload = [
        {
            label: "Savings", 
            archived: false,
            external_addresses: 7,
            change_addresses: 12
        },
        {
            label: "archived", 
            archived: true,
            external_addresses: 3,
            change_addresses: 3
        },
        {
            label: "Splurge", 
            archived: false,
            external_addresses: 5,
            change_addresses: 2
        }
        
    ];

    var hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), accountsArrayPayload);
    hdwallet.createAccount("Rothbard");

    var account = hdwallet.getAccount(0);
    console.log("getAccountMainKey: ", account.getAccountMainKey());
    console.log("getAccountChangeKey: ", account.getAccountChangeKey());

    var paymentRequest1 = account.generatePaymentRequest(100);
    var paymentRequest2 = account.generatePaymentRequest(200);
    account.cancelPaymentRequest(paymentRequest1.address);
    paymentRequest2.complete = true;
    paymentRequest2.amount = 500;
    account.updatePaymentRequest(paymentRequest2);
    console.log("getPaymentRequests: ", JSON.stringify(account.getPaymentRequests()));
}
