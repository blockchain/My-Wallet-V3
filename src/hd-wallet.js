'use strict';

var assert = require('assert');
var Buffer = require('buffer').Buffer;
var Bitcoin = require('bitcoinjs-lib');
var BIP39 = require('bip39');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');

var HDAccount = require('./hd-account');

// If second_password is not null we assume double encryption is set on the
// wallet.

function HDWallet(seedHex, bip39Password, second_password) {
  if (bip39Password == undefined || bip39Password == null) {
    bip39Password = "";
  }

  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");

  this.seedHex = seedHex === null || seedHex === undefined || seedHex === "" || second_password == null ? seedHex : WalletCrypto.encryptSecretWithSecondPassword(seedHex, second_password, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());
  this.bip39Password = bip39Password === "" || second_password == null ? bip39Password : WalletCrypto.encryptSecretWithSecondPassword(bip39Password, second_password, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());

  this.numTxFetched = 0;
  this.accountArray = [];
}

HDWallet.buildHDWallet = function(seedHexString, accountsArrayPayload, bip39Password, secondPassword, success, error) {
  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");
  console.log(accountsArrayPayload);
  var hdwallet = new HDWallet(seedHexString, bip39Password, secondPassword);

  for (var i = 0; i < accountsArrayPayload.length; i++) {
    var accountPayload = accountsArrayPayload[i];
    var hdaccount;

    // This is called when a wallet is loaded, not when it's initially created.
    // If second password is enabled then accountPayload.xpriv has already been
    // encrypted. We're keeping it in an encrypted state.

    // externalAccountPubKey was used in older dev. versions of the HD wallet
    // and does not occur "in the wild"
    if(accountPayload.cache === undefined || accountPayload.cache.externalAccountPubKey) {
      hdaccount = hdwallet.createAccountFromExtKey(accountPayload.label, accountPayload.xpriv, accountPayload.xpub);
      hdaccount.generateCache();
      hdwallet.accountArray.push(hdaccount);
      MyWallet.backupWalletDelayed();
    }
    else {
      hdaccount = hdwallet.createAccountFromExtKey(accountPayload.label, accountPayload.xpriv, accountPayload.xpub, accountPayload.cache);
      hdaccount.cache = accountPayload.cache;
      hdwallet.accountArray.push(hdaccount);
    }

    hdaccount.archived = accountPayload.archived;

    hdaccount.address_labels = accountPayload.address_labels ? accountPayload.address_labels : [];
  }

  success && success(hdwallet);
};

function recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback) {
  assert(secondPassword == null || secondPassword, "Second password must be null or set.");

  var accountIdx = 0;

  var continueLookingAheadAccount = true;
  var gotHistoryError = false;

  while(continueLookingAheadAccount) {
    var account = hdwallet.createAccount("Account " + accountIdx.toString(), secondPassword);

    var xpub = account.extendedPublicKey;

    MyWallet.get_history_with_addresses([xpub], function(obj) {
      if(obj.addresses[0].account_index == 0 && obj.addresses[0].change_index == 0) {
        continueLookingAheadAccount = false;
        hdwallet.accountArray.pop();
      }
      accountIdx += 1;
    }, function() {
      errorCallback && errorCallback();
      continueLookingAheadAccount = false;
      gotHistoryError = true;
    });
  }

  if(gotHistoryError) {
    return;
  }

  if (hdwallet.getAccountsCount() < 1) {
    hdwallet.createAccountWithSeedhex("Account 1", hdwallet.getSeedHexString(), hdwallet.getBip39Password(), secondPassword);
  }

  successCallback && successCallback(hdwallet);
};

HDWallet.recoverHDWalletFromSeedHex = function(seedHex, bip39Password, secondPassword, successCallback, errorCallback) {
  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");

  var hdwallet = new HDWallet(seedHex, bip39Password, secondPassword);
  recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback);
};

HDWallet.recoverHDWalletFromMnemonic = function(passphrase, bip39Password, secondPassword, successCallback, errorCallback) {
  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");

  var hdwallet = new HDWallet(BIP39.mnemonicToEntropy(passphrase), bip39Password, secondPassword);
  recoverHDWallet(hdwallet, secondPassword, successCallback, errorCallback);
};

HDWallet.prototype.getPassphraseString = function(seedHex) {
  return BIP39.entropyToMnemonic(seedHex);
};

HDWallet.prototype.setSeedHexString = function(seedHex) {
  this.seedHex = seedHex;
};

HDWallet.prototype.getSeedHexString = function(second_password) {
  if(this.seedHex == null || second_password == null) {
    return this.seedHex;
  } else {
    return WalletCrypto.decryptSecretWithSecondPassword(this.seedHex, second_password, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());
  }
};

HDWallet.prototype.getMasterHex = function(seedHex) {
  return BIP39.mnemonicToSeed(this.getPassphraseString(seedHex), this.bip39Password);
};

HDWallet.prototype.getBip39Password = function(second_password) {
  assert(typeof(this.bip39Password) === "string", "BIP 39 password must be set or an empty string");

  if(this.bip39Password === "" || second_password == null) {
    return this.bip39Password;
  } else {
    return WalletCrypto.decryptSecretWithSecondPassword(this.bip39Password, second_password, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());
  }
};

HDWallet.prototype.setBip39Password = function(bip39Password) {
  this.bip39Password = bip39Password;
};

HDWallet.prototype.getAccountsCount = function() {
  return this.accountArray.length;
};

HDWallet.prototype.getAccount = function(accountIdx) {
  var account = this.accountArray[accountIdx];
  return account;
};

HDWallet.prototype.replaceAccount = function(accountIdx, account) {
  this.accountArray[accountIdx] = account;
};

HDWallet.prototype.getAccounts = function() {
  return this.accountArray;
};

// This is called when a wallet is loaded, not when it's initially created.
// If second password is enabled then accountPayload.xpriv has already been
// encrypted. We're keeping it in an encrypted state.
HDWallet.prototype.createAccountFromExtKey = function(label, possiblyEncryptedExtendedPrivateKey, extendedPublicKey, cache) {
  var accountIdx = this.accountArray.length;
  var account = cache ?
        HDAccount.fromCache(cache, label, accountIdx) :
        HDAccount.fromExtKey(extendedPublicKey, label, accountIdx);
  account.extendedPrivateKey = possiblyEncryptedExtendedPrivateKey;
  account.extendedPublicKey = extendedPublicKey;

  return account;
};

HDWallet.prototype.createAccount = function(label, second_password) {
  var seedHex = this.getSeedHexString(second_password);
  var bip39Password = this.getBip39Password(second_password);

  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");

  var account = this.createAccountWithSeedhex(label, seedHex, bip39Password, second_password);

  return account;
};

HDWallet.prototype.createAccountWithSeedhex = function(label, seedHex, bip39Password, second_password) {
  assert(typeof(bip39Password) === "string", "BIP 39 password must be set or an empty string");

  var accountIdx = this.accountArray.length;

  var account = new HDAccount(label, accountIdx);

  /* BIP 44 defines the following 5 levels in BIP32 path:
   * m / purpose' / coin_type' / account' / change / address_index
   * Apostrophe in the path indicates that BIP32 hardened derivation is used.
   *
   * Purpose is a constant set to 44' following the BIP43 recommendation
   * Registered coin types: 0' for Bitcoin
   */
  var masterkey = Bitcoin.HDNode.fromSeedBuffer(this.getMasterHex(seedHex, bip39Password), account.network);
  var accountZero = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(accountIdx);

  account.receiveChain = accountZero.derive(0);
  account.changeChain = accountZero.derive(1);

  var extendedPrivateKey = accountZero.toBase58();
  var extendedPublicKey =  accountZero.neutered().toBase58();

  account.extendedPrivateKey = extendedPrivateKey == null || second_password == null ? extendedPrivateKey : WalletCrypto.encryptSecretWithSecondPassword(extendedPrivateKey, second_password, WalletStore.getSharedKey(), WalletStore.getPbkdf2Iterations());
  account.extendedPublicKey = extendedPublicKey;

  account.generateCache();

  this.accountArray.push(account);

  return account;
};

module.exports = HDWallet;
