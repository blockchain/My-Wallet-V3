(function() {
  var hasProp = {}.hasOwnProperty;

  this.WalletStore = (function() {
    var address_book, addresses, currencyCodeToCurrency, didUpgradeToHd, languageCodeToLanguage, mnemonicVerified, transactions, unsafeAddLegacyAddress, xpubs;
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
    addresses = {};
    didUpgradeToHd = null;
    address_book = {};
    unsafeAddLegacyAddress = function(key) {
      if ((key.addr == null) || !MyWallet.isAlphaNumericSpace(key.addr)) {
        return MyWallet.sendEvent("msg", {
          type: "error",
          message: 'Your wallet contains an invalid address. This is a sign of possible corruption, please double check all your BTC is accounted for. Backup your wallet to remove this error.'
        });
      } else {
        if (key.tag === 1 || !MyWallet.isAlphaNumericSpace(key.tag)) {
          key.tag = null;
        }
        if ((key.label != null) && !MyWallet.isAlphaNumericSpace(key.tag)) {
          key.label = null;
        }
        return addresses[key.addr] = key;
      }
    };
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
      },
      newLegacyAddressesFromJSON: function(keysArray) {
        var i, key, len, results;
        results = [];
        for (i = 0, len = keysArray.length; i < len; i++) {
          key = keysArray[i];
          results.push(unsafeAddLegacyAddress(key));
        }
        return results;
      },
      getAddresses: function() {
        return addresses;
      },
      getAddress: function(address) {
        if (address in addresses) {
          return addresses[address];
        } else {
          return null;
        }
      },
      legacyAddressExists: function(address) {
        return address in addresses;
      },
      getLegacyAddressTag: function(address) {
        if (address in addresses) {
          return addresses[address].tag;
        } else {
          return null;
        }
      },
      setLegacyAddressTag: function(address, tag) {
        addresses[address].tag = tag;
      },
      getLegacyAddressLabel: function(address) {
        if (address in addresses) {
          return addresses[address].label;
        } else {
          return null;
        }
      },
      setLegacyAddressBalance: function(address, balance) {
        addresses[address].balance = balance;
      },
      isActiveLegacyAddress: function(address) {
        return (address in addresses) && (addresses[address].tag !== 2);
      },
      isWatchOnlyLegacyAddress: function(address) {
        return (address in addresses) && (addresses[address].priv == null);
      },
      getLegacyAddressBalance: function(address) {
        if (address in addresses) {
          return addresses[address].balance;
        } else {
          return null;
        }
      },
      getTotalBalanceForActiveLegacyAddresses: function() {
        var k, o;
        return ((function() {
          var results;
          results = [];
          for (k in addresses) {
            if (!hasProp.call(addresses, k)) continue;
            o = addresses[k];
            if (o.tag !== 2) {
              results.push(o.balance);
            }
          }
          return results;
        })()).reduce((function(x, y) {
          return x + y;
        }), 0);
      },
      deleteLegacyAddress: function(address) {
        delete addresses[address];
        MyWallet.backupWalletDelayed();
      },
      getPrivateKey: function(address) {
        if (address in addresses) {
          return addresses[address].priv;
        } else {
          return null;
        }
      },
      setLegacyAddressLabel: function(address, label, success, error) {
        if (label.length > 0 && !MyWallet.isAlphaNumericSpace(label)) {
          return error && error();
        } else {
          addresses[address].label = label;
          MyWallet.backupWalletDelayed();
          return success && success();
        }
      },
      unArchiveLegacyAddr: function(address) {
        var addr;
        addr = addresses[address];
        if (addr.tag === 2) {
          addr.tag = null;
          return MyWallet.backupWalletDelayed('update', function() {
            return MyWallet.get_history();
          });
        } else {
          return MyWallet.sendEvent("msg", {
            type: "error",
            message: 'Cannot Unarchive This Address'
          });
        }
      },
      archiveLegacyAddr: function(address) {
        var addr;
        addr = addresses[address];
        if (addr.tag === null || addr.tag === 0) {
          addr.tag = 2;
          return MyWallet.backupWalletDelayed('update', function() {
            return MyWallet.get_history();
          });
        } else {
          return MyWallet.sendEvent("msg", {
            type: "error",
            message: 'Cannot Archive This Address'
          });
        }
      },
      getAllLegacyAddresses: function() {
        var k, results;
        results = [];
        for (k in addresses) {
          if (!hasProp.call(addresses, k)) continue;
          results.push(k);
        }
        return results;
      },
      getPreferredLegacyAddress: function() {
        var k, o;
        return ((function() {
          var results;
          results = [];
          for (k in addresses) {
            if (!hasProp.call(addresses, k)) continue;
            o = addresses[k];
            if ((o.priv != null) && this.isActiveLegacyAddress(k)) {
              results.push(k);
            }
          }
          return results;
        }).call(this))[0];
      },
      hasLegacyAddresses: function() {
        return Object.keys(addresses).length !== 0;
      },
      getLegacyActiveAddresses: function() {
        var k, results;
        results = [];
        for (k in addresses) {
          if (!hasProp.call(addresses, k)) continue;
          if (this.isActiveLegacyAddress(k)) {
            results.push(k);
          }
        }
        return results;
      },
      getLegacyArchivedAddresses: function() {
        var k, results;
        results = [];
        for (k in addresses) {
          if (!hasProp.call(addresses, k)) continue;
          if (!this.isActiveLegacyAddress(k)) {
            results.push(k);
          }
        }
        return results;
      },
      mapToLegacyAddressesPrivateKeys: function(f) {
        var k, o;
        for (k in addresses) {
          if (!hasProp.call(addresses, k)) continue;
          o = addresses[k];
          if (o.priv != null) {
            o.priv = f(o.priv);
          }
        }
      },
      tagLegacyAddressesAsSaved: function() {
        var k, o;
        for (k in addresses) {
          if (!hasProp.call(addresses, k)) continue;
          o = addresses[k];
          if (o.tag === 1) {
            delete o.tag;
          }
        }
      },
      addLegacyKey: function(address, privKey) {
        var existing;
        console.log("festa aqui ara");
        existing = addresses[address];
        if ((existing == null) || existing.length === 0) {
          addresses[address] = {
            addr: address,
            priv: privKey,
            balance: null
          };
          return true;
        } else {
          if ((existing.priv == null) && (privKey != null)) {
            existing.priv = privKey;
            return true;
          } else {
            return false;
          }
        }
      }
    };
  })();

}).call(this);
