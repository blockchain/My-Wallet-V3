proxyquire = require('proxyquireify')(require)

WalletStore = {}
WalletCrypto = {}
Bitcoin = {}
BlockchainAPI = {}
MyWallet = {}
HDAccount = {}

spenderStubs = {
          './wallet-crypto'  : WalletCrypto
        , './wallet-store'   : WalletStore
        , 'bitcoinjs-lib'    : Bitcoin
        , './blockchain-api' : BlockchainAPI
        , './wallet'         : MyWallet
        , './hd-account'     : HDAccount
      }

Spender = proxyquire('../src/wallet-spender', spenderStubs)
RSVP = require('rsvp')
BigInteger = require('bigi')

################################################################################
################################################################################
describe "Spender", ->

  obs        = undefined
  hdAccounts = undefined
  getPass    = undefined

  beforeEach ->
    # window.formatBTC = (str) -> str
    obs =
      success: () -> return
      error: () -> return
      listener: () -> return
      correct_password: () -> return
      wrong_password: () -> return
      getPassword: (cb) -> cb('pass', obs.correct_password, obs.wrong_password)

    spyOn(obs, "correct_password")
    spyOn(obs, "wrong_password")
    spyOn(obs, 'getPassword').and.callThrough()
    # spyOn(obs, 'listener')

    spyOn(BlockchainAPI, "push_tx")
      .and.callFake((tx, note, success, error) -> success(tx))
################################################################################
  describe "Constructor", ->
    it "should create all (from) methods", ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      p = new Spender(null, (()->), (()->), null, null)

      expect(typeof(p.fromAccount)).toEqual("function")
      expect(typeof(p.fromAddress)).toEqual("function")
      expect(typeof(p.addressSweep)).toEqual("function")

    it "should create all (to) methods", ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      fa = new Spender(null, (()->), (()->), null, null)
                  .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 10, 10)

      expect(typeof(fa.toAddress)).toEqual("function")
      expect(typeof(fa.toAccount)).toEqual("function")
      expect(typeof(fa.toMobile)).toEqual("function")
      expect(typeof(fa.toEmail)).toEqual("function")

################################################################################
  describe "(secondPassword test)", ->

    beforeEach ->
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(spenderM.fromAdd.coins))

    it "should call correct_password", () ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)

      Spender("my note", (()->), (()->), obs.listener, obs.getPassword)
        .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 30000, 10000)
          .toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF")

      expect(obs.correct_password).toHaveBeenCalled()
      expect(obs.wrong_password).not.toHaveBeenCalled()

    it "should call wrong_password", () ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(false)

      Spender("my note",  (()->), (()->), obs.listener, obs.getPassword)
        .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 30000, 10000)
          .toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF")

      expect(obs.correct_password).not.toHaveBeenCalled()
      expect(obs.wrong_password).toHaveBeenCalled()

    it "should not call correct_password or wrong_password if there's no 2nd password", () ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      Spender("my note", (()->), (()->), obs.listener, obs.getPassword)
        .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 30000, 10000)
          .toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF")

      expect(obs.getPassword).not.toHaveBeenCalled()
      expect(obs.correct_password).not.toHaveBeenCalled()
      expect(obs.wrong_password).not.toHaveBeenCalled()

################################################################################
  describe "from Address to Address", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.txHash1 or txHex is M.txHash2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()

################################################################################
  describe "from Address to Email (with second password active)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      # general mocks
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      # from Address mocks
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      # ToEmail Mocks
      spyOn(MyWallet, "generateNewKey").and.returnValue(spenderM.toEmail.key)
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "setPaidToElement")
      spyOn(WalletStore, "setLegacyAddressLabel")
        .and.callFake((add,note,continuation,error) -> continuation())
      spyOn(MyWallet, "backupWallet")
        .and.callFake((method,continuation) -> continuation())
      spyOn(BlockchainAPI, "sendViaEmail")
        .and.callFake((email, tx, privateKey, continuation, error) -> continuation())

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toEmail(spenderM.toEmail.email)

    it "should push the right transaction to the network and store data related toEmail", ->

      # store the toEmail payment address as a legacy address
      expect(WalletStore.setLegacyAddressTag).toHaveBeenCalledWith(spenderM.toEmail.toAddress, 2)
      # set the label and continue the process
      expect(WalletStore.setLegacyAddressLabel).toHaveBeenCalled()
      # make a backup
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # create and push the expected transaction
      txID = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).getId();
      testTx = txID is spenderM.toEmail.txID1 or txID is spenderM.toEmail.txID2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]
      expect(BlockchainAPI.push_tx).toHaveBeenCalled()
      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      # send the email with the private key
      expect(BlockchainAPI.sendViaEmail)
        .toHaveBeenCalledWith( spenderM.toEmail.email
                             , jasmine.any(Object)
                             , spenderM.toEmail.key.toWIF()
                             , jasmine.any(Function)
                             , jasmine.any(Function))
      # since second password is active then encrypt the private keys
      expect(WalletStore.encryptPrivateKey).toHaveBeenCalled()
      # save paidto on wallet json
      expect(WalletStore.setPaidToElement).toHaveBeenCalled()
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # success finished
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from Address to Email (without second password)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      # general mocks
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(false)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      # from Address mocks
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.privateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      # ToEmail Mocks
      spyOn(MyWallet, "generateNewKey").and.returnValue(spenderM.toEmail.key)
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "setPaidToElement")
      spyOn(WalletStore, "setLegacyAddressLabel")
        .and.callFake((add,note,continuation,error) -> continuation())
      spyOn(MyWallet, "backupWallet")
        .and.callFake((method,continuation) -> continuation())
      spyOn(BlockchainAPI, "sendViaEmail")
        .and.callFake((email, tx, privateKey, continuation, error) -> continuation())

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toEmail(spenderM.toEmail.email)

    it "should push the right transaction to the network and store data related toEmail", ->

      # store the toEmail payment address as a legacy address
      expect(WalletStore.setLegacyAddressTag).toHaveBeenCalledWith(spenderM.toEmail.toAddress, 2)
      # set the label and continue the process
      expect(WalletStore.setLegacyAddressLabel).toHaveBeenCalled()
      # make a backup
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # create and push the expected transaction
      txID = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).getId();
      testTx = txID is spenderM.toEmail.txID1 or txID is spenderM.toEmail.txID2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]
      expect(BlockchainAPI.push_tx).toHaveBeenCalled()
      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      # send the email with the private key
      expect(BlockchainAPI.sendViaEmail)
        .toHaveBeenCalledWith( spenderM.toEmail.email
                             , jasmine.any(Object)
                             , spenderM.toEmail.key.toWIF()
                             , jasmine.any(Function)
                             , jasmine.any(Function))
      # save paidto on wallet json
      expect(WalletStore.setPaidToElement).toHaveBeenCalled()
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # success finished
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from Address to Mobile (with second password active)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      # general mocks
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      # from Address mocks
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      # ToEmail Mocks
      spyOn(MyWallet, "generateNewMiniPrivateKey")
        .and.returnValue(spenderM.toMobile.keys)
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "setPaidToElement")
      spyOn(WalletStore, "setLegacyAddressLabel")
        .and.callFake((add,note,continuation,error) -> continuation())
      spyOn(MyWallet, "backupWallet")
        .and.callFake((method,continuation) -> continuation())
      spyOn(BlockchainAPI, "sendViaSMS")
        .and.callFake((mobile, tx, privateKey, continuation, error) -> continuation())

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toMobile(spenderM.toMobile.phone)

    it "should push the right transaction to the network and store data related toMobile", ->

      # store the toEmail payment address as a legacy address
      expect(WalletStore.setLegacyAddressTag).toHaveBeenCalledWith(spenderM.toMobile.toAddress, 2)
      # set the label and continue the process
      expect(WalletStore.setLegacyAddressLabel).toHaveBeenCalled()
      # make a backup
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # create and push the expected transaction
      txID = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).getId();
      testTx = txID is spenderM.toMobile.txID1 or txID is spenderM.toMobile.txID2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]
      expect(BlockchainAPI.push_tx).toHaveBeenCalled()
      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      # send the sms with the mini private key
      expect(BlockchainAPI.sendViaSMS)
        .toHaveBeenCalledWith( spenderM.toMobile.phone
                             , jasmine.any(Object)
                             , spenderM.toMobile.keys.miniKey
                             , jasmine.any(Function)
                             , jasmine.any(Function))
      # since second password is active then encrypt the private keys
      expect(WalletStore.encryptPrivateKey).toHaveBeenCalled()
      # save paidto on wallet json
      expect(WalletStore.setPaidToElement).toHaveBeenCalled()
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # success finished
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from Address to Mobile (without second password)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      # general mocks
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(false)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      # from Address mocks
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.privateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      # ToEmail Mocks
      spyOn(MyWallet, "generateNewMiniPrivateKey")
        .and.returnValue(spenderM.toMobile.keys)
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "setPaidToElement")
      spyOn(WalletStore, "setLegacyAddressLabel")
        .and.callFake((add,note,continuation,error) -> continuation())
      spyOn(MyWallet, "backupWallet")
        .and.callFake((method,continuation) -> continuation())
      spyOn(BlockchainAPI, "sendViaSMS")
        .and.callFake((mobile, tx, privateKey, continuation, error) -> continuation())

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toMobile(spenderM.toMobile.phone)

    it "should push the right transaction to the network and store data related toMobile", ->

      # store the toEmail payment address as a legacy address
      expect(WalletStore.setLegacyAddressTag).toHaveBeenCalledWith(spenderM.toMobile.toAddress, 2)
      # set the label and continue the process
      expect(WalletStore.setLegacyAddressLabel).toHaveBeenCalled()
      # make a backup
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # create and push the expected transaction
      txID = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).getId();
      testTx = txID is spenderM.toMobile.txID1 or txID is spenderM.toMobile.txID2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]
      expect(BlockchainAPI.push_tx).toHaveBeenCalled()
      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      # send the sms with the mini private key
      expect(BlockchainAPI.sendViaSMS)
        .toHaveBeenCalledWith( spenderM.toMobile.phone
                             , jasmine.any(Object)
                             , spenderM.toMobile.keys.miniKey
                             , jasmine.any(Function)
                             , jasmine.any(Function))
      # save paidto on wallet json
      expect(WalletStore.setPaidToElement).toHaveBeenCalled()
      expect(MyWallet.backupWallet).toHaveBeenCalled()
      # success finished
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
# ################################################################################
  describe "from addressSweep to Address", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)

      spyOn(MyWallet, "getBaseFee").and.returnValue(M.fee)
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .addressSweep(M.fromAddress)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.sweepHex
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from PrivateKey to Address (with second password)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)

      spyOn(MyWallet, "getBaseFee").and.returnValue(M.fee)
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "legacyAddressExists").and.returnValue(false)
      spyOn(MyWallet, "addPrivateKey")
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "setLegacyAddressLabel")
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromPrivateKey(M.privKey)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.sweepHex
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(WalletStore.encryptPrivateKey).toHaveBeenCalled()
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
  ################################################################################
  describe "from PrivateKey to Address (without second password)", ->

    M = spenderM.addToAdd
    beforeEach (done) ->
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      spyOn(MyWallet, "getBaseFee").and.returnValue(M.fee)
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "legacyAddressExists").and.returnValue(false)
      spyOn(MyWallet, "addPrivateKey")
      spyOn(WalletStore, "setLegacyAddressTag")
      spyOn(WalletStore, "setLegacyAddressLabel")
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.privateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromPrivateKey(M.privateKey)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.sweepHex
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(WalletStore.encryptPrivateKey).not.toHaveBeenCalled()
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from PrivateKey to Address redeemed address already imported", ->

    M = spenderM.addToAdd
    beforeEach (done) ->
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      spyOn(MyWallet, "getBaseFee").and.returnValue(M.fee)
      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "encryptPrivateKey")
      spyOn(WalletStore, "legacyAddressExists").and.returnValue(true)
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.privateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromPrivateKey(M.privateKey)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.sweepHex
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from HD Account to Address", ->

    M = spenderM.AccountToAdd
    beforeEach (done) ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(false)

      spyOn(WalletStore, "getHDWallet").and.returnValue({getAccount: (idx) ->  M.fromHdAccount[idx]})

      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAccount(M.fromAccount, M.amount, M.fee)
          .toAddress(M.toAddress)

    it "should push the right transaction to the network", ->

      txID = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).getId();
      testTx = txID is M.txHash1 or txID is M.txHash2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]
      expect(BlockchainAPI.push_tx).toHaveBeenCalled()
      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)

      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
################################################################################
  describe "from HD Account to Address", ->

    M = spenderM.AccountToAdd
    beforeEach (done) ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(false)

      spyOn(WalletStore, "getHDWallet").and.returnValue({getAccount: (idx) ->  M.fromHdAccountERROR[idx]})

      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) ->
          success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)

      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAccount(M.fromAccount, M.amount, M.fee)
          .toAddress(M.toAddress)

    it "should call error callback when moving bitcoins within the same account", ->

      expect(obs.success).not.toHaveBeenCalled()
      expect(obs.error).toHaveBeenCalled()
################################################################################

  describe "from Address to HD Account", ->

    M = spenderM.addToAdd
    beforeEach (done) ->

      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
      spyOn(WalletStore, "getPrivateKey")
       .and.returnValue(M.encPrivateKey)
      spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
        .and.returnValue(M.privateKey)
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(WalletStore, "getHDWallet").and.returnValue({getAccount: (idx) ->  M.toHdAccount[idx]})
      spyOn(obs, "success").and.callFake () -> done(); return
      spyOn(obs, "error").and.callFake () -> done(); return

      Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
        .fromAddress(M.fromAddress, M.amount, M.fee)
          .toAccount(0)

    it "should push the right transaction to the network", ->

      txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
      testTx = txHex is M.txHash1 or txHex is M.txHash2
      note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

      expect(testTx).toBeTruthy()
      expect(note).toEqual(M.note)
      expect(obs.success).toHaveBeenCalled()
      expect(obs.error).not.toHaveBeenCalled()
