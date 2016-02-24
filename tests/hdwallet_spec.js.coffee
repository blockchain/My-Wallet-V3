proxyquire = require('proxyquireify')(require)
MyWallet = undefined
HDWallet = undefined
BIP39 = undefined
RNG = undefined

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
        get_history: () ->
        syncWallet: () ->
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
      HDWallet    = proxyquire('../src/hd-wallet', stubs)
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

    describe "HDWallet.new()", ->

      beforeEach ->
        BIP39 = {
            generateMnemonic: (str, rng, wlist) ->
              mnemonic = "bicycle balcony prefer kid flower pole goose crouch century lady worry flavor"
              seed = rng(32)
              if seed = "random" then mnemonic else "failure"
          }
        RNG = {
          run: (input) ->
            if RNG.shouldThrow
              throw 'Connection failed'
            "random"
        }
        stubs = {
          './wallet': MyWallet,
          'bip39': BIP39,
          './rng' : RNG
        }
        HDWallet    = proxyquire('../src/hd-wallet', stubs)
        spyOn(BIP39, "generateMnemonic").and.callThrough()
        spyOn(RNG, "run").and.callThrough()

      it "should return an hdwallet with a random non-encrypted seedHex", ->
        hdw = HDWallet.new(null)
        expect(hdw._seedHex).toEqual('15e23aa73d25994f1921a1256f93f72c');

      it "should return an hdwallet with a random encrypted seedHex", ->
        encoder = (msg) -> "encrypted-" + msg
        hdw = HDWallet.new(encoder)
        expect(hdw._seedHex).toEqual('encrypted-15e23aa73d25994f1921a1256f93f72c');

      it "should call BIP39.generateMnemonic with our RNG", ->

        hdw = HDWallet.new(null)
        expect(BIP39.generateMnemonic).toHaveBeenCalled()
        expect(RNG.run).toHaveBeenCalled()

      it "should throw if RNG throws", ->
        # E.g. because there was a network failure.
        # This assumes BIP39.generateMnemonic does not rescue a throw
        # inside the RNG
        RNG.shouldThrow = true
        expect(() -> HDWallet.new(null)).toThrow('Connection failed')

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
        expect(wallet.isValidAccountIndex(-1.242)).toBeFalsy()
        expect(wallet.isValidAccountIndex(0)).toBeTruthy()
        expect(wallet.isValidAccountIndex(+1)).toBeFalsy()
        expect(wallet.isValidAccountIndex(+1.325453)).toBeFalsy()
        expect(wallet.isValidAccountIndex({'a': 1})).toBeFalsy()


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

        areAccountsEncrypted = not wallet.accounts.map((a) ->  a._temporal_xpriv).some((e) -> e is undefined)
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

        areAccountsDecrypted = not wallet.accounts.map((a) ->  a._temporal_xpriv).some((e) -> e is undefined)
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

    describe ".factory", ->
      it "should not touch an existing object", ->
        fromFactory = HDWallet.factory(wallet)
        expect(fromFactory).toEqual(wallet)

    describe ".restore", ->
      it "should not restore an invalid hex seed", ->
        expect(() -> HDWallet.restore("i'm not valid", "password")).toThrow()

      it "should set the password to '' if not a string", ->
        wallet = HDWallet.restore("0123456789abcdef0123456789abcdef", 4334)
        expect(wallet._bip39Password).toEqual("")

    describe ".newAccount", ->

      observer =
        cipher: (mode) ->
          if mode == "enc"
            return () -> "aSBhbSBlbmNyeXB0ZWQ="
          else if mode == "dec"
            return () -> "0123456789abecdf0123456789abecdf"
          else
            expect(true).toEqual(false)

      it "should not create a new account without a cipher when the seed hex is bad", ->
        wallet._seedHex = "i'm a bad seed hex"
        before = wallet.accounts.length
        expect(() -> wallet.newAccount("Savings")).toThrow()

        expect(wallet.accounts.length).toEqual(before)

      it "should create a new account without a cipher and with an empty passphrase", ->
        wallet = wallet.newAccount("Savings")

        expect(wallet.accounts.length).toEqual(2)
        expect(wallet.accounts[wallet.accounts.length - 1].label).toEqual('Savings')

      it "should create a new account without a cipher and with a password", ->
        wallet = HDWallet.restore("0123456789abcdef0123456789abcdef", "password")
        wallet = wallet.newAccount("Savings")

        expect(wallet.accounts.length).toEqual(1)
        expect(wallet.accounts[wallet.accounts.length - 1].label).toEqual('Savings')

      it "should create a new account with a cipher and with an empty passphrase", ->
        wallet = wallet.newAccount("Savings", observer.cipher)

        expect(wallet.accounts.length).toEqual(2)
        expect(wallet.accounts[wallet.accounts.length - 1].label).toEqual('Savings')

      it "should create a new account with a cipher and with a password", ->
        wallet = HDWallet.restore("0123456789abcdef0123456789abcdef", "password")
        wallet = wallet.newAccount("Savings", observer.cipher)

        expect(wallet.accounts.length).toEqual(1)
        expect(wallet.accounts[wallet.accounts.length - 1].label).toEqual('Savings')

    describe "isUnEncrypted and isEncrypted", ->
      observer =
        cipher: (mode) ->
          if mode == "enc"
            return () -> "aSBhbSBlbmNyeXB0ZWQ="
          else if mode == "dec"
            return () -> "0123456789abecdf0123456789abecdf"
          else
            expect(true).toEqual(false)

      it "should be correct for the non encrypted test HDWallet", ->
        expect(wallet.isUnEncrypted).toBeTruthy()
        expect(wallet.isEncrypted).toBeFalsy()

      it "should considered an encrypted but non persisted wallet as unencrypted", ->
        wallet = wallet.encrypt(observer.cipher('enc'))
        expect(wallet.isUnEncrypted).toBeTruthy()
        expect(wallet.isEncrypted).toBeFalsy()

      it "should considered an encrypted and persisted wallet as encrypted", ->
        wallet = wallet.encrypt(observer.cipher('enc')).persist()
        expect(wallet.isUnEncrypted).toBeFalsy()
        expect(wallet.isEncrypted).toBeTruthy()