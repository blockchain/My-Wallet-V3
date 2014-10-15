function HDAccount(wallet, label) {
    var accountObject = {
        wallet : wallet,
        label : label,
        archived : false,
        paymentRequests : [],
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
        getTransactions : function() {
            var idx = this.idx;
            
            var transactions = [];
          
            var rawTxs = MyWallet.getTransactions().filter(function(element) { 
               return element.account_indexes.indexOf(idx) != -1; 
            }); // TODO: Don't call MyWallet like this
            
            // console.log("Raw:");
            // console.log(rawTxs);
            
            for (var i in rawTxs) {
              var tx = rawTxs[i];
              var transaction = {};
              
              // Default values:
              transaction.to_account= null;
              transaction.from_account = null;
              transaction.to_address = null;
              transaction.from_address = null;
              
              // Figure out if we were the sender:
              // If the first output is a receive address, it was us. TODO: more reliable method
              isOrigin = this.isAddressPartOfAccount(tx.out[0].addr)
              
              transaction.intraWallet = false; // TODO: determine value
              transaction.hash = tx.hash;
              
              if(isOrigin) {
                transaction.to_account = idx;
                transaction.from_address = tx.inputs[0].prev_out.addr // TODO: get from address reliably
                transaction.amount = tx.out[0].value;
              } else {
                transaction.from_account = idx;
                transaction.to_address = tx.out[0].addr // TODO: get to address reliably
                transaction.amount = -tx.out[0].value;

              }
              
              // transaction.note = tx.note ? tx.note : tx_notes[tx.hash];

              if (tx.time > 0) {
                transaction.txTime = new Date(tx.time * 1000);
              }
              
              transactions.push(transaction);
            }
            
            return transactions;
        },
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

        for (var j = 0; j < external_addresses; j++) {
            var address = hdaccount.generateAddress();
            console.log("\taddress: ", address);
        }

        for (var k = 0; k < change_addresses; k++) {
            var changeAddress = hdaccount.generateChangeAddress();
            console.log("\tchangeAddress: ", address);
        }
    }

    return hdwallet;
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
