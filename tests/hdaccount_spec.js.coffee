proxyquire = require('proxyquireify')(require)
MyWallet = undefined
HDAccount = undefined

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
    MyWallet =
      syncWallet: () ->
      wallet:
        getHistory: () ->

    spyOn(MyWallet, "syncWallet")
    spyOn(MyWallet.wallet, "getHistory")
    # account = new HDAccount(object)

  describe "Constructor", ->
    describe "without arguments", ->
      beforeEach ->
        KeyRing = () -> {init: () ->}
        KeyChain = {}
        stubs = { './wallet': MyWallet, './keyring' : KeyRing, './keychain' : KeyChain}
        HDAccount = proxyquire('../src/hd-account', stubs)


      it "should create an empty HDAccount with default options", ->
        account = new HDAccount()
        expect(account.balance).toEqual(null)
        expect(account.archived).not.toBeTruthy()
        expect(account.active).toBeTruthy()
        expect(account.receiveIndex).toEqual(0)
        expect(account.changeIndex).toEqual(0)

      it "should create an HDAccount from AccountMasterKey", ->
        accountZero =
          toBase58: () -> "accountZeroBase58"
          neutered: () ->
            {
              toBase58: () -> "accountZeroNeuteredBase58"
            }

        a = HDAccount.fromAccountMasterKey(accountZero, 0, "label")

        expect(a.label).toEqual("label")
        expect(a._xpriv).toEqual("accountZeroBase58")
        expect(a._xpub).toEqual("accountZeroNeuteredBase58")



      it "should create an HDAccount from Wallet master key", ->

        masterkey =
          deriveHardened: (i) ->
            deriveHardened: (j) ->
              deriveHardened: (k) ->
                toBase58: () ->
                  "m/" + i + "/" + j + "/" + k
                neutered: () ->
                  toBase58: () ->

        a = HDAccount.fromWalletMasterKey(masterkey, 0, "label")

        expect(a._xpriv).toEqual("m/44/0/0")
        expect(a.label).toEqual("label")

    it "should transform an Object to an HDAccount", ->
      stubs = { './wallet': MyWallet}
      HDAccount = proxyquire('../src/hd-account', stubs)
      account = new HDAccount(object)
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


  describe "JSON serializer", ->
    it 'should hold: fromJSON . toJSON = id', ->
      json1     = JSON.stringify(account, null, 2)
      racc = JSON.parse(json1, HDAccount.reviver)
      json2     = JSON.stringify(racc, null, 2)
      expect(json1).toEqual(json2)

  describe "instance", ->
    beforeEach ->
      stubs = { './wallet': MyWallet}
      HDAccount = proxyquire('../src/hd-account', stubs)

      account = new HDAccount(object)

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
        fail = (reason) ->
          console.log(reason)

        success = () ->

        account.setLabelForReceivingAddress(10, "my label").then(success).catch(fail)
        expect(account._address_labels[10]).toEqual("my label")
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        expect(account.getLabelForReceivingAddress(10)).toEqual("my label")

      it "should not set a non-valid label", ->
        fail = (reason) ->
          except(reason).toEqual('NOT_ALPHANUMERIC')

        success = () ->

        account.setLabelForReceivingAddress(10, 0).then(success).catch(fail)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "should not set a label with a gap too wide", ->
        fail = (reason) ->
          except(reason).toEqual('GAP')

        success = () ->

        account.setLabelForReceivingAddress(100, "my label").then(success).catch(fail)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    describe "Setter", ->

      it "active shoud toggle archived", ->
        account.active = false
        expect(account.archived).toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        account.active = true
        expect(account.archived).toBeFalsy()

      it "archived should archive the account and sync wallet", ->
        account.archived = true
        expect(account.archived).toBeTruthy()
        expect(account.active).not.toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()

      it "archived should throw exception if is non-boolean set", ->
        wrongSet = () -> account.archived = "failure"
        expect(wrongSet).toThrow()

      it "archived should call MyWallet.sync.getHistory when set to false", ->
        account.archived = false
        expect(MyWallet.wallet.getHistory).toHaveBeenCalled()
        expect(MyWallet.syncWallet).toHaveBeenCalled()

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

      it "label should be valid", ->
        test = () ->
          account.label = 0

        expect(test).toThrow()

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

      it "lastUsedReceiveIndex must be a number", ->
        invalid = () ->
          account.lastUsedReceiveIndex = "1"

        valid = () ->
          account.lastUsedReceiveIndex = 1

        expect(invalid).toThrow()
        expect(account.lastUsedReceiveIndex).toEqual(0)
        expect(valid).not.toThrow()
        expect(account.lastUsedReceiveIndex).toEqual(1)

      it "receiveIndex must be a number", ->
        invalid = () ->
          account.receiveIndex = "1"

        valid = () ->
          account.receiveIndex = 1

        expect(invalid).toThrow()
        expect(account.receiveIndex).toEqual(0)
        expect(valid).not.toThrow()
        expect(account.receiveIndex).toEqual(1)

      it "changeIndex must be a number", ->
        invalid = () ->
          account.changeIndex = "1"

        valid = () ->
          account.changeIndex = 1

        expect(invalid).toThrow()
        expect(account.changeIndex).toEqual(0)
        expect(valid).not.toThrow()
        expect(account.changeIndex).toEqual(1)

    describe "Getter", ->
      it "maxLabeledReceiveIndex should return the highest labeled index", ->
        expect(account.maxLabeledReceiveIndex).toEqual(-1)

        account.setLabelForReceivingAddress(1, "label1")
        account.setLabelForReceivingAddress(10, "label100")

        expect(account.maxLabeledReceiveIndex).toEqual(10)

      it "labeledReceivingAddresses should return all the labeled receiving addresses", ->
        expect(account.labeledReceivingAddresses.length).toEqual(0)

        account.setLabelForReceivingAddress(1, "label1")
        account.setLabelForReceivingAddress(10, "label100")

        expect(account.labeledReceivingAddresses.length).toEqual(2)

    describe ".encrypt", ->
      beforeEach ->
        account = new HDAccount(object)

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
      beforeEach ->
        account = new HDAccount(object)

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
      beforeEach ->
        account = new HDAccount(object)

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

    describe ".removeLabelForReceivingAddress", ->
      it "should remove the label and sync the wallet", ->
        fail = (reason) ->
          console.log(reason)

        resolve = () ->

        account.setLabelForReceivingAddress(0, "Savings").then(resolve).catch(fail)
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        account.removeLabelForReceivingAddress(0)
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        expect(account.getLabelForReceivingAddress(0)).not.toEqual("Savings")
