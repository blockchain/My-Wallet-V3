proxyquire = require('proxyquireify')(require)
MyWallet = {}
KeyRing = {}
stubs = { './wallet': MyWallet }
HDAccount = proxyquire('../src/hd-account', stubs)

describe "HDAccount", ->
  # account = HDAccount.fromExtPublicKey("xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq", undefined, "Example account");

  account = undefined
  object =
    'label': 'My great wallet'
    'archived': false
    'xpriv': 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E'
    'xpub': 'xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq'
    'address_labels': []
    'cache':
      'receiveAccount': 'xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP'
      'changeAccount': 'xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m'

  beforeEach ->
    spyOn(MyWallet, "syncWallet")
    spyOn(MyWallet, "get_history")
    account = new HDAccount(object)

  describe "Constructor", ->

    it "should create an empty HDAccount with default options", ->
      account = new HDAccount()
      expect(account.balance).toEqual(null)
      expect(account.archived).not.toBeTruthy()
      expect(account.active).toBeTruthy()
      expect(account.receiveIndex).toEqual(0)
      expect(account.changeIndex).toEqual(0)

    it "should transform an Object to an HDAccount", ->
      expect(account.extendedPublicKey).toEqual(object.xpub)
      expect(account.extendedPrivateKey).toEqual(object.xpriv)
      expect(account.label).toEqual(object.label)
      expect(account.archived).toEqual(object.archived)
      expect(account.receiveIndex).toEqual(0)
      expect(account.changeIndex).toEqual(0)
      expect(account.n_tx).toEqual(0)
      expect(account.balance).toEqual(null)
      expect(account.keyRing).toBeDefined()
      expect(account.receiveAddress).toBeDefined()
      expect(account.changeAddress).toBeDefined()

    it "should create an HDAccount from AccountMasterKey", ->
      # SJORS?: It is possible to mock HDAccount constructor while testing HDAccount.fromAccountMasterKey
      observer =
        "toBase58": null
        "neutered": null

      spyOn(observer, "toBase58").and.returnValue(null)
      spyOn(observer, "neutered").and.callFake () -> {"toBase58": observer.toBase58 }

      a = HDAccount.fromAccountMasterKey(observer, 0, "label")
      expect(a.label).toEqual("label")
      expect(a._xpriv).toEqual(null)
      expect(a._xpub).toEqual(null)
      expect(observer.toBase58.calls.count()).toEqual(2)

    it "should create an HDAccount from Wallet master key", ->
      # SJORS?: I dont know how to mock:
      #   var accountZero = masterkey.deriveHardened(44).deriveHardened(0).deriveHardened(index);
      #   I want to avoid making derivations on the test

      # masterkey =
      #   "deriveHardened": (i) -> {masterkey.deriveHardened}
      # spyOn(observer, "final").and.callFake((index) -> "deriveHardened" + index)
      # spyOn(observer, "deriveHardened").and.callFake (index) -> {"deriveHardened": observer.deriveHardened(index) }
      # console.log(observer.deriveHardened(2))
      pending()

  describe "JSON serializer", ->
    it 'should hold: fromJSON . toJSON = id', ->
      json1     = JSON.stringify(account, null, 2)
      racc = JSON.parse(json1, HDAccount.reviver)
      json2     = JSON.stringify(racc, null, 2)
      expect(json1).toEqual(json2)

  describe ".incrementReceiveIndex", ->
    it 'should increment the received index', ->
      initial = account.receiveIndex
      account.incrementReceiveIndex()
      final = account.receiveIndex
      expect(final).toEqual(initial + 1)

  describe ".incrementReceiveIndexIfLast", ->

    it 'should not increment the received index', ->
      account._receiveIndex = 10
      initial = account.receiveIndex
      account.incrementReceiveIndexIfLast(5)
      final = account.receiveIndex
      expect(final).toEqual(initial)

    it 'should increment the received index', ->
      account._receiveIndex = 10
      initial = account.receiveIndex
      account.incrementReceiveIndexIfLast(10)
      final = account.receiveIndex
      expect(final).toEqual(initial + 1)

  describe ".get/setLabelForReceivingAddress", ->

    it 'should set the label sync and get the label', ->
      account.setLabelForReceivingAddress(100, "my label")
      expect(account._address_labels[100]).toEqual("my label")
      expect(MyWallet.syncWallet).toHaveBeenCalled()
      expect(account.getLabelForReceivingAddress(100)).toEqual("my label")

  describe "Setter", ->

    it "archived should archive the account and sync wallet", ->
      account.archived = true
      expect(account.archived).toBeTruthy()
      expect(account.active).not.toBeTruthy()
      expect(MyWallet.syncWallet).toHaveBeenCalled()

    it "archived should unArchive the account, sync wallet and get history", ->
      account.archived = false
      expect(account.archived).not.toBeTruthy()
      expect(account.active).toBeTruthy()
      expect(MyWallet.syncWallet).toHaveBeenCalled()
      expect(MyWallet.get_history).toHaveBeenCalled()

    it "archived should throw exception if is non-boolean set", ->
      wrongSet = () -> account.archived = "failure"
      expect(wrongSet).toThrow()

    it "balance should be set and not sync wallet", ->
      account.balance = 100
      expect(account.balance).toEqual(100)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it "balance should throw exception if is non-Number set", ->
      wrongSet = () -> account.balance = "failure"
      expect(wrongSet).toThrow()

    it "n_tx should be set and not sync wallet", ->
      account.n_tx = 100
      expect(account.n_tx).toEqual(100)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it "n_tx should throw exception if is non-Number set", ->
      wrongSet = () -> account.n_tx = "failure"
      expect(wrongSet).toThrow()

    it "label should be set and sync wallet", ->
      account.label = "my label"
      expect(account.label).toEqual("my label")
      expect(MyWallet.syncWallet).toHaveBeenCalled()

    it "xpriv is read only", ->
      account.extendedPrivateKey = "not allowed"
      expect(account.extendedPrivateKey).not.toEqual("not allowed")

    it "xpub is read only", ->
      account.extendedPublicKey = "not allowed"
      expect(account.extendedPublicKey).not.toEqual("not allowed")

    it "receiveAddress is read only", ->
      account.receiveAddress = "not allowed"
      expect(account.receiveAddress).not.toEqual("not allowed")

    it "changeAddress is read only", ->
      account.changeAddress = "not allowed"
      expect(account.changeAddress).not.toEqual("not allowed")

    it "index is read only", ->
      account.index = "not allowed"
      expect(account.index).not.toEqual("not allowed")

    it "KeyRing is read only", ->
      account.keyRing = "not allowed"
      expect(account.keyRing).not.toEqual("not allowed")

  describe ".encrypt", ->

    it 'should fail and don\'t sync when encryption fails', ->
      wrongEnc = () -> account.encrypt(() -> null)
      expect(wrongEnc).toThrow()
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should write in a temporary field and let the original key intact', ->
      originalKey = account.extendedPrivateKey
      account.encrypt(() -> "encrypted key")
      expect(account._temporal_xpriv).toEqual("encrypted key")
      expect(account.extendedPrivateKey).toEqual(originalKey)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should do nothing if watch only account', ->
      account._xpriv = null
      account.encrypt(() -> "encrypted key")
      expect(account.extendedPrivateKey).toEqual(null)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should do nothing if no cipher provided', ->
      originalKey = account.extendedPrivateKey
      account.encrypt(undefined)
      expect(account.extendedPrivateKey).toEqual(originalKey)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

  describe ".decrypt", ->

    it 'should fail and don\'t sync when decryption fails', ->
      wrongEnc = () -> account.decrypt(() -> null)
      expect(wrongEnc).toThrow()
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should write in a temporary field and let the original key intact', ->
      originalKey = account.extendedPrivateKey
      account.decrypt(() -> "decrypted key")
      expect(account._temporal_xpriv).toEqual("decrypted key")
      expect(account.extendedPrivateKey).toEqual(originalKey)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should do nothing if watch only account', ->
      account._xpriv = null
      account.decrypt(() -> "decrypted key")
      expect(account.extendedPrivateKey).toEqual(null)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should do nothing if no cipher provided', ->
      originalKey = account.extendedPrivateKey
      account.decrypt(undefined)
      expect(account.extendedPrivateKey).toEqual(originalKey)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

  describe ".persist", ->

    it 'should do nothing if temporary is empty', ->
      originalKey = account.extendedPrivateKey
      account.persist()
      expect(account.extendedPrivateKey).toEqual(originalKey)
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    it 'should swap and delete if we have a temporary value', ->
      account._temporal_xpriv = "encrypted key"
      temp             = account._temporal_xpriv
      account.persist()
      expect(account.extendedPrivateKey).toEqual(temp)
      expect(account._temporal_xpriv).not.toBeDefined()
      expect(MyWallet.syncWallet).not.toHaveBeenCalled()

