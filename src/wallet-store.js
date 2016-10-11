'use strict';

var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');

var WalletStore = (function () {
  var password; // Password
  var guid; // Wallet identifier
  var language = 'en';
  var pbkdf2Iterations = 5000; // pbkdf2_interations of the main password (to encrypt the full payload)
  var disableLogout = false;
  var realAuthType = 0; // The real two factor authentication. Even if there is a problem with the current one (for example error 2FA sending email).
  var encryptedWalletData; // Encrypted wallet data (Base64, AES 256)
  var payloadChecksum; // SHA256 hash of the current wallet.aes.json
  var isPolling = false;
  var isRestoringWallet = false;
  var counter = 0;
  var syncPubkeys = false;
  var isSynchronizedWithServer = true;
  var eventListeners = [];

  return {
    setPbkdf2Iterations: function (iterations) {
      pbkdf2Iterations = iterations;
      return;
    },
    getPbkdf2Iterations: function () {
      return pbkdf2Iterations;
    },
    getLanguage: function () {
      return language;
    },
    setLanguage: function (lan) {
      language = lan;
    },
    disableLogout: function () {
      disableLogout = true;
    },
    enableLogout: function () {
      disableLogout = false;
    },
    isLogoutDisabled: function () {
      return disableLogout;
    },
    setRealAuthType: function (number) {
      realAuthType = number;
    },
    get2FAType: function () {
      return realAuthType;
    },
    get2FATypeString: function () {
      var stringType = '';
      switch (realAuthType) {
        case 0: stringType = null; break;
        case 1: stringType = 'Yubikey'; break;
        case 2: stringType = 'Email'; break;
        case 3: stringType = 'Yubikey MtGox - Unsupported'; break;
        case 4: stringType = 'Google Auth'; break;
        case 5: stringType = 'SMS'; break;
        default: stringType = null; break;
      }
      return stringType;
    },
    getGuid: function () {
      return guid;
    },
    setGuid: function (stringValue) {
      guid = stringValue;
    },
    generatePayloadChecksum: function () {
      return WalletCrypto.sha256(encryptedWalletData).toString('hex');
    },
    setEncryptedWalletData: function (data) {
      if (!data || data.length === 0) {
        encryptedWalletData = null;
        payloadChecksum = null;
      } else {
        encryptedWalletData = data;
        payloadChecksum = this.generatePayloadChecksum();
      }
    },
    getEncryptedWalletData: function () {
      return encryptedWalletData;
    },
    getPayloadChecksum: function () {
      return payloadChecksum;
    },
    setPayloadChecksum: function (value) {
      payloadChecksum = value;
    },
    isPolling: function () {
      return isPolling;
    },
    setIsPolling: function (bool) {
      isPolling = bool;
    },
    isRestoringWallet: function () {
      return isRestoringWallet;
    },
    setRestoringWallet: function (bool) {
      isRestoringWallet = bool;
    },
    incrementCounter: function () {
      counter = counter + 1;
    },
    getCounter: function () {
      return counter;
    },
    setSyncPubKeys: function (bool) {
      syncPubkeys = bool;
    },
    isSyncPubKeys: function () {
      return syncPubkeys;
    },
    isSynchronizedWithServer: function () {
      return isSynchronizedWithServer;
    },
    setIsSynchronizedWithServer: function (bool) {
      isSynchronizedWithServer = bool;
    },
    addEventListener: function (func) {
      eventListeners.push(func);
    },
    sendEvent: function (eventName, obj) {
      for (var listener in eventListeners) {
        eventListeners[listener](eventName, obj);
      }
    },
    isCorrectMainPassword: function (candidate) {
      return password === candidate;
    },
    changePassword: function (newPassword, success, error) {
      password = newPassword;
      MyWallet.syncWallet(success, error);
    },
    unsafeSetPassword: function (newPassword) {
      password = newPassword;
    },
    getPassword: function () {
      return password;
    },
    getLogoutTime: function () {
      return MyWallet.wallet._logoutTime;
    },
    setLogoutTime: function (logoutTime) {
      MyWallet.wallet.logoutTime = logoutTime;
    }
  };
})();

module.exports = WalletStore;
