function HDAccount(wallet, label, idx) {
    var accountObject = {
        wallet : wallet,
        idx : idx,
        label : label,
        extendedPrivateKey : null,
        extendedPublicKey : null,
        receiveAddressCount : 0,
        changeAddressCount : 0,
        archived : false,
        balance : null,
        getAccountJsonData : function() {
            var accountJsonData = {
                label : this.getLabel(),
                archived : this.isArchived(),
                receive_address_count : this.receiveAddressCount,
                change_address_count : this.changeAddressCount,
                xpriv : this.extendedPrivateKey,
                xpub : this.extendedPublicKey
            };
            return accountJsonData;
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
            while(this.wallet.addresses.length < this.receiveAddressCount) {
                this.wallet.generateAddress();
            }
            return this.wallet.addresses;
        },
        getReceivingAddress : function() {
            return this.wallet.getAddressAtIndex(this.receiveAddressCount);
        },
        getAddressAtIdx : function(idx) {
            return this.wallet.addresses[idx];
        },
        getAddressesCount : function() {
            return this.wallet.addresses.length;
        },
        getChangeAddresses : function() {
            while(this.wallet.changeAddresses.length < this.changeAddressCount) {
                this.wallet.generateChangeAddress();
            }
            return this.wallet.changeAddresses;
        },
        getChangeAddressAtIdx : function(idx) {
            return this.wallet.changeAddresses[idx];
        },
        getChangeAddressesCount : function() {
            return this.wallet.changeAddresses.length;
        },        
        getAccountExtendedKey : function(isPrivate) {
            if (isPrivate)  
                return this.extendedPrivateKey;
                // return this.wallet.getAccountZero().toBase58();
            else
                return this.extendedPublicKey;
                // return this.wallet.getAccountZero().neutered().toBase58();
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
            if(this.balance == null) {
              this.balance = 0;              
            }
            this.balance += amount;
        },
        decBalance : function(amount) {
            if(this.balance == null) {
              this.balance = 0;              
            }
            this.balance -= amount;
        },
        getBalance : function() {
            return this.balance;
        },
        setBalance : function(balance) {
            return this.balance = balance;
        },
        resetBalance : function() {
            return this.balance = null;
        },
        createTx : function(to, value, fixedFee, unspentOutputs, extendedPrivateKey) {
            var utxos = this.wallet.getUnspentOutputs();

            var sendAccount = new HDWalletAccount(null);
            sendAccount.newNodeFromExtKey(extendedPrivateKey);

            for (var i = 0; i < this.receiveAddressCount; i++) {
                sendAccount.generateAddress();
            }

            for (var i = 0; i < this.changeAddressCount; i++) {
                sendAccount.generateChangeAddress();
            }

            sendAccount.setUnspentOutputs(unspentOutputs);
            var changeAddress = sendAccount.wallet.getChangeAddressAtIndex(this.changeAddressCount);
            
            return sendAccount.createTx(to, value, fixedFee, changeAddress);
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


function isValidateMnemonic(mnemonic) {
    return BIP39.validateMnemonic(mnemonic);
}

function passphraseHexStringToPassphrase(passphraseHex) {
    return BIP39.entropyToMnemonic(passphraseHex);
}

function passphraseToPassphraseHexString(passphrase) {
    return BIP39.mnemonicToEntropy(passphrase);
}

// If second_password is not null we assume double encryption is set on the
// wallet. We don't have access to the internal double_encryption variable
// here.

function HDWallet(seedHex, bip39Password, second_password, success, error) {

    var walletObject = {
        seedHex : second_password == null ? seedHex : MyWallet.encryptSecretWithSecondPassword(seedHex, second_password),
        bip39Password : bip39Password,
        accountArray : [],
        getPassphraseString : function(seedHex) {
            return passphraseHexStringToPassphrase(seedHex);
        },
        setSeedHexString : function(seedHex) {
            this.seedHex = seedHex;
        },
        getSeedHexString : function(second_password) {
          if(second_password == null) {
            return this.seedHex;
          } else {
            return MyWallet.decryptSecretWithSecondPassword(this.seedHex, second_password)
          }
        },
        getMasterHex : function(seedHex) {
            return BIP39.mnemonicToSeed(passphraseHexStringToPassphrase(seedHex), this.bip39Password);
        },
        getAccountsCount : function() {
            return this.accountArray.length;
        },
        getAccount : function(accountIdx) {
          account = this.accountArray[accountIdx];
          return account;
        },
        filterTransactionsForAccount : function(accountIdx, transactions, paidTo, tx_notes) {
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

                transaction.note = tx_notes[tx.hash] ? tx_notes[tx.hash] : null;
    
                if (tx.time > 0) {
                    transaction.txTime = new Date(tx.time * 1000);
                }

                if (paidTo[transaction.hash] != null) {
                    transaction.paidTo = paidTo[transaction.hash];
                }

                filteredTransactions.push(transaction);
            }

            return filteredTransactions;

        },
        getAccounts : function() {
            return this.accountArray;
        },
        // This is called when a wallet is loaded, not when it's initially created. 
        // If second password is enabled then accountPayload.xpriv has already been 
        // encrypted. We're keeping it in an encrypted state.
        createAccountFromExtKey : function(label, possiblyEncryptedExtendedPrivateKey, extendedPublicKey) {
            var accountIdx = this.accountArray.length;

            var walletAccount = new HDWalletAccount(null);

            walletAccount.newNodeFromExtKey(extendedPublicKey);

            var account = HDAccount(walletAccount, label, this.accountArray.length);
            account.extendedPrivateKey = possiblyEncryptedExtendedPrivateKey;
            account.extendedPublicKey = extendedPublicKey;
            this.accountArray.push(account);

            return account;
        },
        createAccount : function(label, second_password) {
            var seedHex = this.getSeedHexString(second_password)
          
            var accountIdx = this.accountArray.length;
              
            var walletAccount = new HDWalletAccount(this.getMasterHex(seedHex));
            //walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(0).derive(accountIdx);

            walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(44).deriveHardened(0).deriveHardened(accountIdx);
            walletAccount.externalAccount = walletAccount.getAccountZero().derive(0);
            walletAccount.internalAccount = walletAccount.getAccountZero().derive(1);

            var account = HDAccount(walletAccount, label, this.accountArray.length);
            
            var extendedPrivateKey = walletAccount.getAccountZero().toBase58();
            var extendedPublicKey =  walletAccount.getAccountZero().neutered().toBase58();
            
            account.extendedPrivateKey = second_password == null ? extendedPrivateKey : MyWallet.encryptSecretWithSecondPassword(extendedPrivateKey, second_password);
            account.extendedPublicKey = extendedPublicKey;

            this.accountArray.push(account);
            
            return account;
        }
    };

    return walletObject;
}

function buildHDWallet(seedHexString, accountsArrayPayload, bip39Password, second_password, success, error) {
    var hdwallet = HDWallet(seedHexString, bip39Password, second_password, success, error);

    for (var i = 0; i < accountsArrayPayload.length; i++) {
        var accountPayload = accountsArrayPayload[i];
        var archived = accountPayload.archived;
        if (archived == true)
            continue;
        var label = accountPayload.label;

        // This is called when a wallet is loaded, not when it's initially created. 
        // If second password is enabled then accountPayload.xpriv has already been 
        // encrypted. We're keeping it in an encrypted state.
        var hdaccount = hdwallet.createAccountFromExtKey(label, accountPayload.xpriv, accountPayload.xpub);
        hdaccount.setIsArchived(archived);
        hdaccount.receiveAddressCount = accountPayload.receive_address_count ? accountPayload.receive_address_count : 0;
        hdaccount.changeAddressCount = accountPayload.change_address_count ? accountPayload.change_address_count : 0;
    }

    return hdwallet;
}

function recoverHDWallet(hdwallet, successCallback, errorCallback) {
    var LOOK_AHEAD_ADDRESS_COUNT = 20;
    var accountIdx = 0;

    var continueLookingAheadAccount = true;

    while(continueLookingAheadAccount) {
        var account = hdwallet.createAccount("Account " + accountIdx.toString(), hdwallet.getSeedHexString());
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
                if (errorCallback)
                    errorCallback();                
                return;                    
            });
        }

        while(account.getAddressesCount() > accountAddressIdx+1) {
            account.undoGenerateAddress();
        }
        account.receiveAddressCount = account.getAddressesCount();

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
                if (errorCallback)
                    errorCallback();                
                return;
            });
        }

        while(account.getChangeAddressesCount() > accountChangeAddressIdx+1) {
            account.undoGenerateChangeAddress();
        }
        account.changeAddressCount = account.getChangeAddressesCount();

        if (accountAddressIdx == -1 && accountChangeAddressIdx == -1) {
            continueLookingAheadAccount = false;
            hdwallet.accountArray.pop();
        } else {
            accountIdx += 1;
        }
    }

    if (hdwallet.getAccountsCount() < 1) {
        hdwallet.createAccount("Account 1", hdwallet.getSeedHexString());
    }

    if (successCallback)
        successCallback(hdwallet);
}

function recoverHDWalletFromSeedHex(seedHex, bip39Password, successCallback, errorCallback) {
    var hdwallet = HDWallet(seedHex, bip39Password);
    recoverHDWallet(hdwallet, successCallback, errorCallback);
}

function recoverHDWalletFromMnemonic(passphrase, bip39Password, successCallback, errorCallback) {
    var hdwallet = HDWallet(passphraseToPassphraseHexString(passphrase), bip39Password);
    recoverHDWallet(hdwallet, successCallback, errorCallback);
}
