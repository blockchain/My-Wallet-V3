'use strict';

var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');

var WalletStore = (function() {
  var password; //Password
  var guid; //Wallet identifier
  var language = 'en';
  var pbkdf2_iterations = 5000; // pbkdf2_interations of the main password (to encrypt the full payload)
  var disable_logout = false;
  var real_auth_type = 0; //The real two factor authentication. Even if there is a problem with the current one (for example error 2FA sending email).
  var encrypted_wallet_data; //Encrypted wallet data (Base64, AES 256)
  var payload_checksum; //SHA256 hash of the current wallet.aes.json
  var isPolling = false;
  var isRestoringWallet = false;
  var counter = 0;
  var logout_timeout; //setTimeout return value for the automatic logout
  var logout_ticker;
  var sync_pubkeys = false;
  var isSynchronizedWithServer = true;
  var event_listeners = []; //Emits Did decrypt wallet event (used on claim page)

  ////////////////////////////////////////////////////////////////////////////
  return {
    setPbkdf2Iterations: function(iterations) {
      pbkdf2_iterations = iterations;
      return;
    },
    getPbkdf2Iterations: function() {
      return pbkdf2_iterations;
    },
    getLanguage: function() {
      return language;
    },
    setLanguage: function(lan) {
      language = lan;
    },
    disableLogout: function() {
      disable_logout = true;
    },
    enableLogout: function() {
      disable_logout = false;
    },
    isLogoutDisabled: function() {
      return disable_logout;
    },
    setRealAuthType: function(number) {
      real_auth_type = number;
    },
    get2FAType: function() {
      return real_auth_type;
    },
    get2FATypeString: function() {
      var stringType = "";
      switch(real_auth_type){
      case 0: stringType = null; break;
      case 1: stringType = "Yubikey"; break;
      case 2: stringType = "Email"; break;
      case 3: stringType = "Yubikey MtGox - Unsupported"; break;
      case 4: stringType = "Google Auth"; break;
      case 5: stringType = "SMS"; break;
      default: stringType = null; break;
      }
      return stringType;
    },
    getGuid: function() {
      return guid;
    },
    setGuid: function(stringValue) {
      guid = stringValue;
    },
    generatePayloadChecksum: function() {
      return WalletCrypto.sha256(encrypted_wallet_data).toString('hex');
    },
    setEncryptedWalletData: function(data) {
      if (!data || data.length == 0) {
        encrypted_wallet_data = null;
        payload_checksum = null;
      }
      else {
        encrypted_wallet_data = data;
        payload_checksum = this.generatePayloadChecksum();
      }
    },
    getEncryptedWalletData: function() {
      return encrypted_wallet_data;
    },
    getPayloadChecksum: function() {
      return payload_checksum;
    },
    setPayloadChecksum: function(value) {
      payload_checksum = value;
    },
    isPolling: function () {
      return isPolling;
    },
    setIsPolling: function (bool) {
      isPolling = bool;
    },
    isRestoringWallet: function() {
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
    getLogoutTimeout: function () {
      return logout_timeout;
    },
    setLogoutTimeout: function (value) {
      if (!logout_ticker) {
        logout_ticker = setInterval(function () {
          if (Date.now() > logout_timeout) {
            clearInterval(logout_ticker);
            MyWallet.logout();
          }
        }, 20000);
      }
      logout_timeout = value;
    },
    setSyncPubKeys: function (bool){
      sync_pubkeys = bool;
    },
    isSyncPubKeys: function (){
      return sync_pubkeys;
    },
    isSynchronizedWithServer: function (){
      return isSynchronizedWithServer;
    },
    setIsSynchronizedWithServer: function (bool){
      isSynchronizedWithServer = bool;
    },
    addEventListener: function(func){
      event_listeners.push(func);
    },
    sendEvent: function(event_name, obj){
      for (var listener in event_listeners) {
        event_listeners[listener](event_name, obj);
      }
    },
    isCorrectMainPassword: function(candidate){
      return password === candidate;
    },
    changePassword: function(new_password, success, error){
      password = new_password;
      MyWallet.syncWallet(success, error);
    },
    unsafeSetPassword: function(newPassword){
      password = newPassword;
    },
    getPassword: function(){
      return password;
    },
    getLogoutTime: function() {
      return MyWallet.wallet._logout_time;
    },
    setLogoutTime: function(logout_time) {
      MyWallet.wallet.logoutTime = logout_time;
      this.resetLogoutTimeout();
    },
    resetLogoutTimeout: function() {
      this.setLogoutTimeout(Date.now() + this.getLogoutTime());
    }
  };
})();

module.exports = WalletStore;
