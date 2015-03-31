(function() {
  this.WalletStore = (function() {
    var currencyCodeToCurrency, didUpgradeToHd, languageCodeToLanguage, mnemonicVerified, transactions, xpubs;
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
        var filteredTransactions, i, rawTxs, transaction;
        filteredTransactions = [];
        rawTxs = WalletStore.getTransactions();
        for (i in rawTxs) {
          transaction = MyWallet.processTransaction(rawTxs[i]);
          filteredTransactions.push(transaction);
        }
        return filteredTransactions;
      },
      didUpgradeToHd: function() {
        return didUpgradeToHd;
      },
      setDidUpgradeToHd: function(bool) {
        didUpgradeToHd = bool;
      }
    };
  })();

}).call(this);
