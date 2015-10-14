'use strict';

var assert = require('assert');
var CryptoJS = require('crypto-js');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var API = require('./api');
var Wallet = require('./blockchain-wallet');
var Helpers = require('./helpers');
var BIP39 = require('bip39');

// Save the javascript wallet to the remote server
function insertWallet(guid, sharedKey, password, extra, successcallback, errorcallback) {
  assert(successcallback, "Success callback missing");
  assert(errorcallback, "Success callback missing");
  assert(guid, "GUID missing");
  assert(sharedKey, "Shared Key missing");

  try {
    // var data = MyWallet.makeCustomWalletJSON(null, guid, sharedKey);
    var data = JSON.stringify(MyWallet.wallet, null, 2);

    //Everything looks ok, Encrypt the JSON output
    var crypted = WalletCrypto.encryptWallet(data, password, MyWallet.wallet.defaultPbkdf2Iterations,  MyWallet.wallet.isUpgradedToHD ?  3.0 : 2.0, WalletStore.getEncryptedPassword());

    if (crypted.length == 0) {
      throw 'Error encrypting the JSON output';
    }

    //Now Decrypt the it again to double check for any possible corruption
    WalletCrypto.decryptWallet(
      crypted,
      password,
      function success() { // success callback for decryptWallet

        //SHA256 new_checksum verified by server in case of corruption during transit
        var new_checksum = CryptoJS.SHA256(crypted, {asBytes: true}).toString();

        extra = extra || '';

        var post_data = {
          length: crypted.length,
          payload: crypted,
          checksum: new_checksum,
          method : 'insert',
          format : 'plain',
          sharedKey : sharedKey,
          guid : guid
        };

        Helpers.merge(post_data, extra);
        MyWallet.securePost(
          'wallet',
          post_data,
          function(data) {
            successcallback(data);
          },
          function(e) {
            errorcallback(e.responseText);
          }
        );

      },
      function error() { // error callback for decryptWallet
        throw("Decrypting wallet failed");
      }
    );
  } catch (e) {
    errorcallback(e);
  }
}

function generateNewWallet(password, email, firstAccountName, success, error) {
  var mnemonic = BIP39.generateMnemonic();
  var seed = BIP39.mnemonicToSeedHex(mnemonic);

  assert(seed != undefined && seed != null && seed != "", "HD seed required");

  var xpub = WalletCrypto.seedToMetaDataXpub(seed);

  if (password.length > 255) {
    throw 'Passwords must be shorter than 256 characters';
  }

  //User reported this browser generated an invalid private key
  if(navigator.userAgent.match(/MeeGo/i)) {
    throw 'MeeGo browser currently not supported.';
  }

  var outerThis = this;

  var saveWallet = function(wallet) {
    outerThis.insertWallet(wallet.guid, wallet.sharedKey, password, {email : email}, function(message){
      success(seed, wallet.guid, wallet.sharedKey, password);
    }, function(e) {
      error(e);
    });
  }

  // MyWallet.wallet.defaultPbkdf2Iterations is not available, hard coding 5000 for now:
  var encryptedPassword = WalletCrypto.encryptPasswordWithSeed(password, seed, 5000);

  WalletStore.setEncryptedPassword(encryptedPassword);
  Wallet.new(
    mnemonic,
    xpub,
    firstAccountName,
    saveWallet,
    true
  );
};

module.exports = {
  generateNewWallet: generateNewWallet,
  insertWallet: insertWallet // Exported for tests
};
