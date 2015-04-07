@WalletStore = do ->

  #////////////////////////////////////////////////////////////////////////////
  # Private variables

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

  language = 'en'; #Current language
  mnemonicVerified = false
  xpubs = []
  transactions = []  # List of all transactions (initially populated from /multiaddr updated through websockets)
  n_tx = 0           # Number of transactions
  addresses = {}     # {addr : address, priv : private key, tag : tag (mark as archived), label : label, balance : balance}
  maxAddr = 1000;    # Maximum number of addresses
  didUpgradeToHd = null
  address_book = {}  #Holds the address book addr = label
  pbkdf2_iterations = null
  final_balance = 0  # Final Satoshi wallet balance
  total_sent = 0     # Total Satoshi sent
  total_received = 0 # Total Satoshi received
  tx_notes = {}      # A map of transaction notes, hash -> note
  defaultAccountIdx = 0
  disable_logout = false
  mixer_fee = 0.5    # Default mixer fee 1.5%
  isAccountRecommendedFeesValid = true
  amountToRecommendedFee = {}
  latest_block = null      # Chain head block
  tx_tags = {};
  tag_names = [];

  #////////////////////////////////////////////////////////////////////////////
  # Private functions

  unsafeAddLegacyAddress = (key) ->
    if not key.addr? or not MyWallet.isAlphaNumericSpace(key.addr)
      MyWallet.sendEvent("msg", 
        {type: "error", message: 'Your wallet contains an invalid address. \
                                  This is a sign of possible corruption, please \
                                  double check all your BTC is accounted for. \
                                  Backup your wallet to remove this error.'});
    else
      key.tag   = null if key.tag is 1 or not MyWallet.isAlphaNumericSpace(key.tag)
      key.label = null if key.label? and not MyWallet.isAlphaNumericSpace(key.tag) 
      addresses[key.addr] = key


  #////////////////////////////////////////////////////////////////////////////
  # public methods
  setPbkdf2Iterations: (iterations) ->
    pbkdf2_iterations = iterations
  
  getPbkdf2Iterations: () ->
    pbkdf2_iterations

  getLanguage: () ->
    if language? then language else MyStore.get('language')

  setLanguage: (lan) ->
    MyStore.put('language', lan);
    language = lan;
    return

  walletIsFull: () -> (k for own k of addresses).length >= maxAddr

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

  pushTransaction: (tx) ->
    transactions.push tx
    return

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
    
  newLegacyAddressesFromJSON: (keysArray) ->
    unsafeAddLegacyAddress(key) for key in keysArray

  # this getter should disapear once we fix the interaction with addresses in mywallet.js
  getAddresses: () -> 
    return addresses
  
  getAddress: (address) -> 
    if (address of addresses) then addresses[address] else null

  getValueOfLegacyAddress: (address) -> 
    if (address of addresses) then parseInt(addresses[address].value) else 0

  addToBalanceOfLegacyAddress: (address, amount) ->
    addresses[address].balance += amount if (address of addresses)
    return

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
    (o.balance for own k,o of addresses when o.tag isnt 2)
      .reduce ((x, y) -> x + y), 0

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
      return
    else
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Unarchive This Address'})
      return
    
  archiveLegacyAddr: (address) -> 
    addr = addresses[address];
    if (!addr.tag? || addr.tag is 0)
      addr.tag = 2
      MyWallet.backupWalletDelayed('update', () -> MyWallet.get_history())
      return
    else
      MyWallet.sendEvent("msg", {type: "error", message: 'Cannot Archive This Address'})
      return

  getAllLegacyAddresses: () -> (k for own k of addresses)

  getPreferredLegacyAddress: () ->
    (k for own k,o of addresses when o.priv? and @isActiveLegacyAddress k)[0]

  # not use
  hasLegacyAddresses: () -> Object.keys(addresses).length isnt 0

  # return the list of strings of addresses
  # Don't include archived addresses
  getLegacyActiveAddresses: () ->
    (k for own k of addresses when @isActiveLegacyAddress k)

  # not used
  getLegacyArchivedAddresses: () ->
    (k for own k of addresses when not @isActiveLegacyAddress(k))

  mapToLegacyAddressesPrivateKeys: (f) ->
    o.priv = f(o.priv) for own k,o of addresses when o.priv?
    return

  tagLegacyAddressesAsSaved: () ->
    (delete o.tag) for own k,o of addresses when o.tag is 1
    return

  addLegacyAddress: (address, privKey) ->
    existing = addresses[address]
    if not existing? or existing.length is 0
      addresses[address] = {addr : address, priv : privKey, balance : null};
      return true
    else
      if not existing.priv? and privKey?
        existing.priv = privKey
        return true
      else
        return false

  getNTransactions: () -> n_tx

  setNTransactions: (numberOfTransactions) -> 
    n_tx = numberOfTransactions
    return

  incNTransactions: () -> 
    n_tx++
    return

  getFinalBalance: () -> final_balance

  setFinalBalance: (amount) -> 
    final_balance = amount
    return

  addToFinalBalance: (amount) ->
    final_balance += amount
    return

  getTotalSent: () -> total_sent

  setTotalSent: (amount) ->
    total_sent = amount
    return

  addToTotalSent: (amount) ->
    total_sent += amount
    return

  getTotalReceived: () -> total_received

  setTotalReceived: (amount) ->
    total_received = amount
    return

  addToTotalReceived: (amount) ->
    total_received += amount
    return

  getNote: (txHash) ->
    if (txHash of tx_notes) then tx_notes[txHash] else null

  deleteNote: (txHash) ->
    delete tx_notes[txHash]
    MyWallet.backupWalletDelayed()
    return

  setNote: (txHash, text) ->
    isValidNote = MyWallet.isAlphaNumericSpace(text) and text?
    if isValidNote
      tx_notes[txHash] = text
      MyWallet.backupWalletDelayed()
    return isValidNote

  getNotes: () -> tx_notes

  setDefaultAccountIndex: (accountIdx) ->
    if accountIdx? then defaultAccountIdx = accountIdx else defaultAccountIdx = 0 
    MyWallet.backupWalletDelayed();
    return

  getDefaultAccountIndex: () -> defaultAccountIdx

  disableLogout: (value) ->
    disable_logout = true;
    return

  isLogoutDisabled: () -> disable_logout

  getMixerFee: () -> mixer_fee

  setMixerFee: (fee) ->
    mixer_fee = fee if fee?
    return

  isAccountRecommendedFeesValid: () -> isAccountRecommendedFeesValid

  setIsAccountRecommendedFeesValid: (bool) ->
    isAccountRecommendedFeesValid = bool
    return

  getAmountToRecommendedFee: (amount) ->
    if (amount of amountToRecommendedFee) then amountToRecommendedFee[amount] else null

  setAmountToRecommendedFee: (amount, recFee) ->
    amountToRecommendedFee[amount] = recFee
    return

  getLatestBlock: () -> latest_block

  setLatestBlock: (block) ->
    if block?
      latest_block = block
      (tx.setConfirmations MyWallet.getConfirmationsForTx(latest_block, tx) for tx in WalletStore.getTransactions())
      MyWallet.sendEvent('did_set_latest_block');
    return

  getAllTags: () -> tx_tags

  getTags: (tx_hash) -> 
    if (tx_hash of tx_tags) then tx_tags[tx_hash] else []

  setTags: (allTags) ->
    if allTags?
      for tx_hash of allTags
        tags = allTags[tx_hash]
        if tags? and MyWallet.isAlphaNumericSpace(tags)
          tx_tags[tx_hash] = tags
    return

  setTag: (tx_hash, idx) ->
    if not tx_tags[tx_hash]?
      tx_tags[tx_hash] = []
    tx_tags[tx_hash].push(idx)
    MyWallet.backupWalletDelayed()
    return

  unsetTag: (tx_hash, idx) ->
    tags = tx_tags[tx_hash]
    index = tx_tags.indexOf(idx)
    if (index > -1)
      tx_tags.splice(index, 1)
    MyWallet.backupWalletDelayed()
    return

  deleteTag: (idx) ->
    tag_names.splice(idx,1)
    for tx_hash of tx_tags
      tags = tx_tags[tx_hash]
      index = tx_tags.indexOf(idx)
      if index > -1
        tx_tags.splice index, 1
    # MyWallet.backupWalletDelayed()
    return

  getTagNames: () -> tag_names
  
  addTag: (name) ->
    isValidTag = MyWallet.isAlphaNumericSpace(name)
    if isValidTag
      tag_names.push(name)
      MyWallet.backupWalletDelayed()
    return isValidTag

  renameTag: (idx, name) ->
    isValidTag = MyWallet.isAlphaNumericSpace(name)
    if isValidTag
      tag_names[idx] = name
      MyWallet.backupWalletDelayed()
    return isValidTag

  setTagNames: (names) ->
    tag_names = names if names?
    return
