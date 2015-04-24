var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');


// Example usage. Try it with and without a second password ("1234") configured:

// Spender(null, function(){console.log("success")}, function(){console.log("fail")},null,function(){ console.log("Second password magic") }).prepareFromAccount(0, 20000, 10000, function(fromAccount) { fromAccount.toAddress("1FeerpCgswvGRLVKme759C96DUBtf7SvA2") })

// Spender(20000, 10000, null, function(){console.log("success")}, function(){console.log("fail")},null,function(tryPassword){setTimeout(function() { tryPassword("1234", function(){console.log("Correct password")})}, 500)}).prepareFromAddress("15GXwZHPLZmFMfZ4qcSP9TjWBQ9HaKJVxU", 20000, 10000, function(from) { from.toAddress("1FeerpCgswvGRLVKme759C96DUBtf7SvA2") })

// Spender(null, function(){console.log("success")}, function(){console.log("fail")},null,function(){}).prepareAddressSweep("15GXwZHPLZmFMfZ4qcSP9TjWBQ9HaKJVxU", function(from) { from.toAccount(0) })


  /**
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */

var Spender = function(note, successCallback, errorCallback, listener, getSecondPassword) {
  assert(successCallback, "success callback required");
  assert(errorCallback, "error callback required");
  
  if(typeof(listener) == "undefined" || listener == null) {
    listener = {};
  }
  
  assert(getSecondPassword, "second password callback required");

  var sharedKey = WalletStore.getSharedKey();
  var pbkdf2_iterations = WalletStore.getPbkdf2Iterations();
  
  var secondPassword = null;
    
  var obtainAccessToPrivateKeys = function(proceed) {
    if (!WalletStore.getDoubleEncryption()) {
      proceed();
    } else {
      getSecondPassword(function(pw, correct_password, wrong_password) {
        if (MyWallet.validateSecondPassword(pw)) {
          secondPassword = pw;
          correct_password();
          proceed();
        } else {
          wrong_password();
        }
      });
    }
  };
  
  // if postSendCallback is present, this must call successCallback() itself
  var performTransaction = function(tx, keys, postSendCallback) {
    tx.addPrivateKeys(keys);

    var signedTransaction = tx.sign();

    
    // TODO: reuse this for all send functions
    BlockchainAPI.push_tx(
      signedTransaction,
      note,
      function(tx_hash) { 
        if(typeof(postSendCallback) == "undefined") {
          successCallback(signedTransaction.getId()); 
        } else {
          postSendCallback(signedTransaction);
        }
      },
      function(e) { errorCallback(e);}
    );
  };
  
  var spendTo = function(spendFrom) {    
    var spendOptions = {
      /**
       * @param {number} toAddress to address
       * @param {function} if present, this function must call successCallback() itself
       */
      toAddress: function(toAddress, postSendCallback) {
        assert(toAddress, "to address required");
        spendFrom(toAddress, postSendCallback);
      },
      /**  
       * @param {number} toIndex index of account
       */
      toAccount: function(toIndex) {
        assert(typeof(toIndex) != "undefined", "to account index required");
        var toAccount = WalletStore.getHDWallet().getAccount(toIndex);
        spendFrom(toAccount.getReceiveAddress());
      },
      /**  
       * @param {string} email address
       */
      toEmail: function(email) {
        var key = MyWallet.generateNewKey();
        var address = key.pub.getAddress().toString();
        var privateKey = key.toWIF();

        WalletStore.setLegacyAddressTag(address, 2);

        WalletStore.setLegacyAddressLabel(
          address, 
          email + ' Sent Via Email', 
          function() {
            MyWallet.backupWallet('update', function() {
              spendOptions.toAddress(address, function(tx){
                BlockchainAPI.sendViaEmail(
                  email, 
                  tx, 
                  privateKey, 
                  function (data) {
                    WalletStore.setPaidToElement(tx.getId(), {email:email, mobile: null, redeemedAt: null, address: address});

                    MyWallet.backupWallet('update', function() {
                      successCallback(tx.getId());
                    });
                  },
                  function() { errorCallback(); }
                ); // sendViaEmail()
              }); // pushTx()
            });
          }, 
          function() { console.log('Unexpected error'); }
        );
      },
      /**  
       * @param {string} mobile number in int. format, e.g. "+1123555123"
       */
      toMobile: function(mobile) {
        if (mobile.charAt(0) == '0')
          mobile = mobile.substring(1);

        if (mobile.charAt(0) != '+')
          mobile = '+' + mobile;
        //mobile = '+' + child.find('select[name="sms-country-code"]').val() + mobile;
        var miniKeyAddrobj = MyWallet.generateNewMiniPrivateKey();
        var address = MyWallet.getCompressedAddressString(miniKeyAddrobj.key);

        WalletStore.setLegacyAddressTag(address, 2);
        WalletStore.setLegacyAddressLabel(
          address, 
          mobile + ' Sent Via SMS',
          function() {
            MyWallet.backupWallet('update', function() {
              spendOptions.toAddress(address, function(tx){
                BlockchainAPI.sendViaSMS(
                  mobile, 
                  tx, 
                  miniKeyAddrobj.miniKey, 
                  function (data) {
                    WalletStore.setPaidToElement(tx.getId(), {email:null, mobile: mobile, redeemedAt: null, address: address});

                    MyWallet.backupWallet('update', function() {
                      successCallback();
                    });
                  },
                  function() { errorCallback(); }
                ); // sendViaSMS()
              }); // pushTX()
            });
          },
          function() { console.log('Unexpected error'); }
        );
      }
    };
    
    return spendOptions;
  };

  var prepareFrom = {
    /**
     * @param {number} amount send amount in satoshis
     * @param {?number} feeAmount fee amount in satoshis
     * @param {string} fromAddress from address
     */
    prepareFromAddress: function(fromAddress, amount, feeAmount, proceed) {
      assert(amount, "amount required");
      assert(feeAmount, "fee required");
      
      var fromAddresses  = fromAddress ? [fromAddress] : WalletStore.getLegacyActiveAddresses();
      var changeAddress = fromAddress || WalletStore.getPreferredLegacyAddress();

      obtainAccessToPrivateKeys(function() {      
        var spendFromAddressToAddress = function(toAddress, postSendCallback) {
          MyWallet.getUnspentOutputsForAddresses(
            fromAddresses,
            function (unspent_outputs) {
              var tx = new Transaction(unspent_outputs, toAddress, amount, feeAmount, changeAddress, listener);
        
              var keys = tx.addressesOfNeededPrivateKeys.map(function (neededPrivateKeyAddress) {
                var privateKeyBase58 = secondPassword === null ? WalletStore.getPrivateKey(neededPrivateKeyAddress) : WalletCrypto.decryptSecretWithSecondPassword(WalletStore.getPrivateKey(neededPrivateKeyAddress), secondPassword, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());
                // TODO If getPrivateKey returns null, it's a watch only address - ask for private key or show error or try again without watch only addresses
                var format = MyWallet.detectPrivateKeyFormat(privateKeyBase58);
                var key = MyWallet.privateKeyStringToKey(privateKeyBase58, format);

                // If the address we looked for is not the public key address of the private key we found, try the compressed address
                if (MyWallet.getCompressedAddressString(key) === neededPrivateKeyAddress) {
                  key = new Bitcoin.ECKey(key.d, true);
                }
                return key;
              });
                              
              performTransaction(tx, keys, postSendCallback);
            },
            function(e) { errorCallback && errorCallback(e);} // unspent outputs failed
          ); // getUnspentOutputsForAccount()
        };

        proceed( // Ready to receive destination info.
          spendTo(spendFromAddressToAddress)
        ); // end of proceed()

      }); // obtainAccessToPrivateKeys()   

    },
    
    /**
     * @param {string} fromAddress from address
     */
    prepareAddressSweep: function(fromAddress, proceed) {
      var feeAmount = MyWallet.getBaseFee();
      var amount = WalletStore.getLegacyAddressBalance(fromAddress) - feeAmount;
      
      prepareFrom.prepareFromAddress(fromAddress, amount, feeAmount, proceed);
    },
    
    /**  
     * @param {number} amount send amount in satoshis
     * @param {?number} feeAmount fee amount in satoshis
     * @param {number} fromIndex index of account
     */
    prepareFromAccount: function(fromIndex, amount, feeAmount, proceed) {
      assert(amount, "amount required");
      assert(feeAmount, "fee required");
      
      assert(typeof(fromIndex) != "undefined", "from account index required");
    
      var account = WalletStore.getHDWallet().getAccount(fromIndex);
      var changeAddress = account.getChangeAddress();

      obtainAccessToPrivateKeys(function() {
        var extendedPrivateKey = account.extendedPrivateKey == null || secondPassword == null ? account.extendedPrivateKey : WalletCrypto.decryptSecretWithSecondPassword(account.extendedPrivateKey, secondPassword, sharedKey, pbkdf2_iterations);
        // Create the send account (same account as current account, but created with xpriv and thus able to generate private keys)
        var sendAccount = HDAccount.fromExtKey(extendedPrivateKey);
      
        var spendFromAccountToAddress = function(address, postSendCallback) {
          // First check if the to address is not part of the from account:
          if(account.containsAddressInCache(address)) {
            errorCallback("Unable to move bitcoins within the same account.");
            return;
          }
          
          MyWallet.getUnspentOutputsForAccount(
            fromIndex,
            function (unspent_outputs) {
              var tx = new Transaction(unspent_outputs, address, amount, feeAmount, changeAddress, listener);
        
              var keys = tx.pathsOfNeededPrivateKeys.map(function (neededPrivateKeyPath) {
                return sendAccount.generateKeyFromPath(neededPrivateKeyPath).privKey;
              });
                
              performTransaction(tx, keys, postSendCallback);
            },
            function(e) { errorCallback && errorCallback(e);} // unspent outputs failed
          ); // getUnspentOutputsForAccount()
        };

        proceed( // Ready to receive destination info.
          spendTo(spendFromAccountToAddress)
        ); // end of proceed()

      }); // obtainAccessToPrivateKeys()        
    }
  };
  
  return prepareFrom;
};

module.exports = Spender;
