//------
//Should find somewhere else for these

function parseValueBitcoin(valueString) {
  var valueString = valueString.toString();
  // TODO: Detect other number formats (e.g. comma as decimal separator)
  var valueComp = valueString.split('.');
  var integralPart = valueComp[0];
  var fractionalPart = valueComp[1] || "0";
  while (fractionalPart.length < 8) fractionalPart += "0";
  fractionalPart = fractionalPart.replace(/^0+/g, '');
  var value = BigInteger.valueOf(parseInt(integralPart));
  value = value.multiply(BigInteger.valueOf(100000000));
  value = value.add(BigInteger.valueOf(parseInt(fractionalPart)));
  return value;
}

//user precision (e.g. BTC or mBTC) to satoshi big int
function precisionToSatoshiBN(x) {
  return parseValueBitcoin(x).divide(BigInteger.valueOf(Math.pow(10, sShift(symbol_btc)).toString()));
}

//-----

var BigInteger = Browserify.BigInteger;
var Buffer = Browserify.Buffer.Buffer;
var Bitcoin = Browserify.Bitcoin;
var ECKey = Bitcoin.ECKey;
var assert = Browserify.assert;
var JSONB = Browserify.JSONB;
var SHA256 = Browserify.SHA256;
var Unorm = Browserify.Unorm;

var MyWallet = new function() {

  var MyWallet = this;

  var demo_guid = 'abcaa314-6f67-6705-b384-5d47fbe9d7cc';
  var encrypted_wallet_data; //Encrypted wallet data (Base64, AES 256)
  var guid; //Wallet identifier
  var password; //Password
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
  var default_pbkdf2_iterations = 5000;
  var tx_notes = {}; //A map of transaction notes, hash -> note
  var auth_type; //The two factor authentication type used. 0 for none.
  var real_auth_type = 0; //The real two factor authentication. Even if there is a problem with the current one (for example error 2FA sending email).
  var logout_timeout; //setTimeout return value for the automatic logout
  var event_listeners = []; //Emits Did decrypt wallet event (used on claim page)
  var isInitialized = false;
  var language = 'en'; //Current language
  var localSymbolCode = null; //Current local symbol
  var supported_encryption_version = 3.0;  //The maxmimum supported encryption version
  var serverTimeOffset = 0; //Difference between server and client time
  var haveSetServerTime = false; //Whether or not we have synced with server time
  var sharedcoin_endpoint; //The URL to the sharedcoin node
  var disable_logout = false;
  var isRestoringWallet = false;
  var sync_pubkeys = false;
  var legacyAddressesNumTxFetched = 0;
  var numOldTxsToFetchAtATime = 10; 
  var myHDWallet = null;
  var isSynchronizedWithServer = true;
  var localWalletJsonString = null;
  var haveBuildHDWallet = false;
  var tx_tags = {};
  var tag_names = [];
  var paidTo = {};
  var mnemonicVerified = false;
  var defaultAccountIdx = 0;
  var didSetGuid = false;
  var amountToRecommendedFee = {};
  var isAccountRecommendedFeesValid = true;
  var api_code = "0";
  var counter = 0;
  var isPolling = false;
  var didUpgradeToHd = null;
  var xpubs = [];

  var wallet_options = {
    pbkdf2_iterations : default_pbkdf2_iterations, //Number of pbkdf2 iterations to default to for main password, second password and dpasswordhash
    fee_policy : 0,  //Default Fee policy (-1 Tight, 0 Normal, 1 High)
    html5_notifications : false, //HTML 5 Desktop notifications
    logout_time : 600000, //Default 10 minutes
    tx_display : 0, //Compact or detailed transactions
    always_keep_local_backup : false, //Whether to always keep a backup in localStorage regardless of two factor authentication
    transactions_per_page : 30, //Number of transactions per page
    additional_seeds : []
  };

  /**
   * @return {boolean} returns whether an hd wallet exist in json or null if unknown
   */
  this.didUpgradeToHd = function() {
    return didUpgradeToHd;
  };

  /**
   * @param {string} val api code
   */
  this.setAPICode = function(val) {
    api_code = val;
  };

  /**
   * @return {string} api code
   */
  this.getAPICode = function() {
    return api_code;
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


    // Disable local wallet cache
    // try {
    //     //Save Payload when two factor authentication is disabled
    //     if (real_auth_type == 0 || wallet_options.always_keep_local_backup)
    //         MyStore.put('payload', encrypted_wallet_data);
    //     else
    //         MyStore.remove('payload');
    // } catch (e) {
    //     console.log(e);
    // }
  };

  /**
   * set mnemonic to be verified and backups wallet
   */
  this.didVerifyMnemonic = function() {
    mnemonicVerified = true;
    MyWallet.backupWalletDelayed();
  };

  /**
   * @return {boolean} whether mnemonic is verified
   */
  this.isMnemonicVerified = function() {
    return mnemonicVerified;
  };

  /**
   * Set default Account Index and backup wallet.
   * @param {number} accountIdx default Account Index
   */
  this.setDefaultAccountIndex = function(accountIdx) {
    defaultAccountIdx = accountIdx;
    MyWallet.backupWalletDelayed();
  };

  /**
   * @return {number} default Account Index
   */
  this.getDefaultAccountIndex = function() {
    return defaultAccountIdx;
  };

  /**
   * @return {boolean} is wallet payload synchronized with server
   */
  this.isSynchronizedWithServer = function() {
    return isSynchronizedWithServer;
  };

  /**
   * @param {number} val auth type
   */
  this.setRealAuthType = function(val) {
    real_auth_type = val;
  };

  /**
   * @return {number} 2FA type
   */
  this.get2FAType = function() {
    return real_auth_type;
  };

  /**
   * @return {string} 2FA type string
   */
  this.get2FATypeString = function() {
    if (real_auth_type == 0) {
      return null;
    } else if (real_auth_type == 1) {
      return 'Yubikey';
    } else if (real_auth_type == 2) {
      return 'Email';
    } else if (real_auth_type == 3) {
      return 'Yubikey MtGox';

    } else if (real_auth_type == 4) {
      return 'Google Auth';
    } else if (real_auth_type == 5) {
      return 'SMS';
    }
  };

  this.addAdditionalSeeds = function(val) {
    wallet_options.additional_seeds.push(val);
  };

  this.getAdditionalSeeds = function(val) {
    return wallet_options.additional_seeds;
  };

  this.getLanguage = function() {
    if (language) {
      return language;
    } else {
      return MyStore.get('language');
    }
  };

  this.setLanguage = function(_language) {
    MyStore.put('language', _language);
    language = _language;
  };

  /**
   * Get currency code stored in memory or in local storage.
   * @return {string} fiat currency code (e.g. USD)
   */
  this.getLocalSymbolCode = function() {
    if (localSymbolCode) {
      return localSymbolCode;
    } else {
      return MyStore.get('localSymbolCode');
    }
  };

  /**
   * Store currency code in memory and in local storage.
   * @param {string} code fiat currency code (e.g. USD)
   */
  this.setLocalSymbolCode = function(code) {
    MyStore.put('localSymbolCode', code);
    symbol_local.code = code;
    localSymbolCode = code;
  };

  this.addEventListener = function(func) {
    event_listeners.push(func);
  };

  this.sendEvent = function(event_name, obj) {
    for (var listener in event_listeners) {
      event_listeners[listener](event_name, obj);
    }
  };

  this.getLogoutTime = function() {
    return wallet_options.logout_time;
  };

  this.getDefaultPbkdf2Iterations = function() {
    return default_pbkdf2_iterations;
  };

  this.getPbkdf2Iterations = function() {
    return wallet_options.pbkdf2_iterations;
  };

  this.getSharedKey = function() {
    return sharedKey;
  };

  this.getSharedcoinEndpoint = function() {
    return sharedcoin_endpoint;
  };

  this.disableLogout = function(value) {
    disable_logout = value;
  };

  this.isLogoutDisabled = function() {
    return disable_logout;
  };

  this.getFinalBalance = function() {
    return final_balance;
  };

  this.getTotalSent = function() {
    return total_sent;
  };

  this.getTotalReceived = function() {
    return total_received;
  };

  this.setLogoutTime = function(logout_time) {
    wallet_options.logout_time = logout_time;

    clearInterval(logout_timeout);

    logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
  };

  this.getDoubleEncryption = function() {
    return double_encryption;
  };

  this.setDoubleEncryption = function(newValue) {
    double_encryption = newValue;
  };

  this.getEncryptedWalletData = function() {
    return encrypted_wallet_data;
  };

  this.getFeePolicy = function() {
    return wallet_options.fee_policy;
  };

  this.setFeePolicy = function(policy) {
    if (policy != -1 && policy != 0 && policy != 1)
      throw 'Invalid fee policy';

    wallet_options.fee_policy = parseInt(policy);

    //Fee Policy is stored in wallet so must save it
    MyWallet.backupWallet('update', function() {
      if (successCallback)
        successCallback(response);
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.setAlwaysKeepLocalBackup = function(val) {
    wallet_options.always_keep_local_backup = val;
  };

  this.getAlwaysKeepLocalBackup = function() {
    return wallet_options.always_keep_local_backup;
  };

  this.setNTransactionsPerPage = function(val) {
    wallet_options.transactions_per_page = val;
  };

  this.getNTransactionsPerPage = function() {
    return wallet_options.transactions_per_page;
  };

  this.getGuid = function() {
    return guid;
  };

  this.getHTML5Notifications = function() {
    return wallet_options.html5_notifications;
  };

  this.setHTML5Notifications = function(val) {
    wallet_options.html5_notifications = val;
  };

  this.getNTransactions = function() {
    return n_tx;
  };

  /**
   * @return {Array} get all transactions
   */
  this.getTransactions = function() {
    return transactions;
  };

  /**
   * @return {boolean} legacy Address Exists
   */
  this.legacyAddressExists = function(address) {
    return addresses[address] != null;
  };

  /**
   * @return {string} Legacy Address Tag
   */
  this.getLegacyAddressTag = function(address) {
    return addresses[address].tag;
  };

  /**
   * @param {string} address Bitcoin address.
   * @param {string} tag The tag to set for the given address.
   */
  this.setLegacyAddressTag = function(address, tag) {
    addresses[address].tag = tag;
  };

  this.getAddressBook = function() {
    return address_book;
  };

  /**
   * @return {Array} get legacy address label
   */
  this.getLegacyAddressLabel = function(address) {
    if (addresses[address])
      return addresses[address].label;
    else
      return null;
  };

  /**
   * @param {string} address bitcoin address
   * @param {string} balance
   */
  this.setLegacyAddressBalance = function(address, balance) {
    addresses[address].balance = balance;
  };

  /**
   * @param {string} address bitcoin address
   * @return {boolean} label
   */
  this.getAddressBookLabel = function(address) {
    return address_book[address];
  };

  /**
   * @param {string} addr bitcoin address
   * @return {boolean} whether address is active
   */
  this.isActiveLegacyAddress = function(addr) {
    return addresses[addr] != null && addresses[addr].tag != 2;
  };

  /**
   * @param {string} address bitcoin address
   * @return {boolean} whether address is watch only
   */
  this.isWatchOnlyLegacyAddress = function(address) {
    return !addresses[address] || addresses[address].priv == null;
  };

  /**
   * @param {string} address bitcoin address
   * @return {number} balance
   */
  this.getLegacyAddressBalance = function(address) {
    return addresses[address].balance;
  };

  /**
   * @return {number} total Balance For Active Legacy Addresses
   */
  this.getTotalBalanceForActiveLegacyAddresses = function() {
    var totalBalance = 0;
    for (var key in addresses) {
      var addr = addresses[key];
      if (addr.tag != 2)
        totalBalance += addr.balance;
    }
    return totalBalance;
  };

  this.getMixerFee = function() {
    return mixer_fee;
  };

  this.getRecommendIncludeFee = function() {
    return recommend_include_fee;
  };

  /**
   * @param {string} addr bitcoin address
   */
  this.deleteLegacyAddress = function(addr) {
    delete addresses[addr];
    MyWallet.backupWalletDelayed();
  };

  /**
   * @param {string} addr bitcoin address
   * @param {string} label label
   * @return {boolean} success or not
   */
  this.addAddressBookEntry = function(addr, label) {
    if (! isAlphaNumericSpace(label) || ! MyWallet.isValidAddress(addr))
      return false;
    address_book[addr] = label;
    return true;
  };

  //TODO Depreciate this. Need to restructure signer.js
  this.getPrivateKey = function(address) {
    return addresses[address].priv;
  };

  /**
   * Set the label of a legacy address.
   * @param {string} address The address to set the label for.
   * @param {string} label The new label - must be alpha numeric with spaces, otherwise error() will be called.
   * @param {function()=} success Success callback function.
   * @param {function()=} error Error callback function.
   */
  this.setLegacyAddressLabel = function(address, label, success, error) {
    if (label.length > 0 && !isAlphaNumericSpace(label)) {
      error && error();
    } else {
      addresses[address].label = label;
      MyWallet.backupWalletDelayed();
      success && success();
    }
  };

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

      var SKHashHex = CryptoJS.SHA256(sharedKey.toLowerCase() + timestamp).toString();

      var i = 0;
      var tSKUID = SKHashHex.substring(i, i+=8)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=4)+'-'+SKHashHex.substring(i, i+=12);

      clone.sharedKey = tSKUID;
      clone.sKTimestamp = timestamp;

      // Needed for debugging and as a fallback if totp scheme doesn't work on server
      clone.sKDebugHexHash = SKHashHex;
      clone.sKDebugTimeOffset = serverTimeOffset;
      clone.sKDebugOriginalClientTime = now;
      clone.sKDebugOriginalSharedKey = sharedKey;
    }

    if (!data.guid)
      clone.guid = guid;

    clone.format =  data.format ? data.format : 'plain';
    clone.api_code = MyWallet.getAPICode();

    var dataType = 'text';
    if (data.format == 'json')
      dataType = 'json';

    $.ajax({
      dataType: dataType,
      type: "POST",
      timeout: 60000,
      xhrFields: {
        withCredentials: true
      },
      url: BlockchainAPI.getRootURL() + url,
      data : clone,
      success: success,
      error : error
    });
  };

  /**
   * @param {string} _password main password
   * @return {boolean} is main password correct
   */
  this.isCorrectMainPassword = function(_password) {
    return password == _password;
  };

  function hashPassword(password, iterations) {
    //N rounds of SHA 256
    var round_data = CryptoJS.SHA256(password);
    for (var i = 1; i < iterations; ++i) {
      round_data = CryptoJS.SHA256(round_data);
    }
    return round_data.toString();
  };

  /**
   * Set the number of PBKDF2 iterations used for encrypting the wallet and also the private keys if the second password is enabled.
   * @param {number} pbkdf2_iterations The number of PBKDF2 iterations.
   * @param {function()} success Success callback function.
   * @param {function(?Object)} error Error callback function.
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.setPbkdf2Iterations = function(pbkdf2_iterations, success, error, getPassword) {
    var panic = function(e) {
      console.log('Panic ' + e);

      error(e);

      // If we caught an exception here the wallet could be in a inconsistent state
      // We probably haven't synced it, so no harm done
      // But for now panic!
      window.location.reload();
    };
    /**
     * Reencrypt data with password.
     * The decrypt call uses the currently set number of iterations, the encrypt call uses the new number of iterations we're just setting
     *
     * @param {!string} data The data to encrypt.
     * @param {!string} pw The password used for encryption.
     */
    var reencrypt = function(data, pw) {
      return MyWallet.encrypt(MyWallet.decryptSecretWithSecondPassword(data, pw, sharedKey), sharedKey + pw, pbkdf2_iterations);
    };

    var setPbkdf2IterationsAndBackupWallet = function() {
      wallet_options.pbkdf2_iterations = pbkdf2_iterations;

      success();

      MyWallet.backupWalletDelayed('update', function() {
      }, function(e) {
        panic(e);
      });
    };

    try {
      // If double encryption is enabled we need to re-encrypt all private keys
      if(double_encryption) {
        getPassword(function(pw, correct_password, wrong_password) {
          if (MyWallet.validateSecondPassword(pw)) {
            correct_password();

            // Re-encrypt all legacy keys
            for (var key in addresses) {
              var addr = addresses[key];

              if (addr.priv) {
                addr.priv = reencrypt(addr.priv, pw);

                if (!addr.priv) throw 'Error re-encrypting private key';
              }
            }

            // Re-encrypt all HD account keys
            for (var i in MyWallet.getAccounts()) {
              var account = MyWallet.getHDWallet().getAccount(i);
              account.extendedPrivateKey = reencrypt(account.extendedPrivateKey, pw);

              if (!account.extendedPrivateKey) throw 'Error re-encrypting account private key';
            }

            // Re-encrypt the HD seed
            if (MyWallet.didUpgradeToHd()) {
              MyWallet.getHDWallet().seedHex = reencrypt(MyWallet.getHDWallet().seedHex, pw);

              if (!MyWallet.getHDWallet().seedHex) throw 'Error re-encrypting wallet seed';
            }

            // Generate a new password hash
            dpasswordhash = hashPassword(sharedKey + pw, pbkdf2_iterations);

            setPbkdf2IterationsAndBackupWallet();
          }
          else {
            wrong_password();
          }
        });
      }
      else {
        setPbkdf2IterationsAndBackupWallet();
      }
    } catch (e) {
      panic(e);
    }
  };

  this.B58LegacyDecode = function(input) {
    var alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    var base = BigInteger.valueOf(58);

    var bi = BigInteger.valueOf(0);
    var leadingZerosNum = 0;
    for (var i = input.length - 1; i >= 0; i--) {
      var alphaIndex = alphabet.indexOf(input[i]);

      bi = bi.add(BigInteger.valueOf(alphaIndex)
                  .multiply(base.pow(input.length - 1 -i)));

      // This counts leading zero bytes
      if (input[i] == "1") leadingZerosNum++;
      else leadingZerosNum = 0;
    }
    var bytes = bi.toByteArrayUnsigned();

    // Add leading zeros
    while (leadingZerosNum-- > 0) bytes.unshift(0);

    return bytes;
  };

  /**
   * @param {function()} success callback function
   * @param {function()} error callback function
   */
  this.unsetSecondPassword = function(success, error, getPassword) {
    var panic = function(e) {
      console.log('Panic ' + e);

      //If we caught an exception here the wallet could be in a inconsistent state
      //We probably haven't synced it, so no harm done
      //But for now panic!
      window.location.reload();
    };

    try {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();

          for (var key in addresses) {

            var addr = addresses[key];

            if (addr.priv) {
              addr.priv = MyWallet.decryptSecretWithSecondPassword(addr.priv, pw, sharedKey);

              if (!addr.priv) throw 'addr.priv is null';
            }
          }

          for (var i in MyWallet.getAccounts()) {
            var account = MyWallet.getHDWallet().getAccount(i);
            account.extendedPrivateKey = MyWallet.decryptSecretWithSecondPassword(account.extendedPrivateKey, pw, sharedKey);
          }

          if (MyWallet.didUpgradeToHd()) {
            MyWallet.getHDWallet().seedHex = MyWallet.decryptSecretWithSecondPassword(MyWallet.getHDWallet().seedHex, pw, sharedKey);
          }

          MyWallet.setDoubleEncryption(false);

          MyWallet.checkAllKeys(null);

          MyWallet.backupWallet('update', function() {
            success();
          }, function() {
            panic(e);
            error(e);
          });
        } else {
          wrong_password();
        }
      });
    } catch (e) {
      panic(e);
      error(e);
    }
  };


  /**
   * @param {string} password Second password
   * @param {function()} success callback function
   * @param {function()} error callback function
   */
  this.setSecondPassword = function(password, success, error) {
    var panic = function(e) {
      console.log('Panic ');
      console.log(e);

      //If we caught an exception here the wallet could be in a inconsistent state
      //We probably haven't synced it, so no harm done
      //But for now panic!
      // window.location.reload();
    };

    try {
      MyWallet.setDoubleEncryption(true);

      for (var key in addresses) {
        var addr = addresses[key];

        if (addr.priv) {
          addr.priv = MyWallet.encryptSecretWithSecondPassword(addr.priv, password, MyWallet.getSharedKey());

          if (!addr.priv) throw 'addr.priv is null';
        }
      }

      for (var i in MyWallet.getAccounts()) {
        var account = MyWallet.getHDWallet().getAccount(i);
        account.extendedPrivateKey = MyWallet.encryptSecretWithSecondPassword(account.extendedPrivateKey, password, MyWallet.getSharedKey());
      }

      if (MyWallet.didUpgradeToHd()) {
        MyWallet.getHDWallet().seedHex = MyWallet.encryptSecretWithSecondPassword(MyWallet.getHDWallet().seedHex, password, MyWallet.getSharedKey());
      }

      dpasswordhash = hashPassword(sharedKey + password, MyWallet.getPbkdf2Iterations());

      if (!MyWallet.validateSecondPassword(password)) {
        throw "Invalid Second Password";
      }

      try {
        MyWallet.checkAllKeys(password);

        MyWallet.backupWallet('update', function() {
          success();
        }, function(e) {
          panic(e);
          error(e);
        });
      } catch(e) {
        panic(e);
        error(e);
      }
    } catch(e) {
      panic(e);
      error(e);
    }
  };

  /**
   * Un-archive address, backup wallet and refreshes balances.
   * @param {string} addr bitcoin address
   */
  this.unArchiveLegacyAddr = function(addr) {
    var addr = addresses[addr];
    if (addr.tag == 2) {
      addr.tag = null;


      MyWallet.backupWalletDelayed('update', function() {
        MyWallet.get_history();
      });
    } else {
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Unarchive This Address'});
    }
  };

  /**
   * Archive address, backup wallet and refreshes balances.
   * @param {string} addr bitcoin address
   */
  this.archiveLegacyAddr = function(addr) {
    var addr = addresses[addr];
    if (addr.tag == null || addr.tag == 0) {
      addr.tag = 2;


      MyWallet.backupWalletDelayed('update', function() {
        MyWallet.get_history();
      });

    } else {
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Archive This Address'});
    }
  };

  /**
   * Add watch only address, backup wallet and refreshes balances.
   * @param {string} addressString bitcoin address
   */
  this.addWatchOnlyLegacyAddress = function(addressString) {
    var address = Bitcoin.Address.fromBase58Check(addressString);

    if (address.toString() != addressString) {
      throw 'Inconsistency between addresses';
    }

    try {
      if (internalAddKey(addressString)) {
        MyWallet.sendEvent("msg", {type: "success", message: 'Successfully Added Address ' + address});

        try {
          ws.send('{"op":"addr_sub", "addr":"'+addressString+'"}');
        } catch (e) { }

        //Backup
        MyWallet.backupWallet('update', function() {
          MyWallet.get_history();
        });
      } else {
        throw 'Wallet Full Or Addresses Exists';
      }
    } catch (e) {
      MyWallet.sendEvent("msg", {type: "error", message: e});
    }
  };

  //temperary workaround instead instead of modding bitcoinjs to do it TODO: not efficient
  this.getCompressedAddressString = function(key) {
    return new ECKey(key.d, true).pub.getAddress().toString();
  };
  this.getUnCompressedAddressString = function(key) {
    return new ECKey(key.d, false).pub.getAddress().toString();
  };
  this.getCompressedPubKey = function(key) {
    return new ECKey(key.d, true).pub;
  };
  this.getUncompressedPubKey = function(key) {
    return new ECKey(key.d, false).pub;
  };
  this.getCompressedKey = function(key) {
    return new ECKey(key.d, true);
  };
  this.getUnCompressedAddressString = function(key) {
    return new ECKey(key.d, false).pub.getAddress().toString();
  };

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
  };

  this.simpleInPubKeyHash = function(script) {
    switch (Bitcoin.scripts.classifyInput(script)) {
    case 'pubkeyhash':
      return Bitcoin.crypto.hash160(script.chunks[1]);
    case 'pubkey':
      throw new Error("Script does not contain pubkey.");
    default:
      throw new Error("Encountered non-standard scriptSig");
    }
  };

  /**
   * Import Private Key, backup wallet and refresh balances
   * @param {string} privateKeyString private Key
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   * @param {function(function(string, function, function))} getBIP38Password Get the BIP38 password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getBIP38Password function if the right or wrong password was entered.
   * @param {function()} success callback function
   * @param {function()} alreadyImportedCallback callback function in case the key already exists in the wallet
   * @param {function()} error callback function
   */
  this.importPrivateKey = function(privateKeyString, getPassword, getBIP38Password, success, alreadyImportedCallback, error) {
    function reallyInsertKey(key, compressed, pw) {
      try {
        if (MyWallet.legacyAddressExists(key.pub.getAddress().toString()) &&
            !MyWallet.isWatchOnlyLegacyAddress(key.pub.getAddress().toString())) {
          alreadyImportedCallback();
          return;
        }

        var address = MyWallet.addPrivateKey(key, {compressed : compressed, app_name : APP_NAME, app_version : APP_VERSION}, pw);

        if (!address) {
          throw 'Unable to add private key for bitcoin address ' + addr;
        }

        MyWallet.backupWallet('update', function() {
          MyWallet.get_history();
        });

        success(address);
      } catch (e) {
        error(e);
      }
    }

    var format;
    try {
      format = MyWallet.detectPrivateKeyFormat(privateKeyString);
    }
    catch (e) {
      error(e);
      return;
    }

    if (format == 'bip38') {
      getBIP38Password(function(_password, correct_password, wrong_password) {
        MyWallet.disableLogout(true);
        ImportExport.parseBIP38toECKey(
          privateKeyString, 
          _password, 
          function(key, isCompPoint) {
            MyWallet.disableLogout(false);
            correct_password();
            if(double_encryption) {
              getPassword(function(pw, correct_password, wrong_password) {
                if (MyWallet.validateSecondPassword(pw)) {
                  correct_password();
                  reallyInsertKey(key, isCompPoint, pw);
                } else {
                  wrong_password();
                  error('Second Password incorrect');
                }
              });
            } else {
              reallyInsertKey(key, isCompPoint, null);
            }
          }, 
          function() {
            MyWallet.disableLogout(false);
            wrong_password();
          },
          function(e) {
            MyWallet.disableLogout(false);
            error(e);
          }
        );
      });

      return;
    }

    var key;
    try {
      key = MyWallet.privateKeyStringToKey(privateKeyString, format);
    }
    catch (e) {
      error(e);
      return;
    }

    if(double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          reallyInsertKey(key, (format == 'compsipa'), pw);
        } else {
          wrong_password();
          error('Second Password incorrect');
        }
      });
    } else {
      reallyInsertKey(key, (format == 'compsipa'), null);
    }
  };

  //opts = {compressed, app_name, app_version, created_time}
  this.addPrivateKey = function(key, opts, second_password) {
    if (walletIsFull()) {
      throw 'Wallet is full.';
    }

    if (key == null) {
      throw 'Cannot add null key.';
    }

    if (opts == null)
      opts = {compressed: true};

    var addr = opts.compressed ? MyWallet.getCompressedAddressString(key) : MyWallet.getUnCompressedAddressString(key);

    var base58 = Browserify.Base58.encode(key.d.toBuffer(32));

    var encoded = second_password == null ? base58 : MyWallet.encryptSecretWithSecondPassword(base58, second_password, MyWallet.getSharedKey());

    if (encoded == null) {
      throw 'Error Encoding key';
    }

    var decoded_base_58 = second_password == null ? base58 : MyWallet.decryptSecretWithSecondPassword(encoded, second_password, sharedKey);

    var decoded_key = new ECKey(new BigInteger.fromBuffer(decoded_base_58), opts.compressed);

    if (addr != MyWallet.getUnCompressedAddressString(key) && addr != MyWallet.getCompressedAddressString(key)) {
      throw 'Decoded Key address does not match generated address';
    }

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
  };

  this.generateNewKey = function(_password) {
    var key = Bitcoin.ECKey.makeRandom(true);

    // key is uncompressed, so cannot passed in opts.compressed = true here
    if (MyWallet.addPrivateKey(key)) {
      return key;
    }
  };

  this.generateNewMiniPrivateKey = function() {
    // Documentation: https://en.bitcoin.it/wiki/Mini_private_key_format
    while (true) {
      //Use a normal ECKey to generate random bytes
      var key = Bitcoin.ECKey.makeRandom(false);

      //Make Candidate Mini Key
      var minikey = 'S' + Browserify.Base58.encode(key.d.toBuffer(32)).substr(0, 21);

      //Append ? & hash it again
      var bytes_appended = SHA256(minikey + '?', {asBytes: true});

      //If zero byte then the key is valid
      if (bytes_appended[0] == 0) {

        //SHA256
        var bytes = SHA256(minikey, {asBytes: true});

        var eckey = new Bitcoin.ECKey(new BigInteger.fromBuffer(bytes), false);

        if (MyWallet.addPrivateKey(eckey, {compressed: true}))
          return {key : eckey, miniKey : minikey};
      }
    }
  };

  function calcTxResult(tx, is_new, checkCompleted, incrementAccountTxCount) {
    /* Calculate the result */
    var result = 0;
    var account2HasIncrementAccountTxCount = {};
    var hasCountedlegacyAddressesNTxs = false;
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

      if (hasCountedlegacyAddressesNTxs == false && MyWallet.isActiveLegacyAddress(output.addr)) {
        hasCountedlegacyAddressesNTxs = true;
        if (! incrementAccountTxCount) {
          legacyAddressesNumTxFetched += 1;
        }
      }

      for (var j = 0; j < MyWallet.getAccountsCount(); j++) {
        var account = MyWallet.getHDWallet().getAccount(j);
        if (!account.isArchived() && output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
          if (account2HasIncrementAccountTxCount[output.xpub] != true) {
            account2HasIncrementAccountTxCount[output.xpub] = true;
            if (incrementAccountTxCount) {
              account.n_tx += 1;
            } else {
              account.n_tx += 1;
              account.numTxFetched += 1;
            }
          }

          var path = output.xpub.path.split("/");
          path[1] = parseInt(path[1]);
          path[2] = parseInt(path[2]);
          if (path[1] == 0 && account.receiveAddressCount <= path[2]) {
            account.receiveAddressCount = path[2]+1;
          } else if (path[1] == 1 && account.changeAddressCount <= path[2]) {
            account.changeAddressCount = path[2]+1;
          }

          tx.account_indexes.push(parseInt(j));
          result -= parseInt(output.value);
        }
      }
    }

    for (var i = 0; i < tx.out.length; ++i) {
      var output = tx.out[i];

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

      if (hasCountedlegacyAddressesNTxs == false && MyWallet.isActiveLegacyAddress(output.addr)) {
        hasCountedlegacyAddressesNTxs = true;
        if (! incrementAccountTxCount) {
          legacyAddressesNumTxFetched += 1;
        } 
      }

      for (var j = 0; j < MyWallet.getAccountsCount(); j++) {
        var account = MyWallet.getHDWallet().getAccount(j);
        if (!account.isArchived() && output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
          if (account2HasIncrementAccountTxCount[output.xpub] != true) {
            account2HasIncrementAccountTxCount[output.xpub] = true;
            if (incrementAccountTxCount) {
              account.n_tx += 1;
            } else {
              account.n_tx += 1;
              account.numTxFetched += 1;
            }
          }

          var path = output.xpub.path.split("/");
          path[1] = parseInt(path[1]);
          path[2] = parseInt(path[2]);
          if (path[1] == 0 && account.receiveAddressCount <= path[2]) {
            account.receiveAddressCount = path[2]+1;;
          } else if (path[1] == 1 && account.changeAddressCount <= path[2]) {
            account.changeAddressCount = path[2]+1;;
          }

          tx.account_indexes.push(parseInt(j));
          result += parseInt(output.value);
        }
      }

    }

    return result;
  }

  function generatePayloadChecksum() {
    return CryptoJS.SHA256(encrypted_wallet_data).toString();
  }

  function wsSuccess(ws) {
    var last_on_change = null;

    ws.onmessage = function(message) {

      try {
        var obj = $.parseJSON(message.data);

        if (obj.op == 'on_change') {
          var old_checksum = generatePayloadChecksum();
          var new_checksum = obj.checksum;

          console.log('On change old ' + old_checksum + ' ==  new '+ new_checksum);

          if (last_on_change != new_checksum && old_checksum != new_checksum) {
            last_on_change = new_checksum;

            MyWallet.getWallet();
          }

        } else if (obj.op == 'utx') {
          isAccountRecommendedFeesValid = false;

          var tx = TransactionFromJSON(obj.x);

          var tx_processed = MyWallet.processTransaction(tx);
          var tx_account = tx_processed.to.account;

          //Check if this is a duplicate
          //Maybe should have a map_prev to check for possible double spends
          for (var key in transactions) {
            if (transactions[key].txIndex == tx.txIndex) return;
          }

          var result = calcTxResult(tx, true, false, true);

          tx.result = result;

          final_balance += result;

          if (tx_account) MyWallet.getAccount(tx_account.index).setBalance(final_balance);

          n_tx++;

          tx.setConfirmations(0);

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
        if (message && message.data) {
          console.log('WebSocket error: ' + message.data);
        }
        else {
          console.log(e);
        }
      }
    };

    ws.onopen = function() {
      MyWallet.sendEvent('ws_on_open');

      var msg = '{"op":"blocks_sub"}';

      if (guid != null)
        msg += '{"op":"wallet_sub","guid":"'+guid+'"}';

      try {
        var addrs = MyWallet.getLegacyActiveAddresses();
        for (var key in addrs) {
          msg += '{"op":"addr_sub", "addr":"'+ addrs[key] +'"}'; //Subscribe to transactions updates through websockets
        }

        if (MyWallet.getHDWallet() != null)
          MyWallet.listenToHDWalletAccounts();

      } catch (e) {
        MyWallet.sendEvent("msg", {type: "error", message: 'error with websocket'});
      }

      ws.send(msg);
    };

    ws.onclose = function() {
      MyWallet.sendEvent('ws_on_close');

    };
  }

  var logout_status = 'ok';

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

    var privWif = Browserify.Base58.encode(new Buffer(bytes));

    return privWif;
  };

  function noConvert(x) { return x; }
  function base58ToBase58(x) { return MyWallet.decryptSecretWithSecondPasswordIfNeeded(x); }
  function base58ToBase64(x) { var bytes = MyWallet.decodePK(x); return Crypto.util.bytesToBase64(bytes); }
  function base58ToHex(x) { var bytes = MyWallet.decodePK(x); return Crypto.util.bytesToHex(bytes); }
  this.base58ToSipa = function(x, addr) {
    return MyWallet.pkBytesToSipa(MyWallet.decodePK(x), addr);
  };

  this.getExtPrivKeyForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getAccountExtendedKey(true);
  };

  this.getExtPubKeyForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getAccountExtendedKey(false);
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {string} account label
   */
  this.getLabelForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getLabel();
  };
  
  /**
   * Validates proposed label for account
   * @param {string} label account label
   * @return {boolean} success or not
   */
  this.validateAccountLabel = function(label) {
    if (! isAlphaNumericSpace(label))
      return false;
    
    if (!label || label == "" || label.length > 17)
      return false;
    
    return true;
  };

  /**
   * Set label for account and backup wallet.
   * @param {number} accountIdx index of HD wallet account
   * @param {string} label account label
   * @return {boolean} success or not
   */
  this.setLabelForAccount = function(accountIdx, label) {
    if (!this.validateAccountLabel(label))
      return false;
      
    MyWallet.getHDWallet().getAccount(accountIdx).setLabel(label);
    MyWallet.backupWalletDelayed();
    return true;
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {boolean} is account archived
   */
  this.isArchivedForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).isArchived();
  };

  /**
   * Set account archived flag to isArchived and backup wallet.
   * @param {number} accountIdx index of HD wallet account
   * @param {boolean} isArchived is archived
   */
  this.setIsArchivedForAccount = function(accountIdx, isArchived) {
    MyWallet.getHDWallet().getAccount(accountIdx).setIsArchived(isArchived);
    MyWallet.backupWalletDelayed('update', function() {
      MyWallet.get_history();
    });
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {number} balance of account in satoshis
   */
  this.getBalanceForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getBalance();
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {number} number of transactions for account
   */
  this.getNumberOfTransactionsForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).n_tx;
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {string} next unused address
   */
  this.getReceivingAddressForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getReceivingAddress();
  };

  this.getReceivingAddressIndexForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getReceivingAddressIndex();
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @param {number} addressIdx index of address of HD wallet account
   * @param {string} label label
   * @return {string} success or not
   */
  this.setLabelForAccountAddress = function(accountIdx, addressIdx, label, success, error) {
    if (label != "" && ! isAlphaNumericSpace(label)) {
      error();
    } else {
      MyWallet.getHDWallet().getAccount(accountIdx).setLabelForAddress(addressIdx, label);
      MyWallet.backupWalletDelayed();
      success();
    }
  };

  this.getLabeledReceivingAddressesForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().getAccount(accountIdx).getLabeledReceivingAddresses();
  };

  /**
   * @return {Array} get all transactions with fields to_account, from_account, from_addresses, to_addresses, etc filled
   */
  this.getAllTransactions = function() {
    var filteredTransactions = [];

    var rawTxs = transactions;

    for (var i in rawTxs) {
      var tx = rawTxs[i];

      var transaction = this.processTransaction(tx);

      filteredTransactions.push(transaction);
    }


    return filteredTransactions;
  };

  this.processTransaction = function(tx) {
    // console.log(JSON.stringify(tx))
    var transaction = {
      from: {account: null, legacyAddresses: null, externalAddresses: null},
      to: {account: null, legacyAddresses: null, externalAddresses: null, email: null, mobile: null},
      fee: 0,
      intraWallet: null,
    };
    var isOrigin = false;

    for (var i = 0; i < tx.inputs.length; ++i) {
      var output = tx.inputs[i].prev_out;
      if (!output || !output.addr)
        continue;

      if (MyWallet.isActiveLegacyAddress(output.addr)) {
        isOrigin = true;
        if (transaction.from.legacyAddresses == null)
          transaction.from.legacyAddresses = [];
        transaction.from.legacyAddresses.push({address: output.addr, amount: output.value});
        transaction.fee += output.value;
      } else {
        for (var j in MyWallet.getAccounts()) {
          var account = MyWallet.getHDWallet().getAccount(j);
          if (!account.isArchived() && output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
            if (! isOrigin) {
              isOrigin = true;
              transaction.from.account = {index: parseInt(j), amount: output.value};
              transaction.fee += output.value;
            } else {
              if (transaction.from.externalAddresses == null ||
                  output.value > transaction.from.externalAddresses.amount) {
                transaction.from.externalAddresses = {addressWithLargestOutput: output.addr, amount: output.value};
              }
              transaction.fee += output.value;
            }
            break;
          }
        }

        if (! isOrigin) {
          if (transaction.from.externalAddresses == null ||
              output.value > transaction.from.externalAddresses.amount) {
            transaction.from.externalAddresses = {addressWithLargestOutput: output.addr, amount: output.value};
          }
          transaction.fee += output.value;
          transaction.intraWallet = false;
        }
      }

      if(transaction.intraWallet == null) {
        transaction.intraWallet = true;
      }
    }

    for (var i = 0; i < tx.out.length; ++i) {
      var output = tx.out[i];
      if (!output || !output.addr)
        continue;
      
      if (MyWallet.isActiveLegacyAddress(output.addr)) {
        if (transaction.to.legacyAddresses == null)
          transaction.to.legacyAddresses = [];

        var isFromLegacyAddresses = false;
        for (var j in transaction.from.legacyAddresses) {
          var addressAmount = transaction.from.legacyAddresses[j];
          if (addressAmount.address == output.addr) {
            addressAmount.amount -= output.value;
            isFromLegacyAddresses = true;
          }
        }
        if (! isFromLegacyAddresses) {
          transaction.to.legacyAddresses.push({address: output.addr, amount: output.value});
        }
        transaction.fee -= output.value;
      } else if (MyWallet.getPaidToDictionary() && (paidToItem = MyWallet.getPaidToDictionary()[tx.hash]) && paidToItem.address == output.addr ) {
        if(paidToItem.email) {
          transaction.to.email = { email: paidToItem.email, redeemedAt: paidToItem.redeemedAt };
        } else if (paidToItem.mobile) {
          transaction.to.mobile = { number: paidToItem.mobile, redeemedAt: paidToItem.redeemedAt };
        };
        transaction.intraWallet = false;
      } else {
        var toAccountSet = false;
        for (var j in MyWallet.getAccounts()) {
          var account = MyWallet.getHDWallet().getAccount(j);
          if (!account.isArchived() && output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
            if (! toAccountSet) {
              if (transaction.from.account != null && transaction.from.account.index == parseInt(j)) {
                transaction.from.account.amount -= output.value;
              } else {
                transaction.to.account = {index: parseInt(j), amount: output.value};
              }
              toAccountSet = true;
              transaction.fee -= output.value;
            } else {
              if (transaction.from.account != null && transaction.from.account.index == parseInt(j)) {
                transaction.from.account.amount -= output.value;
              } else if ((transaction.to.externalAddresses == null ||
                          output.value > transaction.to.externalAddresses.amount) &&
                         (transaction.from.account != null ||
                          transaction.from.legacyAddresses != null)) {
                transaction.to.externalAddresses = {addressWithLargestOutput: output.addr, amount: output.value};
              }
              transaction.fee -= output.value;
            }
            break;
          }
        }

        if (! toAccountSet) {
          if ((transaction.to.externalAddresses == null ||
               output.value > transaction.to.externalAddresses.amount) &&
              (transaction.from.account != null ||
               transaction.from.legacyAddresses != null)) {
            transaction.to.externalAddresses = {addressWithLargestOutput: output.addr, amount: output.value};
          }
          transaction.fee -= output.value;
          transaction.intraWallet = false;
        }
      }
    }

    if (transaction.from.account == null && transaction.from.legacyAddresses == null) {
      var fromAmount = 0;
      if (transaction.to.account != null)
        fromAmount += transaction.to.account.amount;
      for (var i in transaction.to.legacyAddresses) {
        var addressAmount = transaction.to.legacyAddresses[i];
        fromAmount += addressAmount.amount;
      }
      transaction.from.externalAddresses.amount = fromAmount;
    }

    transaction.hash = tx.hash;

    /* Typically processTransaction() is called directly after transactions
     have been downloaded from the server. In that case you could simply 
     reuse tx.confirmations. However processTransaction() can also be 
     called at a later time, e.g. if the user keeps their wallet open
     while waiting for a confirmation. */
    transaction.confirmations = MyWallet.getConfirmationsForTx(MyWallet.getLatestBlock(), tx);

    transaction.txTime = tx.time;
    transaction.note = tx_notes[tx.hash] ? tx_notes[tx.hash] : null;
    transaction.tags = MyWallet.getTags(tx.hash);
    transaction.size = tx.size;
    transaction.tx_index = tx.txIndex;
    transaction.block_height = tx.blockHeight;
    
    transaction.result = this.calculateTransactionResult(transaction)
    
    // console.log(JSON.stringify(transaction))
    return transaction;
  };
  
  this.calculateTransactionResult = function(transaction) {
    
    totalOurs = function(toOrFrom) {
      var result = 0;
      
      if(toOrFrom.account) {
        result = result + toOrFrom.account.amount;
      } else if (toOrFrom.legacyAddresses && toOrFrom.legacyAddresses.length > 0) {
        for(var i in toOrFrom.legacyAddresses) {
          var legacyAddress = toOrFrom.legacyAddresses[i];
          result += legacyAddress.amount;
        }
      }
      
      return result;
    }
    
    var result = 0;
    
    if (transaction.intraWallet) {
      result = result + totalOurs(transaction.to);
    } else {
      result = result + totalOurs(transaction.to) - totalOurs(transaction.from);
    }
    
    return result;
    
 
  }

  /**
   * @return {Array} Legacy Transactions
   */
  this.getLegacyTransactions = function() {
    var filteredTransactions = [];

    var rawTxs = transactions;

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
      var isLegacyAddressTx = false;
      for (var i = 0; i < tx.inputs.length; ++i) {
        var output = tx.inputs[i].prev_out;
        if (!output || !output.addr)
          continue;

        if (MyWallet.isActiveLegacyAddress(output.addr)) {
          isLegacyAddressTx = true;
          isOrigin = true;
          transaction.amount -= output.value;
          transaction.from_addresses.push(output.addr);
        } else {
          transaction.from_addresses.push(output.addr);
          for (var j in MyWallet.getAccounts()) {
            var account = MyWallet.getHDWallet().getAccount(j);
            if (output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
              transaction.from_account = parseInt(j);
              break;
            }
          }
        }
      }

      transaction.intraWallet = false;
      for (var i = 0; i < tx.out.length; ++i) {
        var output = tx.out[i];
        if (!output || !output.addr)
          continue;

        if (MyWallet.isActiveLegacyAddress(output.addr)) {
          isLegacyAddressTx = true;
          transaction.amount += output.value;
          transaction.to_addresses.push(output.addr);
          if (isOrigin)
            transaction.intraWallet = true;
        } else {
          transaction.to_addresses.push(output.addr);
          for (var j in MyWallet.getAccounts()) {
            var account = MyWallet.getHDWallet().getAccount(j);
            if (output.xpub != null && account.getAccountExtendedKey(false) == output.xpub.m) {
              transaction.to_account = parseInt(j);
              if (isOrigin)
                transaction.intraWallet = true;
              break;
            }
          }
        }
      }

      if (! isLegacyAddressTx)
        continue;

      transaction.hash = tx.hash;
      transaction.confirmations = MyWallet.getConfirmationsForTx(MyWallet.getLatestBlock(), tx);

      // transaction.note = tx.note ? tx.note : tx_notes[tx.hash];

      if (tx.time > 0) {
        transaction.txTime = new Date(tx.time * 1000);
      }

      filteredTransactions.push(transaction);
    }

    return filteredTransactions;
  };

  /**
   * @param {number} accountIdx index of HD wallet account
   * @return {array} array of transaction objects
   */
  this.getTransactionsForAccount = function(accountIdx) {
    return MyWallet.getHDWallet().filterTransactionsForAccount(accountIdx, MyWallet.getTransactions(), paidTo, tx_notes);
  };

  this.getAndSetUnspentOutputsForAccount = function(accountIdx, successCallback, errorCallback) {
    var account = MyWallet.getHDWallet().getAccount(accountIdx);

    BlockchainAPI.get_unspent([account.extendedPublicKey], function (obj) {

      obj.unspent_outputs.forEach(function(utxo) {
        var txBuffer = new Buffer(utxo.tx_hash, "hex");
        Array.prototype.reverse.call(txBuffer);
        utxo.hash = txBuffer.toString("hex");
        utxo.index = utxo.tx_output_n;
        var script = Bitcoin.Script.fromHex(utxo.script);
        utxo.address = Bitcoin.Address.fromOutputScript(script).toString();
      });

      account.setUnspentOutputs(obj.unspent_outputs);

      MyWallet.sendEvent('hd_wallet_balance_updated');
      if (successCallback) {
        successCallback(obj.unspent_outputs);
      }
    }, function(e) {
      if (errorCallback) {
        errorCallback(e.message || e.responseText);
      }
    }, 0, true);
  };

  this.recommendedTransactionFeeForAccount = function(accountIdx, amount) {
    if (! isAccountRecommendedFeesValid) {
      amountToRecommendedFee = {};
      isAccountRecommendedFeesValid = true;
    }

    if (amountToRecommendedFee[amount] != null) {
      return amountToRecommendedFee[amount];
    } else {
      var recommendedFee = MyWallet.getHDWallet().getAccount(accountIdx).recommendedTransactionFee(amount);

      amountToRecommendedFee[amount] = recommendedFee;

      return recommendedFee;
    }
  };

  this.getPaidToDictionary = function()  {
    return paidTo;
  };

  this.recommendedTransactionFeeForAddress = function(address, balance) {
    // TODO: calculate the correct fee:
    var obj = Signer.init();
    if(obj.base_fee) {
      return parseInt(obj.base_fee);
    } else {
      return null;
    }
  };

  /**
   * @param {function(Array)} successCallback success callback function with transaction array
   * @param {function()} errorCallback error callback function
   * @param {function()} didFetchOldestTransaction callback is called when all transanctions for the specified account has been fetched
   */
  this.fetchMoreTransactionsForAccounts = function(success, error, didFetchOldestTransaction) {

    function getRawTransactionsForAccounts(txOffset, numTx, success, error) {
      var addresses = [];
      for (var i in MyWallet.getAccounts()) {
        var account = MyWallet.getHDWallet().getAccount(i);
        if(!account.isArchived()) {
          addresses.push(account.getAccountExtendedKey(false));
        }
      }

      BlockchainAPI.async_get_history_with_addresses(addresses, function(data) {
        if (success) success(data.txs);
      }, function() {
        if (error) error();

      }, tx_filter, txOffset, numTx);
    }

    getRawTransactionsForAccounts(MyWallet.getHDWallet().numTxFetched, numOldTxsToFetchAtATime, function(data) {
      var processedTransactions = [];

      for (var i in data) {
        var tx = data[i];

        var tx = TransactionFromJSON(data[i]);

        var transaction = MyWallet.processTransaction(tx);
        processedTransactions.push(transaction);
      }

      MyWallet.getHDWallet().numTxFetched += processedTransactions.length;

      if (processedTransactions.length < numOldTxsToFetchAtATime) {
        didFetchOldestTransaction();
      }

      success(processedTransactions);
    }, function(e) {
      error(e);
    });
  };

  /**
   * @param {number} accountIdx idx of account
   * @param {function(Array)} successCallback success callback function with transaction array
   * @param {function()} errorCallback error callback function
   * @param {function()} didFetchOldestTransaction callback is called when all transanctions for the specified account has been fetched
   */
  this.fetchMoreTransactionsForAccount = function(accountIdx, success, error, didFetchOldestTransaction) {
    function getRawTransactionsForAccount(accountIdx, txOffset, numTx, success, error) {
      var account = MyWallet.getHDWallet().getAccount(accountIdx);
      var accountExtendedPublicKey = account.getAccountExtendedKey(false);

      BlockchainAPI.async_get_history_with_addresses([accountExtendedPublicKey], function(data) {
        if (success) success(data);
      }, function() {
        if (error) error();

      }, tx_filter, txOffset, numTx);
    }

    var account = MyWallet.getHDWallet().getAccount(accountIdx);
    getRawTransactionsForAccount(accountIdx, account.numTxFetched, numOldTxsToFetchAtATime, function(data) {
      var processedTransactions = [];

      for (var i in data.txs) {
        var tx = data.txs[i];

        var tx = TransactionFromJSON(data.txs[i]);

        var transaction = MyWallet.processTransaction(tx);

        processedTransactions.push(transaction);
      }


      account.numTxFetched += processedTransactions.length;

      if (processedTransactions.length < numOldTxsToFetchAtATime) {
        didFetchOldestTransaction();
      }

      success(processedTransactions, data.wallet.final_balance);
    }, function(e) {
      error(e);
    });
  };

  this.markPaidToEntryRedeemed = function(tx_hash, time) {
    paidTo[tx_hash].redeemedAt = time;
  };

  // Reads from and writes to global paidTo
  this.checkForRecentlyRedeemed = function() {
    var paidToAddressesToMonitor = [];

    for (var tx_hash in MyWallet.getPaidToDictionary()) {
      var localPaidTo = MyWallet.getPaidToDictionary()[tx_hash];
      if (localPaidTo.redeemedAt == null) {
        paidToAddressesToMonitor.push(localPaidTo.address);
      }
    }

    if(paidToAddressesToMonitor.length == 0)
      return;

    MyWallet.fetchRawTransactionsAndBalanceForAddresses(paidToAddressesToMonitor,
                                                        function(transactions, balances){
                                                          for(var i in balances) {
                                                            if(balances[i].final_balance == 0 && balances[i].n_tx > 0) {

                                                              redeemedAt = null;

                                                              // Find corresponding transaction:
                                                              for(var j in transactions) {
                                                                for(var k in transactions[j].inputs) {
                                                                  if(balances[i].address === transactions[j].inputs[k].prev_out.addr) {
                                                                    // Set redeem time
                                                                    redeemedAt = transactions[j].time;
                                                                  }
                                                                }
                                                              }

                                                              // Mark as redeemed:
                                                              for(var tx_hash in MyWallet.getPaidToDictionary()) {
                                                                var paidToEntry = MyWallet.getPaidToDictionary()[tx_hash];
                                                                if(balances[i].address === paidToEntry.address) {
                                                                  MyWallet.markPaidToEntryRedeemed(tx_hash, redeemedAt || 1);
                                                                  MyWallet.backupWalletDelayed();
                                                                  // If redeem time not known, set to default time.
                                                                }
                                                              }


                                                            }
                                                          }
                                                        },
                                                        function() {
                                                          console.log("Could not check if email/sms btc have been redeemed.");
                                                        });
  };


  /**
   * @param {string} privatekey private key to redeem
   * @param {function()} successCallback success callback function with balance in satoshis
   * @param {function()} errorCallback error callback function
   */
  this.getBalanceForRedeemCode = function(privatekey, successCallback, errorCallback)  {
    var format = MyWallet.detectPrivateKeyFormat(privatekey);
    if(format == null) {
      errorCallback("Unkown private key format");
      return;
    }
    var privateKeyToSweep = MyWallet.privateKeyStringToKey(privatekey, format);
    var from_address_compressed = MyWallet.getCompressedAddressString(privateKeyToSweep);
    var from_address_uncompressed = MyWallet.getUnCompressedAddressString(privateKeyToSweep);


    BlockchainAPI.get_balance([from_address_compressed, from_address_uncompressed], function(value) {
      if (successCallback)
        successCallback(value);
    }, function() {
      MyWallet.sendEvent("msg", {type: "error", message: 'Error Getting Address Balance'});
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * Redeem bitcoins sent from email or mobile.
   * @param {number} accountIdx index of HD wallet account
   * @param {string} privatekey private key to redeem
   * @param {function()} successCallback success callback function
   * @param {function()} errorCallback error callback function
   */
  this.redeemFromEmailOrMobile = function(accountIdx, privatekey, successCallback, errorCallback)  {
    var account = this.getAccount(accountIdx);
    try {

      var format = MyWallet.detectPrivateKeyFormat(privatekey);
      var privateKeyToSweep = MyWallet.privateKeyStringToKey(privatekey, format);
      var from_address_compressed = MyWallet.getCompressedAddressString(privateKeyToSweep);
      var from_address_uncompressed = MyWallet.getUnCompressedAddressString(privateKeyToSweep);

      BlockchainAPI.get_balance([from_address_compressed, from_address_uncompressed], function(value) {
        var obj = Signer.init();
        obj.fee = obj.base_fee; //Always include a fee

        var amount = BigInteger.valueOf(value).subtract(obj.fee);

        var to_address = account.getReceivingAddress();
        obj.to_addresses.push({address: Bitcoin.Address.fromBase58Check(to_address), value : amount});
        obj.from_addresses = [from_address_compressed, from_address_uncompressed];
        obj.extra_private_keys[from_address_compressed] = privatekey;
        obj.extra_private_keys[from_address_uncompressed] = privatekey;

        obj.ready_to_send_header = 'Bitcoins Ready to Claim.';

        obj.addListener({
          on_success : function(e) {
            if (successCallback)
              successCallback();
          },
          on_start : function(e) {
          },
          on_error : function(e) {
            if (errorCallback)
              errorCallback(e);
          }
        });

        // No second password needed for redeeming.
        obj.start();
      }, function() {
        MyWallet.sendEvent("msg", {type: "error", message: 'Error Getting Address Balance'});
      });
    } catch (e) {
      console.log(e);
      MyWallet.sendEvent("msg", {type: "error", message: 'Error Decoding Private Key. Could not claim coins.'});
    }
  };

  // TODO: refactor second password suppport
  /**
   * @param {number} accountIdx send from Account Index
   * @param {number} value send amount
   * @param {?number} fixedFee fee amount
   * @param {string} email to email
   * @param {function()} successCallback success callback function
   * @param {function()} errorCallback error callback function
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sendToEmail = function(accountIdx, value, fixedFee, email, successCallback, errorCallback, listener, getPassword)  {
    if (double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          sendToEmail(accountIdx, value, fixedFee, email, successCallback, errorCallback, listener, pw);
        } else {
          wrong_password();
          MyWallet.sendEvent("msg", {type: "error", message: 'Password incorrect.'});
        }
      });
    } else {
      sendToEmail(accountIdx, value, fixedFee, email, successCallback, errorCallback, listener, null);
    }

    function sendToEmail(accountIdx, value, fixedFee, email, successCallback, errorCallback, listener, secondPassword)  {
      var account = MyWallet.getHDWallet().getAccount(accountIdx);
      var key = MyWallet.generateNewKey();
      var address = key.pub.getAddress().toString();
      var privateKey = key.toWIF();

      MyWallet.setLegacyAddressTag(address, 2);


      MyWallet.setLegacyAddressLabel(
        address, 
        email + ' Sent Via Email', 
        function() {
          MyWallet.backupWallet('update', function() {
            MyWallet.sendEvent("msg", {type: "info", message: 'Generated new Bitcoin Address ' + address});
            MyWallet.getAndSetUnspentOutputsForAccount(accountIdx, function (unspent_outputs) {
              var account = MyWallet.getHDWallet().getAccount(accountIdx);
              var extendedPrivateKey = null;
              if (secondPassword != null) {
                extendedPrivateKey = MyWallet.decryptSecretWithSecondPassword(account.extendedPrivateKey, secondPassword, sharedKey);
              } else {
                extendedPrivateKey = account.extendedPrivateKey;
              }
              var tx = MyWallet.getHDWallet().getAccount(accountIdx).createTx(address, value, fixedFee, unspent_outputs, extendedPrivateKey, listener);
              BlockchainAPI.sendViaEmail(email, tx, privateKey, function (data) {
                BlockchainAPI.push_tx(tx, null, function(response) {
                  var paidToSingle = {email:email, mobile: null, redeemedAt: null, address: address};
                  paidTo[tx.getId()] = paidToSingle;

                  MyWallet.backupWallet('update', function() {

                    MyWallet.getAndSetUnspentOutputsForAccount(accountIdx, function () {
                      if (successCallback)
                        successCallback(response);
                    }, function(e) {
                      if (errorCallback)
                        errorCallback(e);
                    });
                  }, function() {
                    if (errorCallback)
                      errorCallback();
                  });
                }, function(response) {
                  if (errorCallback)
                    errorCallback(response);
                });
              }, function(e) { // Sent via email failed
                if (errorCallback)
                  errorCallback(e);
              });
            }, function(e) {
              if (errorCallback)
                errorCallback(e);
            });
          });
        }, 
        function() { console.log('Unexpected error'); }
      );
    }

  };

  /**
   * @param { Array } list of addresses
   * @param {function():Array} successCallback success callback function with transaction array
   * @param {function()} errorCallback callback function
   */
  this.fetchRawTransactionsAndBalanceForAddresses = function(addresses, success, error) {
    BlockchainAPI.async_get_history_with_addresses(addresses, function(data) {
      if (success) success( data.txs, data.addresses);
    }, function() {
      if (error) error();

    }, tx_filter, 0);


  };

  /**
   * @param {function():Array} successCallback success callback function with transaction array
   * @param {function()} errorCallback callback function
   * @param {function()} didFetchOldestTransaction callback is called when all transanctions for legacy addresses have been fetched
   */
  this.fetchMoreTransactionsForLegacyAddresses = function(success, error, didFetchOldestTransaction) {
    function getRawTransactionsForLegacyAddresses(txOffset, numTx, success, error) {
      var allAddresses = MyWallet.getLegacyActiveAddresses();

      BlockchainAPI.async_get_history_with_addresses(allAddresses, function(data) {
        if (success) success(data.txs);
      }, function() {
        if (error) error();

      }, tx_filter, txOffset, numTx);
    }

    getRawTransactionsForLegacyAddresses(legacyAddressesNumTxFetched, numOldTxsToFetchAtATime, function(data) {
      var processedTransactions = [];

      for (var i in data) {
        var tx = data[i];

        var tx = TransactionFromJSON(data[i]);

        var transaction = MyWallet.processTransaction(tx);
        processedTransactions.push(transaction);
      }

      legacyAddressesNumTxFetched += processedTransactions.length;

      if (processedTransactions.length < numOldTxsToFetchAtATime) {
        didFetchOldestTransaction();
      }

      success(processedTransactions);

    }, function(e) {
      console.log('error ' + e);
    });
  };

  /**
   * @param {string} fromAddress from address
   * @param {number} toAddress to address
   * @param {number} amount send amount in satoshis
   * @param {?number} feeAmount fee amount in satoshis
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sendFromLegacyAddressToAddress = function(fromAddress, toAddress, amount, feeAmount, note, successCallback, errorCallback, listener, getPassword)  {
    if (double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          sendFromLegacyAddressToAddress(fromAddress, toAddress, amount, feeAmount, note, successCallback, errorCallback, listener, pw);
        } else {
          wrong_password();
        }
      });
    } else {
      sendFromLegacyAddressToAddress(fromAddress, toAddress, amount, feeAmount, note, successCallback, errorCallback, listener, null);
    }
  };

  function sendFromLegacyAddressToAddress(fromAddress, toAddress, amount, feeAmount, note, successCallback, errorCallback, listener, second_password)  {
    var obj = Signer.init();
    if (feeAmount != null)
      obj.fee = BigInteger.valueOf(feeAmount);
    else
      obj.fee = obj.base_fee;

    obj.to_addresses.push({ address: Bitcoin.Address.fromBase58Check(toAddress), value : BigInteger.valueOf(amount) });

    obj.from_addresses = fromAddress ? [fromAddress] : MyWallet.getLegacyActiveAddresses();

    obj.ready_to_send_header = 'Bitcoins Ready to Send.';

    listener.on_success = successCallback;
    listener.on_error = errorCallback;
    obj.addListener(listener);

    obj.note = note;

    obj.start(second_password);
  }

  /**
   * @param {string} fromAddress from address
   * @param {number} toIdx index of account
   * @param {number} amount send amount in satoshis
   * @param {?number} feeAmount fee amount in satoshis
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sendFromLegacyAddressToAccount = function(fromAddress, toIdx, amount, feeAmount, note, successCallback, errorCallback, listener, getPassword)  {
    if (double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          sendFromLegacyAddressToAccount(fromAddress, toIdx, amount, feeAmount, note, successCallback, errorCallback, listener, pw);
        } else {
          wrong_password();
          errorCallback();
        }
      });
    } else {
      sendFromLegacyAddressToAccount(fromAddress, toIdx, amount, feeAmount, note, successCallback, errorCallback, listener, null);
    }
  };

  function sendFromLegacyAddressToAccount(fromAddress, toIdx, amount, feeAmount, note, successCallback, errorCallback, listener, second_password)  {
    var account = MyWallet.getHDWallet().getAccount(toIdx);
    var obj = Signer.init();

    if (feeAmount != null)
      obj.fee = BigInteger.valueOf(feeAmount);
    else
      obj.fee = obj.base_fee;

    var to_address = account.getReceivingAddress();
    obj.to_addresses.push({ address: Bitcoin.Address.fromBase58Check(to_address), value : BigInteger.valueOf(amount) });

    obj.from_addresses = fromAddress ? [fromAddress] : MyWallet.getLegacyActiveAddresses();

    obj.ready_to_send_header = 'Bitcoins Ready to Send.';

    listener.on_success = successCallback;
    listener.on_error = errorCallback;
    obj.addListener(listener);

    obj.note = note;

    obj.start(second_password);
  }

  /**
   * @param {string} fromAddress from address
   * @param {number}  index of account
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sweepLegacyAddressToAccount = function(fromAddress, toIdx, successCallback, errorCallback, listener, getPassword)  {
    var obj = Signer.init();
    var feeAmount = parseInt(obj.base_fee.toString());
    var amount = MyWallet.getLegacyAddressBalance(fromAddress) - feeAmount;
    MyWallet.sendFromLegacyAddressToAccount(fromAddress, toIdx, amount, feeAmount, null, successCallback, errorCallback, listener, getPassword);
  };

  /**
   * @param {number} fromIdx index of from account
   * @param {number} toIdx index of to account
   * @param {number} amount send amount in satoshis
   * @param {?number} feeAmount fee amount in satoshis
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sendToAccount = function(fromIdx, toIdx, amount, feeAmount, note, successCallback, errorCallback, listener, getPassword)  {
    var account = MyWallet.getHDWallet().getAccount(toIdx);
    var address = account.getReceivingAddress();
    MyWallet.sendBitcoinsForAccount(fromIdx, address, amount, feeAmount, note, successCallback, errorCallback, listener, getPassword);
  };

  /**
   * @param {number} accountIdx send from Account Index
   * @param {number} value send amount
   * @param {?number} fixedFee fee amount
   * @param {string} mobile to mobile number
   * @param {function()} successCallback success callback function
   * @param {function()} errorCallback error callback function
   */
  this.sendToMobile = function(accountIdx, value, fixedFee, mobile, successCallback, errorCallback, listener, getPassword)  {
    if (double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          sendToMobile(accountIdx, value, fixedFee, mobile, successCallback, errorCallback, listener, pw);
        } else {
          wrong_password();
        }
      });
    } else {
      sendToMobile(accountIdx, value, fixedFee, mobile, successCallback, errorCallback, listener, null);
    }

    function sendToMobile(accountIdx, value, fixedFee, mobile, successCallback, errorCallback, listener, secondPassword)  {
      if (mobile.charAt(0) == '0')
        mobile = mobile.substring(1);

      if (mobile.charAt(0) != '+')
        mobile = '+' + mobile;
      //mobile = '+' + child.find('select[name="sms-country-code"]').val() + mobile;
      var miniKeyAddrobj = MyWallet.generateNewMiniPrivateKey();
      var address = MyWallet.getCompressedAddressString(miniKeyAddrobj.key);

      MyWallet.setLegacyAddressTag(address, 2);
      MyWallet.setLegacyAddressLabel(
        address, 
        mobile + ' Sent Via SMS',
        function() {
          MyWallet.backupWallet('update', function() {
            MyWallet.sendEvent("msg", {type: "info", message: 'Generated new Bitcoin Address ' + address + address});

            MyWallet.getAndSetUnspentOutputsForAccount(accountIdx, function (unspent_outputs) {
              var account = MyWallet.getHDWallet().getAccount(accountIdx);
              var extendedPrivateKey = null;
              if (secondPassword != null) {
                extendedPrivateKey = MyWallet.decryptSecretWithSecondPassword(account.extendedPrivateKey, secondPassword, sharedKey);
              } else {
                extendedPrivateKey = account.extendedPrivateKey;
              }
              var tx = account.createTx(address, value, fixedFee, unspent_outputs, extendedPrivateKey, listener);
              BlockchainAPI.sendViaSMS(mobile, tx, miniKeyAddrobj.miniKey, function (data) {

                BlockchainAPI.push_tx(tx, null, function(response) {
                  var paidToSingle = {email: null, mobile: mobile, redeemedAt: null, address: address};
                  paidTo[tx.getId()] = paidToSingle;

                  MyWallet.backupWallet('update', function() {

                    MyWallet.getAndSetUnspentOutputsForAccount(accountIdx, function () {
                      if (successCallback)
                        successCallback(response);
                    }, function(e) {
                      if (errorCallback)
                        errorCallback(e);
                    });
                  }, function() {
                    if (errorCallback)
                      errorCallback();
                  });

                }, function(response) {
                  if (errorCallback)
                    errorCallback(response);
                });
              }, function(data) {
                if (errorCallback)
                  errorCallback(e);
              });
            }, function(e) {
              if (errorCallback)
                errorCallback(e);
            });
          });
        },
        function() { console.log('Unexpected error'); }
      );
    }
  };

  /**
   * @param {number} accountIdx index of account
   * @param {string} to address to send to
   * @param {number} value send amount in satoshis
   * @param {?number} fixedFee fee amount in satoshis
   * @param {?string} note optional tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */
  this.sendBitcoinsForAccount = function(accountIdx, to, value, fixedFee, note, successCallback, errorCallback, listener, getPassword) {
    // second_password must be null if not needed.
    function sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successCallback, errorCallback, listener, second_password) {
      MyWallet.getAndSetUnspentOutputsForAccount(
        accountIdx,
        function (unspent_outputs) {
          var account = MyWallet.getHDWallet().getAccount(accountIdx);
          var extendedPrivateKey = second_password == null ? account.extendedPrivateKey : MyWallet.decryptSecretWithSecondPassword(account.extendedPrivateKey, second_password, sharedKey);
          var tx = account.createTx(to, value, fixedFee, unspent_outputs, extendedPrivateKey, listener);
          var balance = account.getBalance();
          BlockchainAPI.push_tx(
            tx,
            note,
            function(response) { successCallback && successCallback(tx.getId()); },
            function(response) { errorCallback && errorCallback(e);}
          );
        },
        function(e) { errorCallback && errorCallback(e);}
      );
    }


    if (double_encryption) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successCallback, errorCallback, listener, pw);
        } else {
          wrong_password();
        }
      });
    } else {
      sendBitcoinsForAccount(accountIdx, to, value, fixedFee, note, successCallback, errorCallback, listener, null);
    }
  };

  this.archiveAccount = function(idx) {
    var account = MyWallet.getHDWallet().getAccount(idx);
    account.setIsArchived(true);
    MyWallet.backupWalletDelayed();
  };

  /**
   * @param {number} accountIdx index of account
   * @param {?function(number)} successcallback success callback function with account balance
   */
  this.unarchiveAccount = function(idx, successcallback) {
    var archivedAccount = MyWallet.getHDWallet().getAccount(idx);

    var account = new HDAccount(null, null, archivedAccount.label, idx);
    account.newNodeFromExtKey(archivedAccount.extendedPublicKey);

    account.generateCache();

    account.extendedPrivateKey = archivedAccount.extendedPrivateKey;
    account.extendedPublicKey = archivedAccount.extendedPublicKey;

    MyWallet.getHDWallet().replaceAccount(idx, account);


    MyWallet.fetchMoreTransactionsForAccount(idx,function(txs, balance) {
      account.setBalance(balance);

      MyWallet.listenToHDWalletAccount(account.extendedPrivateKey);

      if (successcallback) {
        successcallback(txs);
      }
    }, function(error) {
      console.log("Failed to fetch transactions");
    }, function() {});

    MyWallet.backupWalletDelayed();
  };

  /**
   * @return {Array} Array of HD accounts
   */
  this.getAccounts = function() {
    if (!MyWallet.didUpgradeToHd()) {
      return [];
    }
    return MyWallet.getHDWallet().getAccounts();
  };

  /**
   * @param {number} idx of account
   * @return {Object} Account at index
   */
  this.getAccount = function(idx) {
    return MyWallet.getHDWallet().getAccount(idx);
  };

  /**
   * @return {Number} Number of HD accounts
   */
  this.getAccountsCount = function() {
    if (!MyWallet.didUpgradeToHd()) {
      return 0;
    }
    return MyWallet.getHDWallet().getAccountsCount();
  };

  /**
   * Create new account and backup wallet
   * @param {string} label label name
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   * @param {function()} success called when account creation was successful
   * @param {function()} error called when account creation failed
   */
  this.createAccount = function(label, getPassword, success, error) {
    if(!this.validateAccountLabel(label)) {
      error("Invalid label");
      return;
    }
      
    if (double_encryption) {
      getPassword(function(pw, correct_password, incorrect_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          createAccount(label, pw, success, error);
        } else {
          incorrect_password();
          error();
        }
      });
    } else {
      createAccount(label, null, success, error);
    }
  };

  // Assumes second password is needed if the argument is not null.
  function createAccount(label, second_password, success, error) {
    var account = MyWallet.getHDWallet().createAccount(label, second_password);
    var accountExtendedPublicKey = account.getAccountExtendedKey(false);
    account.setBalance(0);
    MyWallet.listenToHDWalletAccount(accountExtendedPublicKey);
    success();
    MyWallet.backupWalletDelayed();
  }

  MyWallet.getHDWallet = function() {
    if (typeof myHDWallet === 'undefined') {
      return null;
    }
    return myHDWallet;
  };

  this.setHDWallet = function(newValue) {
    myHDWallet = newValue;
    if (newValue) {
      MyWallet.sendEvent('hd_wallet_set');
    }
  };

  /**
   * @param {string} mnemonic mnemonic
   * @return {boolean} is valid mnemonic
   */
  this.isValidateBIP39Mnemonic = function(mnemonic) {
    return isValidateMnemonic(mnemonic);
  };

  /**
   * Recover HD wallet from passphrase by recreating all accounts and querying the balance of all accounts and addresses
   * @param {string} seedHex passphrase seed in hex
   * @param {?string} bip39Password bip39 Password
   * @param {function()} getPassword
   * @param {function()} successCallback success callback function
   * @param {function()} errorCallback error callback function
   */
  this.recoverMyWalletHDWalletFromSeedHex = function(seedHex, bip39Password, getPassword, successCallback, errorCallback) {
    function recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, secondPassword, successCallback, errorCallback) {
      recoverHDWalletFromSeedHex(seedHex, bip39Password, secondPassword, function(hdWallet) {
        MyWallet.setHDWallet(hdWallet);

        if (successCallback)
          successCallback();

        MyWallet.backupWalletDelayed('update', function() {
          MyWallet.get_history();
        });
      }, function() {
        if (errorCallback)
          errorCallback();
      });
    }

    if (this.getDoubleEncryption()) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, pw, successCallback, errorCallback);
        } else {
          wrong_password();
          errorCallback();
        }
      });
    } else {
      recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, null, successCallback, errorCallback);
    }
  };

  /**
   * Recover HD wallet from mnemonic by recreating all accounts and querying the balance of all accounts and addresses
   * @param {string} passphrase seed in words
   * @param {?string} bip39Password
   * @param {function()} getPassword
   * @param {function()=} successCallback success callback function
   * @param {function()=} errorCallback error callback function
   */
  this.recoverMyWalletHDWalletFromMnemonic = function(passphrase, bip39Password, getPassword, successCallback, errorCallback) {
    function recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, secondPassword, successCallback, errorCallback) {
      recoverHDWalletFromMnemonic(passphrase, bip39Password, secondPassword, function(hdWallet) {
        MyWallet.setHDWallet(hdWallet);

        if (successCallback)
          successCallback();

        MyWallet.backupWalletDelayed('update', function() {
          MyWallet.get_history();
        });
      }, function() {
        if (errorCallback)
          errorCallback();
      });
    }

    if (this.getDoubleEncryption()) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, pw, successCallback, errorCallback);
        } else {
          wrong_password();
          errorCallback();
        }
      });
    } else {
      recoverMyWalletHDWalletFromMnemonic(passphrase, bip39Password, null, successCallback, errorCallback);
    }
  };

  this.listenToHDWalletAccount = function(accountExtendedPublicKey) {
    try {
      var msg = '{"op":"xpub_sub", "xpub":"'+ accountExtendedPublicKey +'"}';
      ws.send(msg);
    } catch (e) { }
  };

  this.listenToHDWalletAccounts = function() {
    for (var i in MyWallet.getAccounts()) {
      var account = MyWallet.getHDWallet().getAccount(i);
      if(!account.isArchived()) {
        var accountExtendedPublicKey = account.getAccountExtendedKey(false);
        MyWallet.listenToHDWalletAccount(accountExtendedPublicKey);
      }
    }
  };

  this.buildHDWallet = function(seedHexString, accountsArrayPayload, bip39Password, secondPassword, successCallback, errorCallback) {
    var _success = function(hdWallet) {
      MyWallet.setHDWallet(hdWallet);
      successCallback && successCallback();
    };

    buildHDWallet(seedHexString, accountsArrayPayload, bip39Password, secondPassword, _success, errorCallback);
  };

  this.generateHDWalletPassphrase = function() {
    return BIP39.generateMnemonic();
  };

  this.generateHDWalletSeedHex = function() {
    var passPhrase = MyWallet.generateHDWalletPassphrase();
    return passphraseToPassphraseHexString(passPhrase);
  };

  this.deleteHDWallet = function(successCallback, errorCallback) {
    if(MyWallet.getHDWallet == undefined || MyWallet.getHDWallet() == null) {
      if (successCallback)
        successCallback();
      return;
    }
    this.setHDWallet(null);
    MyWallet.backupWallet('update', function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * Upgrade legacy wallet to HD wallet.
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   * @param {?function()=} success Success callback function.
   * @param {?function()=} error Error callback function.
   */
  this.upgradeToHDWallet = function(getPassword, success, error) {
    if (MyWallet.didUpgradeToHd()) {
      success && success();
      return;
    }

    var _success = function() {
      MyWallet.backupWalletDelayed('update');

      success && success();
    };

    var _error = function () {
      error && error();
    };

    MyWallet.initializeHDWallet(null, null, getPassword, _success, _error);
  };

  /**
   * Initialize HD wallet and create "Spending" account.
   * @param {?string} passphrase HD passphrase to generate the seed. If null, a seed will be generated.
   * @param {?string} bip39Password Password to protect the seed when generating seed from mnemonic.
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   * @param {function()} success Success callback function.
   * @param {function()} error Error callback function.
   */
  this.initializeHDWallet = function(passphrase, bip39Password, getPassword, success, error)  {
    function initializeHDWallet(passphrase, bip39Password, second_password, success, error) {
      didUpgradeToHd = true;

      var seedHexString;

      if (passphrase) {
        seedHexString = passphraseToPassphraseHexString(passphrase);
      }
      else {
        seedHexString = MyWallet.generateHDWalletSeedHex();
      }

      var _success = function () {
        account = MyWallet.getHDWallet().createAccount("Spending", second_password);

        account.setBalance(0);

        MyWallet.listenToHDWalletAccount(account.getAccountExtendedKey(false));

        success();
      };

      MyWallet.buildHDWallet(seedHexString, [], bip39Password, second_password, _success, error);
    }

    if (this.getDoubleEncryption()) {
      getPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          initializeHDWallet(passphrase, bip39Password, pw, success, error);
        } else {
          wrong_password();
          error();
        }
      });

    } else {
      initializeHDWallet(passphrase, bip39Password, null,  success, error);
    }
  };

  /**
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   * @param {function(string)} success Callback with the passphrase
   * @param {function(string)} error Callback with reason for failure
   */
  MyWallet.getHDWalletPassphraseString = function(getPassword, successCallback, errorCallback) {
    if (this.getDoubleEncryption()) {
      getPassword(function(pw, correct_password, incorrect_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          correct_password();
          var seed = MyWallet.decryptSecretWithSecondPassword(MyWallet.getHDWallet().getSeedHexString(), pw, sharedKey);
          successCallback(MyWallet.getHDWallet().getPassphraseString(seed));
        } else {
          incorrect_password();
          errorCallback();
        }
      });
    } else {
      var seed = MyWallet.getHDWallet().getSeedHexString();
      successCallback(MyWallet.getHDWallet().getPassphraseString(seed));
    }
  };

  /**
   * @param {string} candidate candidate address
   * @return {boolean} is valid address
   */
  this.isValidAddress = function(candidate) {
    try {
      Bitcoin.Address.fromBase58Check(candidate);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * @param {string} candidate candidate PrivateKey
   * @return {boolean} is valid PrivateKey
   */
  this.isValidPrivateKey = function(candidate) {
    try {
      var format = MyWallet.detectPrivateKeyFormat(candidate);
      if(format == "bip38") { return true }
      var key = MyWallet.privateKeyStringToKey(candidate, format);
      return key.pub.getAddress().toString();
    } catch (e) {
      return false;
    }
  };

  this.makeWalletJSON = function(format) {
    return MyWallet.makeCustomWalletJSON(format, guid, sharedKey);
  };

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

    var out = '{\n  "guid" : "'+guid+'",\n  "sharedKey" : "'+sharedKey+'",\n';

    if (double_encryption && dpasswordhash != null && encode_func == noConvert) {
      out += '  "double_encryption" : '+double_encryption+',\n  "dpasswordhash" : "'+dpasswordhash+'",\n';
    }

    if (wallet_options) {
      out += '  "options" : ' + JSON.stringify(wallet_options)+',\n';
    }

    out += '  "keys" : [\n';

    var atLeastOne = false;

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

      out += '    ' + JSON.stringify(addr) + ',\n';

      atLeastOne = true;
    }

    if (atLeastOne) {
      out = out.substring(0, out.length-2);
    }

    out += "\n  ]";

    if (nKeys(address_book) > 0) {
      out += ',\n  "address_book" : [\n';

      for (var key in address_book) {
        out += '    {"addr" : "'+ key +'",\n';
        out += '     "label" : "'+ address_book[key] + '"},\n';
      }

      //Remove the extra comma
      out = out.substring(0, out.length-2);

      out += "\n  ]";
    }

    if (nKeys(tx_notes) > 0) {
      out += ',\n  "tx_notes" : ' + JSON.stringify(tx_notes);
    }

    if (nKeys(tx_tags) > 0) {
      out += ',\n  "tx_tags" : ' + JSON.stringify(tx_tags);
    }

    if (tag_names != null) {
      out += ',\n  "tag_names" : ' + JSON.stringify(tag_names);
    }

    if (MyWallet.getHDWallet() != null) {

      out += ',\n  "hd_wallets" : [\n';

      out += '    {\n';
      out += '      "seed_hex" : "'+ MyWallet.getHDWallet().getSeedHexString() +'",\n';
      out += '      "mnemonic_verified" : '+ mnemonicVerified +',\n';
      out += '      "default_account_idx" : '+ defaultAccountIdx +',\n';
      if (paidTo != null) {
        out += '      "paidTo" : ' + JSON.stringify(paidTo) +',\n';
      }

      out += '      "accounts" : [\n';

      for (var i in MyWallet.getAccounts()) {
        var account = MyWallet.getHDWallet().getAccount(i);

        var accountJsonData = account.getAccountJsonData();
        out += '        ' + JSON.stringify(accountJsonData);
        if (i < MyWallet.getAccountsCount() - 1) {
          out += ",\n";
        }
      }
      out += "\n      ]";
      out += '\n    }';

      out += "\n  ]";
    }

    out += '\n}';

    return out;
  };

  /**
   * calls success callback with json object, or error callback with error object
   * @param {function()} successcallback callback function
   * @param {function()} errorcallback callback function
   */
  this.get_ticker = function(successCallback, errorCallback) {
    BlockchainAPI.get_ticker(successCallback, errorCallback);
  };

  /**
   * @param {number} time unix time
   * @param {number} value amount in satoshis
   * @param {string} currencyCode currency code
   * @param {function()} successcallback callback function with fiat amount
   * @param {function()} errorcallback callback function
   */
  this.getFiatAtTime = function(time, value, currencyCode, successCallback, errorCallback) {
    BlockchainAPI.getFiatAtTime(time, value, currencyCode, successCallback, errorCallback);
  };

  this.get_account_info = function(successCallback, errorCallback) {
    BlockchainAPI.get_account_info(successCallback, errorCallback);
  };

  this.enableApiAccess = function(successCallback, errorCallback) {
    MyWallet.update_API_access(true, successCallback, errorCallback);
  };

  this.disableApiAccess = function(successCallback, errorCallback) {
    MyWallet.update_API_access(false, successCallback, errorCallback);
  };

  this.update_API_access = function(enabled, successCallback, errorCallback) {
    BlockchainAPI.update_API_access(enabled, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * @param {string} ips Multiple ip addresses should be comma separated. Use % as a wildcard. For example 127.0.0.% to whitelist 127.0.0.1-127.0.0.254.
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   */
  this.setIPWhitelist = function(ips, successCallback, errorCallback) {
    BlockchainAPI.update_IP_lock(ips, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.enableRestrictToWhiteListedIPs = function(successCallback, errorCallback) {
    MyWallet.update_IP_lock_on(true, successCallback, errorCallback);
  };

  this.disableRestrictToWhiteListedIPs = function(successCallback, errorCallback) {
    MyWallet.update_IP_lock_on(false, successCallback, errorCallback);
  };

  this.update_IP_lock_on = function(enabled, successCallback, errorCallback) {
    BlockchainAPI.update_IP_lock_on(enabled, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.change_language = function(language, successCallback, errorCallback) {
    BlockchainAPI.change_language(language, function() {
      MyWallet.setLanguage(language);

      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.change_local_currency = function(code, successCallback, errorCallback) {
    BlockchainAPI.change_local_currency(code, function() {
      var original_code = symbol_local.code;
      symbol_local.code = code;
      MyWallet.get_history();
      symbol_local.code = original_code;
      MyWallet.setLocalSymbolCode(code);

      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

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
  };

  this.update_tor_ip_block = function(enabled, successCallback, errorCallback) {
    BlockchainAPI.update_tor_ip_block(enabled ? 1 : 0, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.update_password_hint1 = function(value, successCallback, errorCallback) {
    BlockchainAPI.update_password_hint1(value, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.update_password_hint2 = function(value, successCallback, errorCallback) {
    BlockchainAPI.update_password_hint2(value, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.change_email = function(email, successCallback, errorCallback) {
    BlockchainAPI.change_email(email, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.changeMobileNumber = function(val, successCallback, errorCallback) {
    BlockchainAPI.changeMobileNumber(val, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * Verify email with code.
   * @param {string} code verfication code.
   * @param {function(Object)} successCallback Success callback function.
   * @param {function()} errorCallback Error callback function.
   */
  this.verifyEmail = function(code, successCallback, errorCallback) {
    BlockchainAPI.verifyEmail(code, function(data) {
      if (successCallback)
        successCallback(data);
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * Verify mobile with code.
   * @param {string} code verfication code.
   * @param {function(Object)} successCallback Success callback function.
   * @param {function()} errorCallback Error callback function.
   */
  this.verifyMobile = function(code, successCallback, errorCallback) {
    BlockchainAPI.verifyMobile(code, function(data) {
      if (successCallback)
        successCallback(data);
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  /**
   * Resend email with verfication code.
   * @param {string} email.
   * @param {function()} successCallback Success callback function.
   * @param {function()} errorCallback Error callback function.
   */
  this.resendEmailConfirmation = function(email, successCallback, errorCallback) {
    BlockchainAPI.resendEmailConfirmation(email, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.disableSaveTwoFactor = function(successCallback, errorCallback) {
    BlockchainAPI.toggleSave2FA(true, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.enableSaveTwoFactor = function(successCallback, errorCallback) {
    BlockchainAPI.toggleSave2FA(false, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.unsetTwoFactor = function(successCallback, errorCallback) {
    BlockchainAPI.unsetTwoFactor(successCallback, errorCallback);
  };

  this.setTwoFactorSMS = function(successCallback, errorCallback) {
    BlockchainAPI.setTwoFactorSMS(successCallback, errorCallback);
  };

  this.setTwoFactorYubiKey = function(successCallback, errorCallback) {
    BlockchainAPI.setTwoFactorYubiKey(successCallback, errorCallback);
  };

  this.setTwoFactorEmail = function(successCallback, errorCallback) {
    BlockchainAPI.setTwoFactorEmail(successCallback, errorCallback);
  };

  this.setTwoFactorGoogleAuthenticator = function(successCallback, errorCallback) {
    BlockchainAPI.setTwoFactorGoogleAuthenticator(function(google_secret_url) {
      if (successCallback)
        successCallback(google_secret_url);
    }, function(e) {
      if (errorCallback)
        errorCallback(e);
    });
  };

  this.confirmTwoFactorGoogleAuthenticator = function(code, successCallback, errorCallback) {
    BlockchainAPI.confirmTwoFactorGoogleAuthenticator(code, function() {
      if (successCallback)
        successCallback();
    }, function() {
      if (errorCallback)
        errorCallback();
    });
  };

  this.get_history_with_addresses = function(addresses, success, error) {
    BlockchainAPI.get_history_with_addresses(addresses, function(data) {
      if (success) success(data);
    }, function() {
      if (error) error();

    }, tx_filter, tx_page*MyWallet.getNTransactionsPerPage(), MyWallet.getNTransactionsPerPage());
  };

  this.get_history = function(success, error) {
    BlockchainAPI.get_history(function(data) {

      parseMultiAddressJSON(data, false, false);

      success && success();

    }, function() {
      error && error();

    }, tx_filter, tx_page*MyWallet.getNTransactionsPerPage(), MyWallet.getNTransactionsPerPage());
  };

  /**
   * Delete address from addressBook and backup wallet.
   * @param {string} addr Bitcoin address
   */
  this.deleteAddressBook = function(addr) {
    delete address_book[addr];

    MyWallet.backupWalletDelayed();
  };

  /**
   * @return {Array} get all legacy addresses
   */
  this.getAllLegacyAddresses = function() {
    var array = [];
    for (var key in addresses) {
      array.push(key);
    }
    return array;
  };

  /**
   * Find the preferred address to use for change
   * Order deposit / request coins
   * @return {string} preferred address
   */
  this.getPreferredLegacyAddress = function() {
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
  };

  /**
   * @return {boolean} has legacy addresses
   */
  this.hasLegacyAddresses = function() {
    return (Object.keys(addresses).length != 0);
  };

  /**
   * @return {Array} legacy active addresses
   */
  this.getLegacyActiveAddresses = function() {
    var array = [];
    for (var key in addresses) {
      var addr = addresses[key];
      //Don't include archived addresses
      if (addr.tag != 2)
        array.push(addr.addr);
    }
    return array;
  };


  /**
   * @return {Array} archived addresses
   */
  this.getLegacyArchivedAddresses = function() {
    var array = [];
    for (var key in addresses) {
      var addr = addresses[key];
      //Don't include archived addresses
      if (addr.tag == 2)
        array.push(addr.addr);
    }
    return array;
  };

  /**
   * @return {Object} Latest block object
   */
  this.getLatestBlock = function() {
    return latest_block;
  };

  this.getConfirmationsForTx = function(latest_block, tx) {
    if (latest_block && tx.blockHeight != null && tx.blockHeight > 0) {
      return latest_block.height - tx.blockHeight + 1;
    } else {
      tx.setConfirmations(0);
      return 0;
    }
  };

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

  /**
   * @param {string} tx_hash Transaction hash.
   * @return {string} note
   */
  this.getNote = function(tx_hash) {
    return tx_notes[tx_hash];
  };

  /**
   * Delete transaction note and backup wallet.
   * @param {string} tx_hash Transaction hash.
   */
  this.deleteNote = function(tx_hash) {
    delete tx_notes[tx_hash];

    MyWallet.backupWalletDelayed();
  };

  /**
   * @param {string} tx_hash Transaction hash.
   * @param {string} text note
   * @return {boolean} success or not
   */
  this.setNote = function(tx_hash, text) {
    if (! isAlphaNumericSpace(text))
      return false;
    tx_notes[tx_hash] = text;
    MyWallet.backupWalletDelayed();
    return true;
  };

  /**
   * @param {string} tx_hash Transaction hash.
   * @return {Array} tags
   */
  this.getTags = function(tx_hash) {
    return tx_tags[tx_hash] || [];
  };

  /**
   * @param {string} tx_hash Transaction hash.
   * @param {number} idx index
   */
  this.setTag = function(tx_hash, idx) {
    if (tx_tags[tx_hash] == null) {
      tx_tags[tx_hash] = [];
    }
    tx_tags[tx_hash].push(idx);
    MyWallet.backupWalletDelayed();
  };

  /**
   * @param {string} tx_hash Transaction hash.
   * @param {number} idx index
   */
  this.unsetTag = function(tx_hash, idx) {
    var tags = tx_tags[tx_hash];
    var index = tx_tags.indexOf(idx);
    if (index > -1) {
      tx_tags.splice(index, 1);
    }
    MyWallet.backupWalletDelayed();
  };

  /**
   * @return {Array} Tag Names
   */
  this.getTagNames = function() {
    return tag_names;
  };

  /**
   * @param {string} name tag name
   * @return {boolean} success or not
   */
  this.addTag = function(name) {
    if (! isAlphaNumericSpace(name))
      return false;
    tag_names.push(name);
    MyWallet.backupWalletDelayed();
    return true;
  };

  /**
   * @param {number} idx index
   * @param {string} name tag name
   * @return {boolean} success or not
   */
  this.renameTag = function(idx, name) {
    if (! isAlphaNumericSpace(name))
      return false;
    tag_names[idx] = name;
    MyWallet.backupWalletDelayed();
    return true;
  };

  /**
   * @param {number} idx index
   */
  this.deleteTag = function(idx) {
    tag_names.splice(idx,1);

    for (var tx_hash in tx_tags) {
      var tags = tx_tags[tx_hash];
      var index = tx_tags.indexOf(idx);
      if (index > -1) {
        tx_tags.splice(index, 1);
      }
    }
    //MyWallet.backupWalletDelayed();
  };

  // Must allow the following characters:
  // + : needed for sent to phone number labels
  function isAlphaNumericSpace(input) {
    return XRegExp("^\\p{L}[\\p{L}@ \\-,._']*$").test(input) || /^[\w\-+,._  ]+$/.test(input);
  }

  function parseMultiAddressJSON(obj, cached, checkCompleted) {
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

        if (obj.info.notice)
          MyWallet.sendEvent("msg", {type: "error", message: obj.info.notice});
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
      if (addresses[obj.addresses[i].address]) {
        MyWallet.setLegacyAddressBalance(obj.addresses[i].address, obj.addresses[i].final_balance);
        // addresses[obj.addresses[i].address].balance = obj.addresses[i].final_balance;
      }

      for (var j in MyWallet.getAccounts()) {
        var account = MyWallet.getHDWallet().getAccount(j);

        if(!account.isArchived()) {
          var extPubKey = account.getAccountExtendedKey(false);

          if (extPubKey == obj.addresses[i].address) {
            account.setBalance(obj.addresses[i].final_balance);
            account.n_tx = obj.addresses[i].n_tx;
          }
        }
      }
    }

    isAccountRecommendedFeesValid = false;
    for (var i = 0; i < obj.txs.length; ++i) {
      var tx = TransactionFromJSON(obj.txs[i]);
      //Don't use the result given by the api because it doesn't include archived addresses
      tx.result = calcTxResult(tx, false, checkCompleted, false);

      transactions.push(tx);
    }

    if (!cached) {
      if (obj.info.latest_block)
        setLatestBlock(obj.info.latest_block);
    }

    MyWallet.sendEvent('did_multiaddr');
  }

  function didDecryptWallet(success) {

    //We need to check if the wallet has changed
    MyWallet.getWallet();

    logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());

    success();
  }

  /**
   * Get the list of transactions from the http API.
   * Needs to be called by client in the success callback of fetchWalletJson and after MyWallet.initializeHDWallet
   * @param {function()=} success Success callback function.
   */
  this.getHistoryAndParseMultiAddressJSON = function(_success) {
    var success = function() {
      _success && _success();
    };

    var error = function() {
      MyStore.get('multiaddr', function(multiaddrjson) {
        if (multiaddrjson != null) {
          parseMultiAddressJSON($.parseJSON(multiaddrjson), true, false);
          _success && _success();
        }
      });
    };

    var addresses = xpubs.concat(MyWallet.getLegacyActiveAddresses());
    BlockchainAPI.async_get_history_with_addresses(addresses, function(data) {
      parseMultiAddressJSON(data, false, false);
      success && success();
    }, function() {
      error && error();
    }, tx_filter, tx_page*MyWallet.getNTransactionsPerPage(), MyWallet.getNTransactionsPerPage());
  };

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
  };

  function internalRestoreWallet(success, error, decrypt_success, build_hd_success) {
    if (encrypted_wallet_data == null || encrypted_wallet_data.length == 0) {
      error('No Wallet Data To Decrypt');
      return;
    }

    MyWallet.decryptWallet(encrypted_wallet_data, password, function(obj, rootContainer) {
      decrypt_success && decrypt_success();

      try {
        sharedKey = obj.sharedKey;

        if (!sharedKey || sharedKey.length == 0 || sharedKey.length != 36) {
          throw 'Shared Key is invalid';
        }

        if (rootContainer) {
          wallet_options.pbkdf2_iterations = rootContainer.pbkdf2_iterations;
        }

        if (obj.double_encryption && obj.dpasswordhash) {
          MyWallet.setDoubleEncryption(obj.double_encryption);
          dpasswordhash = obj.dpasswordhash;
        }

        if (obj.options) {
          $.extend(wallet_options, obj.options);
        }

        addresses = {};
        for (var i = 0; i < obj.keys.length; ++i) {
          var key = obj.keys[i];
          if (!key.addr || !isAlphaNumericSpace(key.addr)) {
            MyWallet.sendEvent("msg", {type: "error", message: 'Your wallet contains an invalid address. This is a sign of possible corruption, please double check all your BTC is accounted for. Backup your wallet to remove this error.'});
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

        if (obj.hd_wallets && obj.hd_wallets.length > 0) {
          didUpgradeToHd = true;
          var defaultHDWallet = obj.hd_wallets[0];
          if (haveBuildHDWallet == false) {
            xpubs = [];
            for (var i in defaultHDWallet.accounts) {
              var account  = defaultHDWallet.accounts[i];

              if(!account.archived) {
                xpubs.push(account.xpub);
              }
            }

            // We're not passing a bip39 or second password
            MyWallet.buildHDWallet(defaultHDWallet.seed_hex, defaultHDWallet.accounts, undefined, undefined, build_hd_success);
            haveBuildHDWallet = true;
          }
          if (defaultHDWallet.mnemonic_verified) {
            mnemonicVerified = defaultHDWallet.mnemonic_verified;
          } else {
            mnemonicVerified = false;
          }
          if (defaultHDWallet.default_account_idx) {
            defaultAccountIdx = defaultHDWallet.default_account_idx;
          } else {
            defaultAccountIdx = 0;
          }

          if (defaultHDWallet.paidTo != null) {
            paidTo = defaultHDWallet.paidTo;
            MyWallet.checkForRecentlyRedeemed(defaultHDWallet.paidTo);
          }

        } else {
          didUpgradeToHd = false;
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

        if (obj.tx_tags) {
          for (var tx_hash in obj.tx_tags) {
            var tags = obj.tx_tags[tx_hash];

            if (tags && isAlphaNumericSpace(tags)) {
              tx_tags[tx_hash] = tags;
            }
          }
        }
        if (obj.tag_names) {
          tag_names = obj.tag_names;
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

  this.makePairingCode = function(success, error) {
    try {
      MyWallet.securePost('wallet', { method : 'pairing-encryption-password' }, function(encryption_phrase) {
        success('1|' + guid + '|' + MyWallet.encrypt(sharedKey + '|' + CryptoJS.enc.Utf8.parse(password).toString(), encryption_phrase, 10));
      }, function(e) {
        error(e);
      });
    } catch (e) {
      error(e);
    }
  };

  /**
   * Fetch information on wallet identfier with resend code set to true
   * @param {string} user_guid User GUID.
   * @param {function()} success Success callback function.
   * @param {function()} error Error callback function.
   */
  this.resendTwoFactorSMS = function(user_guid, success, error) {
    MyWallet.fetchWalletJson(user_guid, null, true, null, null, success, function() {}, null, null, error);
  };

  /**
   * Fetch wallet from server, decrypt and build wallet model.
   * @param {string} user_guid User GUID.
   * @param {?string} shared_key User shared key.
   * @param {bool} resend_code Whether this is a resend or not.
   * @param {string} inputedPassword User password.
   * @param {?string} twoFACode User 2 factor code.
   * @param {function()} success Success callback function.
   * @param {function(number)} needs_two_factor_code Require 2 factor code callback function.
   * @param {function()} wrong_two_factor_code 2 factor code incorrect callback function.
   * @param {function()} other_error Other error callback function.
   * @param {function()=} fetch_success Called when wallet was fetched successfully.
   * @param {function()=} decrypt_success Called when wallet was decrypted successfully.
   * @param {function()=} build_hd_success Called when the HD part of the wallet was initialized successfully.
   */
  this.fetchWalletJson = function(user_guid, shared_key, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, authorization_required, other_error, fetch_success, decrypt_success, build_hd_success) {
    if (!resend_code && didSetGuid) {
      MyWallet.restoreWallet(inputedPassword, twoFACode, success, wrong_two_factor_code, other_error, decrypt_success, build_hd_success);
      return;
    }

    if (isInitialized) {
      other_error('Cannot Set GUID Once Initialized');
      return;
    }

    guid = user_guid;
    sharedKey = shared_key;

    var clientTime=(new Date()).getTime();
    var data = {format : 'json', resend_code : resend_code, ct : clientTime};

    if (payload_checksum) {
      data.checksum = payload_checksum;
    }

    if (sharedKey) {
      data.sharedKey = sharedKey;
    }

    data.api_code = MyWallet.getAPICode();

    $.ajax({
      type: "GET",
      dataType: 'json',
      url: BlockchainAPI.getRootURL() + 'wallet/'+user_guid,
      // contentType: "application/json; charset=utf-8",
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      data : data,
      timeout: 60000,
      success: function(obj) {
        fetch_success && fetch_success();

        MyWallet.handleNTPResponse(obj, clientTime);

        if (!obj.guid) {
          MyWallet.sendEvent("msg", {type: "error", message: 'Server returned null guid.'});
          other_error('Server returned null guid.');
          return;
        }

        guid = obj.guid;
        auth_type = obj.auth_type;
        real_auth_type = obj.real_auth_type;
        sync_pubkeys = obj.sync_pubkeys;

        if (obj.payload && obj.payload.length > 0 && obj.payload != 'Not modified') {
          MyWallet.setEncryptedWalletData(obj.payload);
        } else {
          didSetGuid = true;
          needs_two_factor_code(MyWallet.get2FAType());
          return;
        }

        war_checksum = obj.war_checksum;

        setLocalSymbol(obj.symbol_local);
        MyWallet.setLocalSymbolCode(obj.symbol_local.code);

        setBTCSymbol(obj.symbol_btc);

        if (obj.initial_error) {
          MyWallet.sendEvent("msg", {type: "error", message: obj.initial_error});
        }

        if (obj.initial_success) {
          MyWallet.sendEvent("msg", {type: "success", message: obj.initial_success});
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

        didSetGuid = true;
        MyWallet.restoreWallet(inputedPassword, twoFACode, success, wrong_two_factor_code, other_error, decrypt_success, build_hd_success);
      },
      error : function(e) {
        if(e.responseJSON && e.responseJSON.initial_error && !e.responseJSON.authorization_required) {
          other_error(e.responseJSON.initial_error);
          return;
        }

        // Disabled fallback to local cache.

        // MyStore.get('guid', function(local_guid) {
        //     MyStore.get('payload', function(local_payload) {
        //         //Error downloading wallet from server
        //         //But we can use the local cache
        //
        //         if (local_guid == user_guid && local_payload) {
        //             fetch_success && fetch_success();
        //             MyWallet.setEncryptedWalletData(local_payload);
        //
        //             //Generate a new Checksum
        //             guid = local_guid;
        //             payload_checksum = generatePayloadChecksum();
        //             auth_type = 0;
        //
        //             didSetGuid = true;
        //             MyWallet.restoreWallet(inputedPassword, twoFACode, success, wrong_two_factor_code, other_error, decrypt_success, build_hd_success);
        //         }  else {
        MyWallet.sendEvent('did_fail_set_guid');

        try {
          var obj = $.parseJSON(e.responseText);

          if (obj.authorization_required) {
            authorization_required(function(authorization_received) {
              MyWallet.pollForSessionGUID(user_guid, shared_key, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, authorization_received, other_error);
            });
          }

          if (obj.initial_error) {
            MyWallet.sendEvent("msg", {type: "error", message: obj.initial_error});
          }

          return;
        } catch (ex) {}

        if (e.responseText)
          MyWallet.sendEvent("msg", {type: "error", message: e.responseText});
        else
          MyWallet.sendEvent("msg", {type: "error", message: 'Error changing wallet identifier'});
        //         }
        //     });
        // });
      }
    });
  };

  this.pollForSessionGUID = function(user_guid, shared_key, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, authorization_received, other_error) {
    if (isPolling) return;

    isPolling = true;

    $.ajax({
      dataType: 'json',
      // contentType: "application/json; charset=utf-8",
      data: {format : 'plain'},
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      type: "GET",
      url: BlockchainAPI.getRootURL() + 'wallet/poll-for-session-guid',
      success: function (obj) {
        var self = this;
        if (obj.guid) {

          isPolling = false;

          authorization_received();

          MyWallet.sendEvent("msg", {type: "success", message: 'Authorization Successful'});

          MyWallet.fetchWalletJson(user_guid, shared_key, resend_code, inputedPassword, twoFACode, success, needs_two_factor_code, wrong_two_factor_code, null, other_error);
        } else {
          if (counter < 600) {
            ++counter;
            setTimeout(function() {
              $.ajax(self);
            }, 2000);
          } else {
            isPolling = false;
          }
        }
      },
      error : function() {
        isPolling = false;
      }
    });
  };

  this.restoreWallet = function(pw, two_factor_auth_key, success, wrong_two_factor_code, other_error, decrypt_success, build_hd_success) {

    if (isInitialized || isRestoringWallet) {
      return;
    }

    function _error(e) {
      isRestoringWallet = false;
      MyWallet.sendEvent("msg", {type: "error", message: e});

      MyWallet.sendEvent('error_restoring_wallet');
      other_error(e);
    }

    try {
      isRestoringWallet = true;

      password = pw;

      //If we don't have any wallet data then we must have two factor authentication enabled
      if (encrypted_wallet_data == null || encrypted_wallet_data.length == 0) {
        if (two_factor_auth_key == null) {
          other_error('Two Factor Authentication code this null');
          return;
        }

        if (two_factor_auth_key.length == 0 || two_factor_auth_key.length > 255) {
          other_error('You must enter a Two Factor Authentication code');
          return;
        }

        $.ajax({
          timeout: 60000,
          type: "POST",
          // contentType: "application/json; charset=utf-8",
          xhrFields: {
            withCredentials: true
          },
          crossDomain: true,
          url: BlockchainAPI.getRootURL() + "wallet",
          data :  { guid: guid, payload: two_factor_auth_key, length : two_factor_auth_key.length,  method : 'get-wallet', format : 'plain', api_code : MyWallet.getAPICode()},
          success: function(data) {
            try {
              if (data == null || data.length == 0) {
                other_error('Server Return Empty Wallet Data');
                return;
              }

              if (data != 'Not modified') {
                MyWallet.setEncryptedWalletData(data);
              }

              internalRestoreWallet(function() {
                isRestoringWallet = false;

                didDecryptWallet(success);
              }, _error, decrypt_success, build_hd_success);
            } catch (e) {
              _error(e);
            }
          },
          error : function (response) {
            _error(response.responseText);
            wrong_two_factor_code();
          }
        });
      } else {
        internalRestoreWallet(function() {
          isRestoringWallet = false;

          didDecryptWallet(success);
        }, _error, decrypt_success, build_hd_success);
      }
    } catch (e) {
      _error(e);
    }
  };

  this.getIsInitialized = function() {
    return isInitialized;
  };

  function setIsInitialized() {
    if (isInitialized) return;

    webSocketConnect(wsSuccess);

    isInitialized = true;
  }

  this.connectWebSocket = function() {
    webSocketConnect(wsSuccess);
  };

  function emailBackup() {
    MyWallet.securePost("wallet", { method : 'email-backup' }, function(data) {
      MyWallet.sendEvent("msg", {type: "success", message: 'backup-success' + data});
    }, function(e) {
      MyWallet.sendEvent("msg", {type: "error", message: e.responseText});
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
  };

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
  };

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
      MyWallet.sendEvent('on_backup_wallet_error');

      MyWallet.sendEvent("msg", {type: "error", message: 'Error Saving Wallet: ' + e});

      // Re-fetch the wallet from server
      MyWallet.getWallet();

      errorcallback && errorcallback(e);
    };

    try {
      if (method == null) {
        method = 'update';
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
          MyWallet.sendEvent('on_backup_wallet_start');

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
            data.active = MyWallet.getLegacyActiveAddresses().join('|');
          }

          MyWallet.securePost("wallet", data, function(data) {
            checkWalletChecksum(new_checksum, function() {
              for (var key in addresses) {
                var addr = addresses[key];
                if (addr.tag == 1) {
                  delete addr.tag; //Make any unsaved addresses as saved
                }
              }

              if (successcallback != null)
                successcallback();

              isSynchronizedWithServer = true;
              MyWallet.disableLogout(false);
              logout_timeout = setTimeout(MyWallet.logout, MyWallet.getLogoutTime());
              MyWallet.sendEvent('on_backup_wallet_success');
            }, function() {
              _errorcallback('Checksum Did Not Match Expected Value');
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
  };

  this.isBase58 = function(str, base) {
    for (var i = 0; i < str.length; ++i) {
      if (str[i] < 0 || str[i] > 58) {
        return false;
      }
    }
    return true;
  };

  this.encrypt = function(data, password, pbkdf2_iterations) {
    var salt = CryptoJS.lib.WordArray.random(16);

    var streched_password = MyWallet.stretchPassword(password, salt, pbkdf2_iterations);

    var iv = salt; // Use the same value for IV and salt.

    var payload = CryptoJS.enc.Utf8.parse(data);

    // AES.encrypt takes an optional salt argument, which we don't use.
    var encrypted = CryptoJS.AES.encrypt(payload, streched_password, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126, iv: iv});

    // Add IV to beginning of payload (using hex strings):
    var res = iv.toString() + encrypted.ciphertext.toString();

    // Return as Base64:
    return CryptoJS.enc.Hex.parse(res).toString(CryptoJS.enc.Base64);
  };

  this.encryptWallet = function(data, password) {
    return JSON.stringify({
      pbkdf2_iterations : MyWallet.getPbkdf2Iterations(),
      version : MyWallet.didUpgradeToHd() ? 3.0 : 2.0,
      payload : MyWallet.encrypt(data, password, MyWallet.getPbkdf2Iterations())
    });
  };

  this.decryptWallet = function(data, password, success, error) {
    try {
      var _success = function (root, obj) {
        success && success(root, obj);
      };

      var _error = function (e) {
        error && error(e);
      };

      //Test if the payload is valid json
      //If it is json then check the payload and pbkdf2_iterations keys are available
      var obj = null;
      try {
        var obj = $.parseJSON(data);
      } catch (e) {}

      var decryptNormal = function() {
        try {
          var decrypted = decryptAesWithStretchedPassword(obj.payload, password, obj.pbkdf2_iterations);

          var root = $.parseJSON(decrypted);

          _success(root, obj);
        } catch (e) {
          _error('Error Decrypting Wallet. Please check your password is correct.');
        }
      };

      // Wallet v2+ format: wrapper with pbkdf2 iterations and payload with encrypted data
      if (obj && obj.payload && obj.pbkdf2_iterations) {
        if (obj.version > supported_encryption_version)
          throw 'Wallet version ' + obj.version + ' not supported. Please upgrade to the newest Blockchain Wallet.';

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
      }
      // TODO legacy format - what should we support here
      // Legacy format: just encrypted data, pbkdf2 iterations can be 10 or maybe 1
      else {
        MyWallet.decrypt(data, password, 10, function(decrypted) {
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
  };

  this.getWebWorkerLoadPrefix = function() {
    return BlockchainAPI.getRootURL() + resource + 'wallet/';
  };

  this.decryptWebWorker = function(data, password, pbkdf2_iterations, success, _error) {
    var didError = false;
    var error = function(e) {
      if (!didError) { _error(e); didError = true; }
    };

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
  };

  //When the ecryption format changes it can produce data which appears to decrypt fine but actually didn't
  //So we call success(data) and if it returns true the data was formatted correctly
  this.decrypt = function(data, password, pbkdf2_iterations, success, error) {
    //iso10126 with pbkdf2_iterations iterations

    try {
      /* This is currently (2014-11-28) the default wallet format. 
       There are two steps to decrypting the wallet. The first step is to
       stretch the users password using PBKDF2. This essentially generates
       an AES key which we need for the second step, which is to decrypt
       the payload using AES.

       Strechting the password requires a salt. AES requires an IV. We use
       the same for both. It's the first 32 hexadecimals characters (i.e.
       16 bytes).

       The conversions between different encodings can probably be achieved
       with fewer methods.
       */

      var decoded = decryptAesWithStretchedPassword(data, password, pbkdf2_iterations);

      if (decoded != null && decoded.length > 0) {
        if (success(decoded)) {
          return decoded;
        };
      };
    } catch (e) {
      console.log(e);
    }

    // Disabled 2015-03-06 by Sjors pending refactoring (salt is undefined here)

    // //iso10126 with 10 iterations  (old default)
    // if (pbkdf2_iterations != 10) {
    //     try {
    //         var streched_password = MyWallet.stretchPassword(password, salt, 10);
    //
    //         var decrypted = CryptoJS.AES.decrypt({ciphertext: payload, salt: ""}, streched_password, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126, iv: iv});
    //
    //         var decoded = decrypted.toString(CryptoJS.enc.Utf8);
    //
    //         if (decoded != null && decoded.length > 0) {
    //             if (success(decoded)) {
    //                 return decoded;
    //             };
    //         };
    //     } catch (e) {
    //         console.log(e);
    //     }
    // }

    //Otherwise try the old default settings

    // Disabled by Sjors on 2014-11-26, for lack of test wallet.

    // try {
    //     var decoded = CryptoJS.AES.decrypt(data, password);
    //
    //     if (decoded != null && decoded.length > 0) {
    //         if (success(decoded)) {
    //             return decoded;
    //         };
    //     };
    // } catch (e) {
    //     console.log(e);
    // }

    //OFB iso7816 padding with one iteration (old default)

    // Disabled by Sjors on 2014-11-26, because the current CryptoJS doesn't support iso7816. 

    // try {
    //     var decoded = CryptoJS.AES.decrypt(data, password, {mode: new CryptoJS.mode.OFB(CryptoJS.pad.Iso7816), iterations : 1});
    //
    //     if (decoded != null && decoded.length > 0) {
    //         if (success(decoded)) {
    //             return decoded;
    //         };
    //     };
    // } catch (e) {
    //     console.log(e);
    // }

    //iso10126 padding with one iteration (old default)
    try {
      var decoded = CryptoJS.AES.decrypt(data, password, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126, iterations : 1 });

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
  };

  this.decryptPasswordWithProcessedPin = function(data, password, pbkdf2_iterations) {
    return decryptAesWithStretchedPassword(data, password, pbkdf2_iterations);
  };

  this.stretchPassword = function(password, salt, pbkdf2_iterations) {
    // Stretch the password using PBKDF2
    // This uses sjcl for speed reasons (order of magnitude faster than CryptoJS using sjcl 1.0.1 vs CryptoJS 3.1.2)
    // sjcl defaults to sha256, but we need sha1 according to rfc 2898
    var hmacSHA1 = function (key) {
      var hasher = new sjcl.misc.hmac(key, sjcl.hash.sha1);
      this.encrypt = function () {
        return hasher.encrypt.apply(hasher, arguments);
      };
    };

    // need to convert CryptoJS word objects to sjcl word objects
    salt = sjcl.codec.hex.toBits(salt.toString(CryptoJS.enc.Hex));
    var streched_password = sjcl.misc.pbkdf2(password, salt, pbkdf2_iterations, 256, hmacSHA1);
    // convert back
    return CryptoJS.enc.Hex.parse(sjcl.codec.hex.fromBits(streched_password));
  };

  function decryptAesWithStretchedPassword(data, password, pbkdf2_iterations) {
    // Convert base64 string data to hex string
    var data_hex_string = CryptoJS.enc.Base64.parse(data).toString();
    // Pull out the Initialization vector from data (@see http://en.wikipedia.org/wiki/Initialization_vector )
    var iv = CryptoJS.enc.Hex.parse(data_hex_string.slice(0,32));

    // We use same value for the PBKDF2 salt and the AES IV. But we do not use a salt in the AES encryption
    var salt = iv;

    var streched_password = MyWallet.stretchPassword(password, salt, pbkdf2_iterations);

    // Remove the first 16 bytes (IV) from the payload:
    var payload_hex_string = data_hex_string.slice(32);

    // Paylod is cipthertext without IV as bytes
    var payload = CryptoJS.enc.Hex.parse(payload_hex_string);

    // AES decryption expects a base 64 encoded payload:
    var payload_base_64 = payload.toString(CryptoJS.enc.Base64);

    // AES.decrypt takes an optional salt argument, which we don't use.
    var decrypted = CryptoJS.AES.decrypt({ciphertext: payload, salt: ""}, streched_password, { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126, iv: iv});
    // Decrypted is returned as bytes, we convert it to a UTF8 String
    var decoded = decrypted.toString(CryptoJS.enc.Utf8);

    return decoded;
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
  };

  // Expects a secret (e.g. a private key, xpriv of seed hex) and the second
  // password. Returns the encrypted secret:
  this.encryptSecretWithSecondPassword = function(base58, password, sharedKey) {
    return MyWallet.encrypt(base58, sharedKey + password, MyWallet.getPbkdf2Iterations());
  };

  // Expects an ecrypted secret (e.g. a private key, xpriv or seed hex) and
  // the second password. Returns the secret:
  this.decryptSecretWithSecondPassword = function(secret, password, sharedKey) {
    return MyWallet.decrypt(secret, sharedKey + password, MyWallet.getPbkdf2Iterations(), MyWallet.isBase58);
  };

  /**
   * @param {string} address bitcoin address
   * @param {string} message message
   * @return {string} message signature in base64
   */
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
  };

  /**
   * @param {string} input second password
   * @return {boolean} whether input matches set second password
   */
  this.isCorrectSecondPassword = function(input) {
    if (! double_encryption) {
      throw 'No second password set';
    }

    var thash = CryptoJS.SHA256(sharedKey + input);

    var password_hash = hashPassword(thash, MyWallet.getPbkdf2Iterations()-1);  //-1 because we have hashed once in the previous line

    if (password_hash == dpasswordhash) {
      return true;
    }

    return false;
  };

  /**
   * @param {string} input second password
   * @return {boolean} whether input matches second password
   */
  this.validateSecondPassword = function(input) {
    var thash = CryptoJS.SHA256(sharedKey + input);

    var password_hash = hashPassword(thash, MyWallet.getPbkdf2Iterations()-1);  //-1 because we have hashed once in the previous line

    if (password_hash == dpasswordhash) {
      return true;
    }

    //Try 10 rounds
    if (MyWallet.getPbkdf2Iterations() != 10) {
      var iter_10_hash = hashPassword(thash, 10-1);  //-1 because we have hashed once in the previous line

      if (iter_10_hash == dpasswordhash) {
        // dpassword = input;
        dpasswordhash = password_hash;
        return true;
      }
    }

    /*
     //disable old crypto stuff
     //Otherwise try SHA256 + salt
     if (Crypto.util.bytesToHex(thash) == dpasswordhash) {
     dpasswordhash = password_hash;
     return true;
     }

     //Legacy as I made a bit of a mistake creating a SHA256 hash without the salt included
     var leghash = Crypto.SHA256(input);

     if (leghash == dpasswordhash) {
     dpasswordhash = password_hash;
     return true;
     }
     //*/

    return false;
  };

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
  };

  /**
   * Check the integrity of all keys in the wallet
   * @param {string?} second_password Second password to decrypt private keys if set
   */
  this.checkAllKeys = function(second_password) {
    for (var key in addresses) {
      var addr = addresses[key];

      if (addr.addr == null)
        throw 'Null Address Found in wallet ' + key;

      //Will throw an exception if the checksum does not validate
      if (addr.addr.toString() == null)
        throw 'Error decoding wallet address ' + addr.addr;

      if (addr.priv != null) {
        var decryptedpk;

        if(second_password == null) {
          decryptedpk = addr.priv;
        } else {
          decryptedpk = MyWallet.decryptSecretWithSecondPassword(addr.priv, second_password, sharedKey);
        }

        var decodedpk = MyWallet.B58LegacyDecode(decryptedpk);

        var privatekey = new ECKey(new BigInteger.fromBuffer(decodedpk), false);

        var actual_addr = MyWallet.getUnCompressedAddressString(privatekey);
        if (actual_addr != addr.addr && MyWallet.getCompressedAddressString(privatekey) != addr.addr) {
          throw 'Private key does not match bitcoin address ' + addr.addr + " != " + actual_addr;
        }

        if (second_password != null) {
          addr.priv = MyWallet.encryptSecretWithSecondPassword(decryptedpk, second_password, MyWallet.getSharedKey());
        }
      }
    }

    for (var i in MyWallet.getAccounts()) {
      var account = MyWallet.getHDWallet().getAccount(i);

      var decryptedpk;
      if(second_password == null) {
        decryptedpk = account.extendedPrivateKey;
      } else {
        decryptedpk = MyWallet.decryptSecretWithSecondPassword(account.extendedPrivateKey, second_password, sharedKey);
      }

      try {
        var hdWalletAccount = new HDAccount();
        hdWalletAccount.newNodeFromExtKey(decryptedpk);
      } catch (e) {
        throw 'Invalid extended private key';
      }
    }

    MyWallet.sendEvent("msg", {type: "success", message: 'wallet-success ' + 'Wallet verified.'});
  };

  this.changePassword = function(new_password, success, error) {
    password = new_password;
    MyWallet.backupWallet('update', function() {
      if (success)
        success();
    }, function() {
      if (error)
        error();
    });
  };

  /**
   * @param {string} inputedEmail user email
   * @param {string} inputedPassword user main password
   * @param {string} languageCode fiat currency code (e.g. USD)
   * @param {string} currencyCode language code (e.g. en)
   * @param {function(string, string, string)} success callback function with guid, sharedkey and password
   * @param {function(string)} error callback function with error message
   */
  this.createNewWallet = function(inputedEmail, inputedPassword, languageCode, currencyCode, success, error) {
    MyWalletSignup.generateNewWallet(inputedPassword, inputedEmail, function(createdGuid, createdSharedKey, createdPassword) {
      MyStore.clear();
      if (languageCode)
        MyWallet.setLanguage(languageCode);
      if (currencyCode)
        MyWallet.setLocalSymbolCode(currencyCode);

      sharedKey = createdSharedKey;

      success(createdGuid, createdSharedKey, createdPassword);
    }, function (e) {
      error(e);
    });
  };

  function nKeys(obj) {
    var size = 0, key;
    for (key in obj) {
      size++;
    }
    return size;
  };

  function walletIsFull() {
    if (nKeys(addresses) >= maxAddr) {
      MyWallet.sendEvent("msg", {type: "error", message: 'We currently support a maximum of '+maxAddr+' private keys, please remove some unused ones.'});
      return true;
    }

    return false;
  }

  /**
   * @param {string} addr Address
   * @param {string} priv base58 private key
   * @return {boolean} compressed
   */
  function internalAddKey(addr, priv) {
    var existing = addresses[addr];
    if (!existing || existing.length == 0) {
      addresses[addr] = {addr : addr, priv : priv, balance : null};
      return true;
    } else if (!existing.priv && priv) {
      existing.priv = priv;
      return true;
    }
    return false;
  }

  this.logout = function() {
    if (disable_logout)
      return;

    MyWallet.sendEvent('logging_out');

    if (guid == demo_guid) {
      window.location = BlockchainAPI.getRootURL() + 'wallet/logout';
    } else {
      $.ajax({
        type: "GET",
        timeout: 60000,
        url: BlockchainAPI.getRootURL() + 'wallet/logout',
        data : {format : 'plain', api_code : MyWallet.getAPICode()},
        success: function(data) {
          window.location.reload();
        },
        error : function() {
          window.location.reload();
        }
      });
    }
  };

  function parseMiniKey(miniKey) {
    var check = Bitcoin.crypto.sha256(miniKey + "?");

    if (check[0] !== 0x00) {
      throw 'Invalid mini key';
    }

    return Bitcoin.crypto.sha256(miniKey);
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

      var testBytes = Bitcoin.crypto.sha256(key + "?");

      if (testBytes[0] === 0x00 || testBytes[0] === 0x01)
        return 'mini';
    }

    return null;

    console.error('Unknown Key Format ' + key);
  };

  function buffertoByteArray(value) {
    return BigInteger.fromBuffer(value).toByteArray();
  }

  this.privateKeyStringToKey = function(value, format) {
    var key_bytes = null;

    if (format == 'base58') {
      key_bytes = buffertoByteArray(Browserify.Base58.decode(value));
    } else if (format == 'base64') {
      key_bytes = buffertoByteArray(new Buffer(value, 'base64'));
    } else if (format == 'hex') {
      key_bytes = buffertoByteArray(new Buffer(value, 'hex'));
    } else if (format == 'mini') {
      key_bytes = buffertoByteArray(parseMiniKey(value));
    } else if (format == 'sipa') {
      var tbytes = buffertoByteArray(Browserify.Base58.decode(value));
      tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
      tbytes.shift();
      key_bytes = tbytes.slice(0, tbytes.length - 4);

    } else if (format == 'compsipa') {
      var tbytes = buffertoByteArray(Browserify.Base58.decode(value));
      tbytes.shift(); //extra shift cuz BigInteger.fromBuffer prefixed extra 0 byte to array
      tbytes.shift();
      tbytes.pop();
      key_bytes = tbytes.slice(0, tbytes.length - 4);
    } else {
      throw 'Unsupported Key Format';
    }

    if (key_bytes.length != 32 && key_bytes.length != 33)
      throw 'Result not 32 or 33 bytes in length';

    return new ECKey(new BigInteger.fromByteArrayUnsigned(key_bytes), (format == 'compsipa'));
  };

};
