proxyquire = require('proxyquireify')(require)
MyWallet = undefined
HDWallet = undefined

describe "HDWallet", ->
  wallet = undefined
  object =
    'seed_hex': '7e061ca8e579e5e70e9989ca40d342fe'
    'passphrase': ''
    'mnemonic_verified': false
    'default_account_idx': 0
    'accounts': [ {
      'label': 'My Bitcoin Wallet'
      'archived': false
      'xpriv': 'xprv9yko4kDvhYSdUcqK5e8naLwtGE1Ca57mwJ6JMB8WxeYq8t1w3PpiZfGGvLN6N6GEwLF8XuHnp8HeNLrWWviAjXxb2BFEiLaW2UgukMZ3Zva'
      'xpub': 'xpub6Ck9UFkpXuzvh6unBffnwUtcpFqgyXqdJX1u9ZY8Wz5p1gM5aw8y7TakmcEWLA9rJkc59BJzn61p3qqKSaqFkSPMbbhGA9YDNmphj9SKBVJ'
      'address_labels': []
      'cache':
        'receiveAccount': 'xpub6FD59hfbH1UWQA9B8NP1C8bh3jc6i2tpM6b8f4Wi9gHWQttZbBBtEsDDZAiPsw7e3427SzvQsFu2sdubjbZHDQdqYXN6x3hTDCrG5bZFEhB'
        'changeAccount': 'xpub6FD59hfbH1UWRrY38bVLPPLPLxcA1XBqsQgB95AgsSWngxbwqPBMd5Z3of8PNicLwE9peQ9g4SeWWtBTzUKLwfjSioAg73RRh7dJ5rWYxM7'
    } ]

  beforeEach ->
    MyWallet =
      syncWallet: () ->
      get_history: () ->

    spyOn(MyWallet, "syncWallet")
    spyOn(MyWallet, "get_history")

  describe "Constructor", ->

    beforeEach ->
      KeyRing = () -> {init: () ->}
      KeyChain = {}
      stubs = { './wallet': MyWallet, './keyring' : KeyRing, './keychain' : KeyChain}
      HDWallet = proxyquire('../src/hd-wallet', stubs)

    it "should create an empty HDWallet with default options", ->
      wallet = new HDWallet()
      expect(wallet._accounts.length).toEqual(0)

    it "should transform an Object to an HDAccount", ->
      HDAccount =
        factory: () ->
      stubs = { './wallet': MyWallet, './hd-account': HDAccount}
      HDWallet = proxyquire('../src/hd-wallet', stubs)
      spyOn(HDAccount, "factory")
      wallet = new HDWallet(object)

      expect(wallet._seedHex).toEqual(object.seed_hex)
      expect(wallet._bip39Password).toEqual(object.passphrase)
      expect(wallet._mnemonic_verified).toEqual(object.mnemonic_verified)
      expect(wallet._default_account_idx).toEqual(object.default_account_idx)
      expect(HDAccount.factory.calls.count()).toEqual(object.accounts.length)

  describe "instance", ->
    beforeEach ->
      stubs = { './wallet': MyWallet}
      HDWallet = proxyquire('../src/hd-wallet', stubs)

      wallet = new HDWallet(object)

    describe "Setter", ->

      it "seedHex is read only", ->
        wallet.seedHex = "not allowed"
        expect(wallet.seedHex).not.toEqual("not allowed")

      it "bip39Password is read only", ->
        wallet.bip39Password = "not allowed"
        expect(wallet.bip39Password).not.toEqual("not allowed")

      it "isMnemonicVerified is read only", ->
        wallet.isMnemonicVerified = "not allowed"
        expect(wallet.isMnemonicVerified).not.toEqual("not allowed")

      it "defaultAccount is read only", ->
        wallet.defaultAccount = "not allowed"
        expect(wallet.defaultAccount).not.toEqual("not allowed")

      it "accounts is read only", ->
        wallet.accounts = "not allowed"
        expect(wallet.accounts).not.toEqual("not allowed")

      it "activeAccounts is read only", ->
        wallet.activeAccounts = "not allowed"
        expect(wallet.activeAccounts).not.toEqual("not allowed")

      it "xpubs is read only", ->
        wallet.xpubs = "not allowed"
        expect(wallet.xpubs).not.toEqual("not allowed")

      it "activeXpubs is read only", ->
        wallet.activeXpubs = "not allowed"
        expect(wallet.activeXpubs).not.toEqual("not allowed")

      it "balanceActiveAccounts is read only", ->
        wallet.balanceActiveAccounts = "not allowed"
        expect(wallet.balanceActiveAccounts).not.toEqual("not allowed")

      it "lastAccount is read only", ->
        wallet.lastAccount = "not allowed"
        expect(wallet.lastAccount).not.toEqual("not allowed")

      it "defaultAccountIndex should throw exception if is non-number set", ->
        wrongSet = () -> wallet.defaultAccountIndex = "failure"
        expect(wrongSet).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "defaultAccountIndex should be set and sync wallet", ->
        wallet.defaultAccountIndex = 0
        expect(wallet.defaultAccountIndex).toEqual(0)
        expect(MyWallet.syncWallet).toHaveBeenCalled()

    describe "Getter", ->

      it "seedHex", ->
        expect(wallet.seedHex).toEqual(object.seed_hex)

      it "bip39Password", ->
        expect(wallet.bip39Password).toEqual(object.passphrase)

      it "isMnemonicVerified", ->
        expect(wallet.isMnemonicVerified).toEqual(object.mnemonic_verified)

      it "defaultAccount", ->
        expect(wallet.defaultAccount).toBeDefined()

      it "accounts", ->
        expect(wallet.accounts.length).toEqual(object.accounts.length)

      it "activeAccounts", ->
        expect(wallet.activeAccounts.length).toEqual(1)

      it "xpubs", ->
        expect(wallet.xpubs[0]).toEqual(object.accounts[0].xpub)

      it "activeXpubs", ->
        expect(wallet.activeXpubs[0]).toEqual(object.accounts[0].xpub)

      it "balanceActiveAccounts null balance", ->
        expect(wallet.balanceActiveAccounts).toEqual(null)

      it "balanceActiveAccounts not null balance", ->
        wallet.accounts[0].balance = 1000
        expect(wallet.balanceActiveAccounts).toEqual(1000)

      it "lastAccount", ->
        expect(wallet.lastAccount.extendedPublicKey).toEqual(object.accounts[0].xpub)

      it "defaultAccountIndex", ->
        expect(wallet.defaultAccountIndex).toEqual(0)

    describe "Method", ->

      it ".isValidAccountIndex should be (0 =< index < #accounts - 1)", ->
        expect(wallet.isValidAccountIndex(-1)).toBeFalsy()
        expect(wallet.isValidAccountIndex(0)).toBeTruthy()
        expect(wallet.isValidAccountIndex(+1)).toBeFalsy()

      it ".verifyMnemonic should set to true and sync", ->
        wallet.verifyMnemonic()
        expect(wallet.isMnemonicVerified).toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()

      it ".account should return an account given the xpub", ->
        xpub = object.accounts[0].xpub
        expect(wallet.account(xpub).extendedPublicKey).toEqual(xpub)

      it ".account should return null if no xpub", ->
        xpub = "this is not good"
        expect(wallet.account(xpub)).toEqual(null)

      it ".activeAccount should not return an archived account", ->
        xpub = object.accounts[0].xpub
        wallet.accounts[0].archived = true
        expect(wallet.activeAccount(xpub)).toEqual(null)

      it ".activeAccount should return an active account", ->
        xpub = object.accounts[0].xpub
        expect(wallet.activeAccount(xpub).extendedPublicKey).toEqual(xpub)

    describe "JSON serialization", ->

      it 'should hold: fromJSON . toJSON = id', ->
        json1     = JSON.stringify(wallet, null, 2)
        rwall = JSON.parse(json1, HDWallet.reviver)
        json2     = JSON.stringify(rwall, null, 2)
        expect(json1).toEqual(json2)

    describe ".encrypt", ->

      it 'should fail and don\'t sync when encryption fails', ->
        wrongEnc = () -> wallet.encrypt(() -> null)
        expect(wrongEnc).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should write in a temporary field and let the original elements intact', ->
        wallet._bip39Password = "something"
        originalSeed = wallet.seedHex
        originalpass = wallet.bip39Password

        wallet.encrypt(() -> "encrypted")

        areAccountsEncrypted = not wallet.accounts
                                 .map((a) ->  a._temporal_xpriv)
                                   .some((e) -> e is undefined)
        expect(wallet._temporal_seedHex).toEqual("encrypted")
        expect(wallet._temporal_bip39Password).toEqual("encrypted")
        expect(wallet.seedHex).toEqual(originalSeed)
        expect(wallet.bip39Password).toEqual(originalpass)
        expect(areAccountsEncrypted).toBeTruthy()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      # check the undefined cipher case on the implementation
      # it 'should do nothing if no cipher provided', ->
      #   wallet._bip39Password = "something"
      #   originalSeed = wallet.seedHex
      #   originalpass = wallet.bip39Password

      #   wallet.encrypt(undefined)

      #   areAccountsEncrypted = not wallet.accounts
      #                            .map((a) ->  a._temporal_xpriv)
      #                              .some((e) -> e is undefined)
      #   expect(wallet._temporal_seedHex).toEqual(undefined)
      #   expect(wallet._temporal_bip39Password).toEqual(undefined)
      #   expect(wallet.seedHex).toEqual(originalSeed)
      #   expect(wallet.bip39Password).toEqual(originalpass)
      #   expect(areAccountsEncrypted).toBeFalsy()

    describe ".decrypt", ->

      it 'should fail and don\'t sync when decryption fails', ->
        wrongEnc = () -> wallet.decrypt(() -> null)
        expect(wrongEnc).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should write in a temporary field and let the original elements intact', ->
        wallet._bip39Password = "something"
        originalSeed = wallet.seedHex
        originalpass = wallet.bip39Password

        wallet.decrypt(() -> "decrypted")

        areAccountsDecrypted = not wallet.accounts
                                 .map((a) ->  a._temporal_xpriv)
                                   .some((e) -> e is undefined)
        expect(wallet._temporal_seedHex).toEqual("decrypted")
        expect(wallet._temporal_bip39Password).toEqual("decrypted")
        expect(wallet.seedHex).toEqual(originalSeed)
        expect(wallet.bip39Password).toEqual(originalpass)
        expect(areAccountsDecrypted).toBeTruthy()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      # check the undefined cipher case on the implementation
      # it 'should do nothing if no cipher provided', ->
      #   wallet._bip39Password = "something"
      #   originalSeed = wallet.seedHex
      #   originalpass = wallet.bip39Password

      #   wallet.encrypt(undefined)

      #   areAccountsEncrypted = not wallet.accounts
      #                            .map((a) ->  a._temporal_xpriv)
      #                              .some((e) -> e is undefined)
      #   expect(wallet._temporal_seedHex).toEqual(undefined)
      #   expect(wallet._temporal_bip39Password).toEqual(undefined)
      #   expect(wallet.seedHex).toEqual(originalSeed)
      #   expect(wallet.bip39Password).toEqual(originalpass)
      #   expect(areAccountsEncrypted).toBeFalsy()

    describe ".persist", ->

      it 'should do nothing if temporary is empty', ->
        originalSeed = wallet.seedHex
        originalpass = wallet.bip39Password
        wallet.persist()
        expect(wallet.seedHex).toEqual(originalSeed)
        expect(wallet.bip39Password).toEqual(originalpass)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should swap and delete if we have temporary values', ->
        wallet._temporal_seedHex = "encrypted seed"
        wallet._temporal_bip39Password = "encrypted bip39pass"
        temp_seed = wallet._temporal_seedHex
        temp_pass = wallet._temporal_bip39Password
        wallet.persist()
        expect(wallet.seedHex).toEqual(temp_seed)
        expect(wallet.bip39Password).toEqual(temp_pass)
        expect(wallet._temporal_seedHex).not.toBeDefined()
        expect(wallet._temporal_bip39Password).not.toBeDefined()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()
