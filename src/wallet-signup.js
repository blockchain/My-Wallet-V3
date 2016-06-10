'use strict';

var assert = require('assert');

var Wallet = require('./blockchain-wallet');
var WalletNetwork = require('./wallet-network');

function generateNewWallet (password, email, mnemonic, bip39Password, firstAccountName, success, error, generateUUIDProgress, decryptWalletProgress) {
  assert(password.length <= 255, 'Passwords must be shorter than 256 characters');
  assert(!navigator.userAgent.match(/MeeGo/i), 'MeeGo browser currently not supported.'); // User reported this browser generated an invalid private key

  generateUUIDProgress && generateUUIDProgress();

  WalletNetwork.generateUUIDs(2).then(function (uuids) {
    var guid = uuids[0];
    var sharedKey = uuids[1];

    if (guid.length !== 36 || sharedKey.length !== 36) {
      error('Error generating wallet identifier');
    }

    Wallet.new(guid, sharedKey, mnemonic, bip39Password, firstAccountName, success, error);
  }).catch(error);
}

module.exports = {
  generateNewWallet: generateNewWallet
};
