var WalletStore = new function() {

  var languageCodeToLanguage = {
    "de": "German",
    "hi": "Hindi",
    "no": "Norwegian",
    "ru": "Russian",
    "pt": "Portuguese",
    "bg": "Bulgarian",
    "fr": "French",
    "zh-cn": "Chinese Simplified",
    "hu": "Hungarian",
    "sl": "Slovenian",
    "id": "Indonesian",
    "sv": "Swedish",
    "ko": "Korean",
    "el": "Greek",
    "en": "English",
    "it": "Italiano",
    "es": "Spanish",
    "vi": "Vietnam",
    "th": "Thai",
    "ja": "Japanese",
    "pl": "Polski",
    "da": "Danish",
    "ro": "Romanian",
    "nl": "Dutch",
    "tr": "Turkish"
  };

  var currencyCodeToCurrency = {
    "ISK" : "lcelandic Króna",
    "HKD" : "Hong Kong Dollar",
    "TWD" : "New Taiwan Dollar",
    "CHF" : "Swiss Franc",
    "EUR" : "Euro",
    "DKK" : "Danish Krone",
    "CLP" : "Chilean, Peso",
    "USD" : "U.S. Dollar",
    "CAD" : "Canadian Dollar",
    "CNY" : "Chinese Yuan",
    "THB" : "Thai Baht",
    "AUD" : "Australian Dollar",
    "SGD" : "Singapore Dollar",
    "KRW" : "South Korean Won",
    "JPY" : "Japanese Yen",
    "PLN" : "Polish Zloty",
    "GBP" : "Great British Pound",
    "SEK" : "Swedish Krona",
    "NZD" : "New Zealand Dollar",
    "BRL" : "Brazil Real",
    "RUB" : "Russian Ruble"
  };

  var mnemonicVerified = false;
  var xpubs = [];

  this.getLanguages = function() {
    return languageCodeToLanguage;
  };

  this.getCurrencies = function() {
    return currencyCodeToCurrency;
  };

  this.didVerifyMnemonic = function() {
    mnemonicVerified = true;
    MyWallet.backupWalletDelayed();
  };

  this.setMnemonicVerified = function(bool) {
    mnemonicVerified = bool;
  };

  this.isMnemonicVerified = function() {
    return mnemonicVerified;
  };

  this.setEmptyXpubs = function() {
    xpubs = [];
  };

  this.pushXpub = function(xpub) {
    xpubs.push(xpub);
  };
  
  this.getXpubs = function() {
    return xpubs;
  };

};