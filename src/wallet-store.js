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

  /**
   * @return {Object} dictionary of available languages
   */
  this.getLanguages = function() {
    return languageCodeToLanguage;
  };

  

};