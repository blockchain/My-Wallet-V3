'use strict';

var assert = require('assert');

var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');
var Wallet = require('./blockchain-wallet');
var Helpers = require('./helpers');
var WalletNetwork = require('./wallet-network')

// Save the javascript wallet to the remote server
function insertWallet(guid, sharedKey, password, extra, successcallback, errorcallback, decryptWalletProgress) {
  assert(successcallback, "Success callback missing");
  assert(errorcallback, "Success callback missing");
  assert(guid, "GUID missing");
  assert(sharedKey, "Shared Key missing");

  try {
    // var data = MyWallet.makeCustomWalletJSON(null, guid, sharedKey);
    var data = JSON.stringify(MyWallet.wallet, null, 2);

    //Everything looks ok, Encrypt the JSON output
    var crypted = WalletCrypto.encryptWallet(data, password, MyWallet.wallet.defaultPbkdf2Iterations,  MyWallet.wallet.isUpgradedToHD ?  3.0 : 2.0);

    if (crypted.length == 0) {
      throw 'Error encrypting the JSON output';
    }

    decryptWalletProgress && decryptWalletProgress();

    //Now Decrypt the it again to double check for any possible corruption
    WalletCrypto.decryptWallet(
      crypted,
      password,
      function success() { // success callback for decryptWallet

        //SHA256 new_checksum verified by server in case of corruption during transit
        var new_checksum = WalletCrypto.sha256(crypted).toString('hex');

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
            errorcallback(e);
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

function generateNewWallet(password, email, firstAccountName, success, error, isHD, generateUUIDProgress, decryptWalletProgress) {
  isHD = Helpers.isBoolean(isHD) ? isHD : true;
  generateUUIDProgress && generateUUIDProgress();
  WalletNetwork.generateUUIDs(2).then(function(uuids) {
    var guid = uuids[0];
    var sharedKey = uuids[1];

    if (password.length > 255) {
      throw 'Passwords must be shorter than 256 characters';
    }

    //User reported this browser generated an invalid private key
    if(navigator.userAgent.match(/MeeGo/i)) {
      throw 'MeeGo browser currently not supported.';
    }

    if (guid.length != 36 || sharedKey.length != 36) {
      throw 'Error generating wallet identifier';
    }

    // Upgrade to HD immediately:

    var saveWallet = function() {
      insertWallet(guid, sharedKey, password, {email : email}, function(message){
        success(guid, sharedKey, password);
      }, function(e) {
        error(e);
      }, decryptWalletProgress);
    };

    Wallet.new(guid, sharedKey, firstAccountName, saveWallet, error, isHD);

  }).catch(error);
};

module.exports = {
  generateNewWallet: generateNewWallet
};
