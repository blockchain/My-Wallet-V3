@WalletStore = do ->

  languageCodeToLanguage = 
    'de': 'German'
    'hi': 'Hindi'
    'no': 'Norwegian'
    'ru': 'Russian'
    'pt': 'Portuguese'
    'bg': 'Bulgarian'
    'fr': 'French'
    'zh-cn': 'Chinese Simplified'
    'hu': 'Hungarian'
    'sl': 'Slovenian'
    'id': 'Indonesian'
    'sv': 'Swedish'
    'ko': 'Korean'
    'el': 'Greek'
    'en': 'English'
    'it': 'Italiano'
    'es': 'Spanish'
    'vi': 'Vietnam'
    'th': 'Thai'
    'ja': 'Japanese'
    'pl': 'Polski'
    'da': 'Danish'
    'ro': 'Romanian'
    'nl': 'Dutch'
    'tr': 'Turkish'

  currencyCodeToCurrency = 
    'ISK': 'lcelandic Króna'
    'HKD': 'Hong Kong Dollar'
    'TWD': 'New Taiwan Dollar'
    'CHF': 'Swiss Franc'
    'EUR': 'Euro'
    'DKK': 'Danish Krone'
    'CLP': 'Chilean, Peso'
    'USD': 'U.S. Dollar'
    'CAD': 'Canadian Dollar'
    'CNY': 'Chinese Yuan'
    'THB': 'Thai Baht'
    'AUD': 'Australian Dollar'
    'SGD': 'Singapore Dollar'
    'KRW': 'South Korean Won'
    'JPY': 'Japanese Yen'
    'PLN': 'Polish Zloty'
    'GBP': 'Great British Pound'
    'SEK': 'Swedish Krona'
    'NZD': 'New Zealand Dollar'
    'BRL': 'Brazil Real'
    'RUB': 'Russian Ruble'

  mnemonicVerified = false
  xpubs = []
  transactions = [] #List of all transactions (initially populated from /multiaddr updated through websockets)
  didUpgradeToHd = null
  #////////////////////////////////////////////////////////////////////////////

  getLanguages: () ->
    languageCodeToLanguage

  getCurrencies: () ->
    currencyCodeToCurrency

  didVerifyMnemonic: () ->
    mnemonicVerified = true
    MyWallet.backupWalletDelayed()
    return

  setMnemonicVerified: (bool) ->
    mnemonicVerified = bool
    return

  isMnemonicVerified: ->
    mnemonicVerified

  setEmptyXpubs: ->
    xpubs = []
    return

  pushXpub: (xpub) ->
    xpubs.push xpub
    return

  getXpubs: ->
    xpubs

  getTransactions: ->
    transactions

  getAllTransactions: ->
    filteredTransactions = []
    rawTxs = WalletStore.getTransactions()
    for i of rawTxs
      transaction = MyWallet.processTransaction(rawTxs[i])
      filteredTransactions.push transaction
    filteredTransactions

  # this.pushTransaction = function(tx) {
  #   transactions.push(tx);
  # };

  didUpgradeToHd: ->
    didUpgradeToHd

  setDidUpgradeToHd: (bool) ->
    didUpgradeToHd = bool
    return
