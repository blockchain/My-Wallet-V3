'use strict';

var assert = require('assert');

var Wallet = require('./blockchain-wallet');
var Helpers = require('./helpers');
var WalletNetwork = require('./wallet-network');

function generateNewWallet(password, email, firstAccountName, success, error, isHD, generateUUIDProgress, decryptWalletProgress) {
  assert(password.length <= 255, 'Passwords must be shorter than 256 characters');
  assert(!navigator.userAgent.match(/MeeGo/i), 'MeeGo browser currently not supported.'); //User reported this browser generated an invalid private key

  isHD = Helpers.isBoolean(isHD) ? isHD : true;

  generateUUIDProgress && generateUUIDProgress();

  WalletNetwork.generateUUIDs(2).then(function(uuids) {
    var guid = uuids[0];
    var sharedKey = uuids[1];

    if (guid.length != 36 || sharedKey.length != 36) {
      error('Error generating wallet identifier');
    }

    // Upgrade to HD immediately:
    var saveWallet = function() {
      WalletNetwork.insertWallet(guid, sharedKey, password, {email : email}, decryptWalletProgress).then(function() {
        success(guid, sharedKey, password);
      }, function(e) {
        error(e);
      });
    };

    Wallet.new(guid, sharedKey, firstAccountName, saveWallet, error, isHD);

  }).catch(error);
}

module.exports = {
  generateNewWallet: generateNewWallet
};
