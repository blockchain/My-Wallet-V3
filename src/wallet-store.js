'use strict';

var CryptoJS = require('crypto-js');
var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');
var BIP39 = require('bip39');
var hasProp = {}.hasOwnProperty;

var WalletStore = (function() {

  var languageCodeToLanguage = {
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
    'vi': 'Vietnamese',
    'th': 'Thai',
    'ja': 'Japanese',
    'pl': 'Polish',
    'da': 'Danish',
    'ro': 'Romanian',
    'nl': 'Dutch',
    'tr': 'Turkish'
  };
  var currencyCodeToCurrency = {
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
  var password; //Password
  var encryptedPassword; //Password encrypted using the HD seed
  var guid; //Wallet identifier
  var language = 'en';
  var transactions = [];
  var pbkdf2_iterations = 5000; // pbkdf2_interations of the main password (to encrypt the full payload)
  var disable_logout = false;
  var mixer_fee = 0.5;
  var latest_block = null;
  var api_code = "0";
  var real_auth_type = 0; //The real two factor authentication. Even if there is a problem with the current one (for example error 2FA sending email).
  var encrypted_wallet_data; //Encrypted wallet data (Base64, AES 256)
  var payload_checksum; //SHA256 hash of the current wallet.aes.json
  var sharedcoin_endpoint; //The URL to the sharedcoin node
  var sharedKey; //Shared key used to prove that the wallet has succesfully been decrypted, meaning you can't overwrite a wallet backup even if you have the guid
  var isPolling = false;
  var isRestoringWallet = false;
  var counter = 0;
  var logout_timeout; //setTimeout return value for the automatic logout
  var logout_ticker;
  var sync_pubkeys = false;
  var isSynchronizedWithServer = true;
  var haveSetServerTime = false; //Whether or not we have synced with server time
  var serverTimeOffset = 0; //Difference between server and client time
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
    getLanguages: function() {
      return languageCodeToLanguage;
    },
    getCurrencies: function() {
      return currencyCodeToCurrency;
    },
    getTransactions: function() {
      return transactions;
    },
    pushTransaction: function(tx) {
      transactions.push(tx);
    },
    getAllTransactions: function() {
      return transactions.map(MyWallet.processTransaction);
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
    getLatestBlock: function() {
      return latest_block;
    },
    setLatestBlock: function(block) {
      var i, len, ref, tx;
      if (block != null) {
        latest_block = block;
        ref = this.getTransactions();
        for (i = 0, len = ref.length; i < len; i++) {
          tx = ref[i];
          tx.setConfirmations(MyWallet.getConfirmationsForTx(latest_block, tx));
        }
        this.sendEvent('did_set_latest_block');
      }
    },
    setAPICode: function(stringInt) {
      api_code = stringInt;
    },
    getAPICode: function() {
      return api_code;
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
      return CryptoJS.SHA256(encrypted_wallet_data).toString();
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
    isHaveSetServerTime: function (){
      return haveSetServerTime;
    },
    setHaveSetServerTime: function (){
      haveSetServerTime = true;
    },
    getServerTimeOffset: function (){
      return serverTimeOffset;
    },
    setServerTimeOffset: function (offset){
      serverTimeOffset = offset;
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

      this.updateEncryptedPasswordIfNeeded(password);

      MyWallet.syncWallet(success, error);
    },
    updateEncryptedPasswordIfNeeded: function(password) {
      // Todo: support encrypting password with seed is 2nd password is enabled
      if(MyWallet.wallet.isUpgradedToHD && !MyWallet.wallet.isDoubleEncrypted && WalletStore.getEncryptedPassword() != undefined && WalletStore.getEncryptedPassword() != null) {
        var seed = BIP39.mnemonicToSeedHex(BIP39.entropyToMnemonic(MyWallet.wallet.hdwallet.seedHex));
        var encryptedPwd = WalletCrypto.encryptPasswordWithSeed(password, seed, WalletStore.getPbkdf2Iterations());
        WalletStore.setEncryptedPassword(encryptedPwd);
      }
    },
    unsafeSetPassword: function(newPassword){
      password = newPassword;
    },
    getPassword: function(){
      return password;
    },
    getEncryptedPassword: function(){
      return encryptedPassword;
    },
    setEncryptedPassword:  function(value){
      encryptedPassword = value;
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
