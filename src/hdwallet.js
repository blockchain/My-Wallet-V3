var HDAccount = function(wallet, label, idx) {

  this.wallet = wallet;
  this.label = label;
  this.idx = idx;
  this.extendedPrivateKey = null;
  this.extendedPublicKey = null;
  this.receiveAddressCount = 0;
  this.changeAddressCount = 0;
  this.n_tx = 0;
  this.numTxFetched = 0;
  this.archived = false;
  this.address_labels= [];
  this.balance = null;
  this.cache= {};

  this.getAccountJsonData = function() {
    var accountJsonData = {
      label : this.getLabel(),
      archived : this.isArchived(),
      receive_address_count : this.receiveAddressCount,
      change_address_count : this.changeAddressCount,
      xpriv : this.extendedPrivateKey,
      xpub : this.extendedPublicKey,
      address_labels: this.address_labels,
      cache: this.cache
    };
    return accountJsonData;
  };

  this.getLabel = function() {
    return this.label;
  };

  this.setLabel = function(label) {
    this.label = label;
  };

  this.getLabelForAddress = function(addressIdx) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        return indexLabel.label;
        break;
      }
    }

    return null;
  };

  this.setLabelForAddress = function(addressIdx, label) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        this.address_labels.splice(i, 1);
        break;
      }
    }

    if (addressIdx == this.receiveAddressCount) {
      this.receiveAddressCount++;
    }
    this.address_labels.push({'index': addressIdx, 'label': label});
  };

  this.unsetLabelForAddress = function(addressIdx) {
    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];
      if (indexLabel.index == addressIdx) {
        this.address_labels.splice(i, 1);
        return true;
      }
    }
    return false;
  };

  this.getLabeledReceivingAddresses = function () {
    var addresses = [];

    for (var i in this.address_labels) {
      var indexLabel = this.address_labels[i];

      var item = { 'index' : indexLabel['index'],
                   'label' : indexLabel['label'],
                   'address' : this.wallet.getAddressAtIndex(indexLabel['index'])
                 };

      addresses.push(item);
    }

    return addresses;
  };

  this.isArchived = function() {
    return this.archived;
  };

  this.setIsArchived = function(archived) {
    this.archived = archived;
  };

  this.isAddressPartOfAccount = function(address) {
    return (this.wallet.addresses.indexOf(address) > -1 ||
            this.wallet.changeAddresses.indexOf(address) > -1);
  };

  this.isAddressPartOfExternalAccountAddress = function(address) {
    return (this.wallet.addresses.indexOf(address) > -1);
  };

  this.isAddressPartOfInternalAccountAddress = function(address) {
    return (this.wallet.changeAddresses.indexOf(address) > -1);
  };

  this.getAddresses = function() {
    while(this.wallet.addresses.length < this.receiveAddressCount) {
      this.wallet.generateAddress();
    }
    return this.wallet.addresses;
  };

  this.getReceivingAddress = function() {
    return this.wallet.getAddressAtIndex(this.receiveAddressCount);
  };

  this.getReceivingAddressIndex = function() {
    return this.receiveAddressCount;
  };

  this.getAddressAtIdx = function(idx) {
    return this.wallet.addresses[idx];
  };

  this.getAddressesCount = function() {
    return this.wallet.addresses.length;
  };

  this.getChangeAddresses = function() {
    while(this.wallet.changeAddresses.length < this.changeAddressCount) {
      this.wallet.generateChangeAddress();
    }
    return this.wallet.changeAddresses;
  };

  this.getChangeAddressAtIdx = function(idx) {
    return this.wallet.changeAddresses[idx];
  };

  this.getChangeAddressesCount = function() {
    return this.wallet.changeAddresses.length;
  };

  this.getAccountExtendedKey = function(isPrivate) {
    if (isPrivate) {
      return this.extendedPrivateKey;
    }
    else {
      return this.extendedPublicKey;
    }
  };

  this.generateAddress = function() {
    return this.wallet.generateAddress();
  };

  this.generateCache = function() {
    this.cache.externalAccountPubKey = JSONB.stringify(this.wallet.externalAccount.pubKey.toBuffer());
    this.cache.externalAccountChainCode = JSONB.stringify(this.wallet.externalAccount.chainCode);
    this.cache.internalAccountPubKey = JSONB.stringify(this.wallet.internalAccount.pubKey.toBuffer());
    this.cache.internalAccountChainCode = JSONB.stringify(this.wallet.internalAccount.chainCode);
  };

  this.undoGenerateAddress = function() {
    return this.wallet.addresses.pop();
  };

  this.generateChangeAddress = function() {
    return this.wallet.generateChangeAddress();
  };

  this.undoGenerateChangeAddress = function() {
    return this.wallet.changeAddresses.pop();
  };

  this.getUnspentOutputs = function() {
    return this.wallet.getUnspentOutputs();
  };

  this.setUnspentOutputs = function(utxo) {
    return this.wallet.setUnspentOutputs(utxo);
  };

  this.incBalance = function(amount) {
    if(this.balance == null) {
      this.balance = 0;
    }
    this.balance += amount;
  };

  this.decBalance = function(amount) {
    if(this.balance == null) {
      this.balance = 0;
    }
    this.balance -= amount;
  };

  this.getBalance = function() {
    return this.balance;
  };

  this.setBalance = function(balance) {
    return this.balance = balance;
  };

  this.resetBalance = function() {
    return this.balance = null;
  };

  this.createTx = function(to, value, fixedFee, unspentOutputs, extendedPrivateKey, listener) {
    // Create the send account (same account as current account, but created with xpriv and thus able to generate private keys)
    var sendAccount = new HDWalletAccount(null);
    sendAccount.newNodeFromExtKey(extendedPrivateKey);

    var changeAddress = sendAccount.getChangeAddressAtIndex(this.changeAddressCount);

    return sendAccount.createTx(to, value, fixedFee, unspentOutputs, changeAddress, listener);
  };

  this.recommendedTransactionFee = function(amount) {
    try {
      //12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX is dummy address, first ever bitcoin address
      var tx = this.createTx("12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX", amount, null, null, null);
      return this.wallet.estimatePaddedFee(tx, Bitcoin.networks.bitcoin);
    } catch (e) {
      return 10000;
    }
  };

};



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

var HDWallet = function(seedHex, bip39Password, second_password) {

  this.seedHex = second_password == null ? seedHex : MyWallet.encryptSecretWithSecondPassword(seedHex, second_password, MyWallet.getSharedKey());
  this.bip39Password = bip39Password;
  this.numTxFetched = 0;
  this.accountArray = [];

  this.getPassphraseString = function(seedHex) {
    return passphraseHexStringToPassphrase(seedHex);
  };

  this.setSeedHexString = function(seedHex) {
    this.seedHex = seedHex;
  };

  this.getSeedHexString = function(second_password) {
    if(second_password == null) {
      return this.seedHex;
    } else {
      return MyWallet.decryptSecretWithSecondPassword(this.seedHex, second_password, MyWallet.getSharedKey());
    }
  };

  this.getMasterHex = function(seedHex) {
    return BIP39.mnemonicToSeed(passphraseHexStringToPassphrase(seedHex), this.bip39Password);
  };

  this.getAccountsCount = function() {
    return this.accountArray.length;
  };

  this.getAccount = function(accountIdx) {
    var account = this.accountArray[accountIdx];
    return account;
  };

  this.replaceAccount = function(accountIdx, account) {
    this.accountArray[accountIdx] = account;
  };

  this.filterTransactionsForAccount = function(accountIdx, transactions, paidTo, tx_notes) {
    var account = this.accountArray[accountIdx];

    var idx = accountIdx;

    var filteredTransactions = [];
    var rawTxs = transactions.filter(function(element) {
      return element.account_indexes.indexOf(idx) != -1;
    });

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
          if (!isOrigin) {
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

  };

  this.getAccounts = function() {
    return this.accountArray;
  };

  this.createArchivedAccount = function(label, possiblyEncryptedExtendedPrivateKey, extendedPublicKey) {
    var accountIdx = this.accountArray.length;
    var walletAccount = new HDWalletAccount(null);
    var account = new HDAccount(walletAccount, label, this.accountArray.length);
    account.extendedPrivateKey = possiblyEncryptedExtendedPrivateKey;
    account.extendedPublicKey = extendedPublicKey;

    return account;
  };

  // This is called when a wallet is loaded, not when it's initially created. 
  // If second password is enabled then accountPayload.xpriv has already been 
  // encrypted. We're keeping it in an encrypted state.
  this.createAccountFromExtKey = function(label, possiblyEncryptedExtendedPrivateKey, extendedPublicKey, cache) {
    var accountIdx = this.accountArray.length;

    var walletAccount = new HDWalletAccount(null);

    walletAccount.newNodeFromExtKey(extendedPublicKey, cache);

    var account = new HDAccount(walletAccount, label, this.accountArray.length);
    account.extendedPrivateKey = possiblyEncryptedExtendedPrivateKey;
    account.extendedPublicKey = extendedPublicKey;

    return account;
  };

  this.createAccount = function(label, second_password) {
    var seedHex = this.getSeedHexString(second_password);
    var accountIdx = this.accountArray.length;

    var walletAccount = new HDWalletAccount(this.getMasterHex(seedHex));

    /* BIP 44 defines the following 5 levels in BIP32 path:
     * m / purpose' / coin_type' / account' / change / address_index
     * Apostrophe in the path indicates that BIP32 hardened derivation is used.
     *
     * Purpose is a constant set to 44' following the BIP43 recommendation
     * Registered coin types: 0' for Bitcoin
     */
    var accountZero = walletAccount.getMasterKey().deriveHardened(44).deriveHardened(0).deriveHardened(accountIdx);
    walletAccount.externalAccount = accountZero.derive(0);
    walletAccount.internalAccount = accountZero.derive(1);

    var account = new HDAccount(walletAccount, label, this.accountArray.length);

    var extendedPrivateKey = accountZero.toBase58();
    var extendedPublicKey =  accountZero.neutered().toBase58();

    account.extendedPrivateKey = second_password == null ? extendedPrivateKey : MyWallet.encryptSecretWithSecondPassword(extendedPrivateKey, second_password, MyWallet.getSharedKey());
    account.extendedPublicKey = extendedPublicKey;

    account.generateCache();

    this.accountArray.push(account);

    return account;
  };

};



function buildHDWallet(seedHexString, accountsArrayPayload, bip39Password, secondPassword, success, error) {
    var hdwallet = new HDWallet(seedHexString, bip39Password, secondPassword);

    for (var i = 0; i < accountsArrayPayload.length; i++) {
        var accountPayload = accountsArrayPayload[i];
        var hdaccount;

        if (accountPayload.archived == true) {
            hdaccount = hdwallet.createArchivedAccount(accountPayload.label, accountPayload.xpriv, accountPayload.xpub)
            hdaccount.setIsArchived(true);
            hdwallet.accountArray.push(hdaccount);
        } else {
            // This is called when a wallet is loaded, not when it's initially created. 
            // If second password is enabled then accountPayload.xpriv has already been 
            // encrypted. We're keeping it in an encrypted state.

            if(accountPayload.cache == undefined || accountPayload.cache.externalAccountPubKey == undefined) {
                hdaccount = hdwallet.createAccountFromExtKey(accountPayload.label, accountPayload.xpriv, accountPayload.xpub);
                hdaccount.generateCache();
                hdwallet.accountArray.push(hdaccount);
                MyWallet.backupWalletDelayed();
            } else {
                var cache = {
                    externalAccountPubKey: Bitcoin.ECPubKey.fromBuffer(JSONB.parse(accountPayload.cache.externalAccountPubKey)),
                    externalAccountChainCode: JSONB.parse(accountPayload.cache.externalAccountChainCode),
                    internalAccountPubKey: Bitcoin.ECPubKey.fromBuffer(JSONB.parse(accountPayload.cache.internalAccountPubKey)),
                    internalAccountChainCode: JSONB.parse(accountPayload.cache.internalAccountChainCode)
                };

                hdaccount = hdwallet.createAccountFromExtKey(accountPayload.label, accountPayload.xpriv, accountPayload.xpub, cache);
                hdaccount.cache = accountPayload.cache;
                hdwallet.accountArray.push(hdaccount);

            }
            hdaccount.setIsArchived(false);

        }

        hdaccount.receiveAddressCount = accountPayload.receive_address_count ? accountPayload.receive_address_count : 0;
        hdaccount.changeAddressCount = accountPayload.change_address_count ? accountPayload.change_address_count : 0;
        hdaccount.address_labels = accountPayload.address_labels ? accountPayload.address_labels : [];
    }

    success && success(hdwallet);
}

function recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback) {
    var LOOK_AHEAD_ADDRESS_COUNT = 20;
    var accountIdx = 0;

    var continueLookingAheadAccount = true;

    while(continueLookingAheadAccount) {
        var account = hdwallet.createAccount("Account " + accountIdx.toString(), secondPassword);


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

function recoverHDWalletFromSeedHex(seedHex, bip39Password, secondPassword, successCallback, errorCallback) {
    var hdwallet = new HDWallet(seedHex, bip39Password, secondPassword);
    recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback);
}

function recoverHDWalletFromMnemonic(passphrase, bip39Password, secondPassword, successCallback, errorCallback) {
    var hdwallet = new HDWallet(passphraseToPassphraseHexString(passphrase), bip39Password, secondPassword);
    recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback);
}
