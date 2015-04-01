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
  transactions = [] # List of all transactions (initially populated from /multiaddr updated through websockets)
  addresses = {}    # {addr : address, priv : private key, tag : tag (mark as archived), label : label, balance : balance}
  didUpgradeToHd = null
  address_book = {} #Holds the address book addr = label
  #////////////////////////////////////////////////////////////////////////////

  getLanguages: () -> languageCodeToLanguage

  getCurrencies: () -> currencyCodeToCurrency

  didVerifyMnemonic: () ->
    mnemonicVerified = true
    MyWallet.backupWalletDelayed()
    return

  setMnemonicVerified: (bool) ->
    mnemonicVerified = bool
    return

  isMnemonicVerified: () -> mnemonicVerified

  setEmptyXpubs: () ->
    xpubs = []
    return

  pushXpub: (xpub) ->
    xpubs.push xpub
    return

  getXpubs: () -> xpubs

  getTransactions: () -> transactions

  getAllTransactions: () ->
    (MyWallet.processTransaction tx for tx in WalletStore.getTransactions())

  didUpgradeToHd: () -> didUpgradeToHd

  setDidUpgradeToHd: (bool) ->
    didUpgradeToHd = bool
    return

  getAddressBook: () -> address_book

  getAddressBookLabel: (address) -> address_book[address]

  deleteAddressBook: (addr) ->
    delete address_book[addr]
    MyWallet.backupWalletDelayed()
    return

  addAddressBookEntry: (addr, label) ->
    isValidLabel = MyWallet.isAlphaNumericSpace(label) and MyWallet.isValidAddress(addr)
    address_book[addr] = label if isValidLabel
    return isValidLabel

  newAddressBookFromJSON: (addressBook) ->
    address_book = {}
    @addAddressBookEntry(entry.addr, entry.label) for entry in addressBook if addressBook? 
    return

####################################### TO CHECK CALLS

  # this getter should disapear once we fix the interaction with addresses in mywallet.js
  getAddresses: () -> addresses
  getAddress: (address) -> if (address of addresses) then addresses[address] else null

  legacyAddressExists: (address) -> address of addresses

  # not used
  getLegacyAddressTag: (address) -> 
    if (address of addresses) then addresses[address].tag else null

  setLegacyAddressTag: (address, tag) -> 
    addresses[address].tag = tag
    return

  getLegacyAddressLabel: (address) ->
    if (address of addresses) then addresses[address].label else null

  setLegacyAddressBalance: (address, balance) ->
    addresses[address].balance = balance
    return

  isActiveLegacyAddress: (address) ->
    (address of addresses) and (addresses[address].tag isnt 2)

  isWatchOnlyLegacyAddress: (address) ->
    (address of addresses) and not addresses[address].priv?

  getLegacyAddressBalance: (address) ->
    if (address of addresses) then addresses[address].balance else null

  getTotalBalanceForActiveLegacyAddresses: () ->
    (a.balance for own a of addresses when a.tag isnt 2).reduce ((x, y) -> x + y), 0
    # var totalBalance = 0;
    # for (var key in addresses) {
    #   var addr = addresses[key];
    #   if (addr.tag != 2)
    #     totalBalance += addr.balance;
    # }
    # return totalBalance;

  deleteLegacyAddress: (address) ->
    delete addresses[address]
    MyWallet.backupWalletDelayed()
    return

  getPrivateKey: (address) ->
    if (address of addresses) then addresses[address].priv else null


  setLegacyAddressLabel: (address, label, success, error) ->
    if (label.length > 0 and not MyWallet.isAlphaNumericSpace(label))
      error and error()
    else
      addresses[address].label = label
      MyWallet.backupWalletDelayed()
      success and success()


  unArchiveLegacyAddr: (address) ->
    addr = addresses[address]
    if (addr.tag is 2)
      addr.tag = null
      MyWallet.backupWalletDelayed('update', () -> MyWallet.get_history())
    else
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Unarchive This Address'})
    
  archiveLegacyAddr: (address) -> 
    addr = addresses[address];
    if (addr.tag == null || addr.tag == 0)
      addr.tag = 2
      MyWallet.backupWalletDelayed('update', () -> MyWallet.get_history())
    else
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Archive This Address'})

  
  # @return {Array} get all legacy addresses
  # this functions is weird :) 
  getAllLegacyAddresses: () ->
    array = []
    for key of addresses
      array.push key
    return array


  # this.getPreferredLegacyAddress = function() {
  #   var preferred = null;
  #   for (var key in addresses) {
  #     var addr = addresses[key];

  #     if (preferred == null)
  #       preferred = addr;

  #     if (addr.priv != null) {
  #       if (preferred == null)
  #         preferred = addr;

  #       if (addr.tag == null || addr.tag == 0) {
  #         preferred = addr;
  #         break;
  #       }
  #     }
  #   }

  #   return preferred.addr;
  # };
  ###*
  # Find the preferred address to use for change
  # Order deposit / request coins
  # return {string} preferred address
  ###
  getPreferredLegacyAddress: () ->
    preferred = null
    for key of addresses
      addr = addresses[key]
      if preferred == null
        preferred = addr
      if addr.priv != null
        if preferred == null
          preferred = addr
        if addr.tag == null or addr.tag == 0
          preferred = addr
          break
    preferred.addr

  # @return {boolean} has legacy addresses  
  # not use
  hasLegacyAddresses: () ->
    Object.keys(addresses).length != 0

  ###*
  # return {Array} legacy active addresses
  ###

  getLegacyActiveAddresses: () ->
    array = []
    for key of addresses
      addr = addresses[key]
      #Don't include archived addresses
      if addr.tag != 2
        array.push addr.addr
    return array

  ###*
  # return {Array} archived addresses
  ###
  # not used
  getLegacyArchivedAddresses: () ->
    array = []
    for key of addresses
      addr = addresses[key]
      #Don't include archived addresses
      if addr.tag == 2
        array.push addr.addr
    return array


