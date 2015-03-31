(function() {
  this.WalletStore = (function() {
    var address_book, currencyCodeToCurrency, didUpgradeToHd, languageCodeToLanguage, mnemonicVerified, transactions, xpubs;
    languageCodeToLanguage = {
      'de': 'German',
      'hi': 'Hindi',
      'no': 'Norwegian',
      'ru': 'Russian',
      'pt': 'Portuguese',
      'bg': 'Bulgarian',
      'fr': 'French',
      'zh-cn': 'Chinese Simplified',
      'hu': 'Hungarian',
      'sl': 'Slovenian',
      'id': 'Indonesian',
      'sv': 'Swedish',
      'ko': 'Korean',
      'el': 'Greek',
      'en': 'English',
      'it': 'Italiano',
      'es': 'Spanish',
      'vi': 'Vietnam',
      'th': 'Thai',
      'ja': 'Japanese',
      'pl': 'Polski',
      'da': 'Danish',
      'ro': 'Romanian',
      'nl': 'Dutch',
      'tr': 'Turkish'
    };
    currencyCodeToCurrency = {
      'ISK': 'lcelandic Króna',
      'HKD': 'Hong Kong Dollar',
      'TWD': 'New Taiwan Dollar',
      'CHF': 'Swiss Franc',
      'EUR': 'Euro',
      'DKK': 'Danish Krone',
      'CLP': 'Chilean, Peso',
      'USD': 'U.S. Dollar',
      'CAD': 'Canadian Dollar',
      'CNY': 'Chinese Yuan',
      'THB': 'Thai Baht',
      'AUD': 'Australian Dollar',
      'SGD': 'Singapore Dollar',
      'KRW': 'South Korean Won',
      'JPY': 'Japanese Yen',
      'PLN': 'Polish Zloty',
      'GBP': 'Great British Pound',
      'SEK': 'Swedish Krona',
      'NZD': 'New Zealand Dollar',
      'BRL': 'Brazil Real',
      'RUB': 'Russian Ruble'
    };
    mnemonicVerified = false;
    xpubs = [];
    transactions = [];
    didUpgradeToHd = null;
    address_book = {};
    return {
      getLanguages: function() {
        return languageCodeToLanguage;
      },
      getCurrencies: function() {
        return currencyCodeToCurrency;
      },
      didVerifyMnemonic: function() {
        mnemonicVerified = true;
        MyWallet.backupWalletDelayed();
      },
      setMnemonicVerified: function(bool) {
        mnemonicVerified = bool;
      },
      isMnemonicVerified: function() {
        return mnemonicVerified;
      },
      setEmptyXpubs: function() {
        xpubs = [];
      },
      pushXpub: function(xpub) {
        xpubs.push(xpub);
      },
      getXpubs: function() {
        return xpubs;
      },
      getTransactions: function() {
        return transactions;
      },
      getAllTransactions: function() {
        var i, len, ref, results, tx;
        ref = WalletStore.getTransactions();
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          tx = ref[i];
          results.push(MyWallet.processTransaction(tx));
        }
        return results;
      },
      didUpgradeToHd: function() {
        return didUpgradeToHd;
      },
      setDidUpgradeToHd: function(bool) {
        didUpgradeToHd = bool;
      },
      getAddressBook: function() {
        return address_book;
      },
      getAddressBookLabel: function(address) {
        return address_book[address];
      },
      deleteAddressBook: function(addr) {
        delete address_book[addr];
        MyWallet.backupWalletDelayed();
      },
      addAddressBookEntry: function(addr, label) {
        var isValidLabel;
        isValidLabel = MyWallet.isAlphaNumericSpace(label) && MyWallet.isValidAddress(addr);
        if (isValidLabel) {
          address_book[addr] = label;
        }
        return isValidLabel;
      },
      newAddressBookFromJSON: function(addressBook) {
        var entry, i, len;
        address_book = {};
        if (addressBook != null) {
          for (i = 0, len = addressBook.length; i < len; i++) {
            entry = addressBook[i];
            this.addAddressBookEntry(entry.addr, entry.label);
          }
        }
      }
    };
  })();

}).call(this);
