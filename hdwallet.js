function HDAccount(wallet, label) {
    var accountObject = {
        wallet : wallet,
        label : label,
        getLabel : function() {
            return this.label;
        },
        setLabel : function(label) {
            this.label = label;
        },
        getAccountMainKey : function() {
            return this.wallet.getExternalAccount().toBase58();
        },
        getAccountChangeKey : function() {
            return this.wallet.getInternalAccount().toBase58();
        }
    };

    return accountObject;
}

function HDWallet(seed) {
    var walletObject = {
        accountArray : [],
        seed : seed,
        getAccount : function(accountIdx) {
            return this.accountArray[accountIdx];
        },
        createAccount : function(label) {
            var accountIdx = this.accountArray.length;

            var walletAccount = new Bitcoin.Wallet(this.seed);
            walletAccount.accountZero = walletAccount.getMasterKey().deriveHardened(0).derive(accountIdx);
            walletAccount.externalAccount = walletAccount.getAccountZero().derive(0);
            walletAccount.internalAccount = walletAccount.getAccountZero().derive(1);

            var account = HDAccount(walletAccount, label);
            this.accountArray.push(account);

            return walletAccount;
        }
    };

    return walletObject;
}

function test() {
    var passphrase = "don't use a string seed like this in real life";
    var seed = Bitcoin.crypto.sha256(passphrase);
    var hdwallet = HDWallet(seed);
    hdwallet.createAccount("Rothbard");
    console.log("getAccountMainKey: ", hdwallet.getAccount(0).getAccountMainKey());
    console.log("getAccountChangeKey: ", hdwallet.getAccount(0).getAccountChangeKey());
}

test();