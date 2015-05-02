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
RSVP = require('RSVP')
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

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)

      prepare = new Spender(null, (()->), (()->), null, null)

      expect(typeof(prepare.fromAccount)).toEqual("function")
      expect(typeof(prepare.fromAddress)).toEqual("function")
      expect(typeof(prepare.addressSweep)).toEqual("function")

    it "should create all (to) methods", ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      fromAddress = new Spender(null, (()->), (()->), null, null)
                          .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 10, 10)

      expect(typeof(fromAddress.toAddress)).toEqual("function")
      expect(typeof(fromAddress.toAccount)).toEqual("function")
      expect(typeof(fromAddress.toMobile)).toEqual("function")
      expect(typeof(fromAddress.toEmail)).toEqual("function")

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
################################################################################
# TODO
  # describe "from Address to Email", ->

  #   M = spenderM.addToAdd
  #   beforeEach (done) ->

  #     spyOn(BlockchainAPI, "get_unspent")
  #       .and.callFake((xpubList,success,error,conf,nocache) -> success(M.coins))
  #     spyOn(WalletStore, "getPrivateKey")
  #      .and.returnValue(M.encPrivateKey)
  #     spyOn(WalletCrypto, "decryptSecretWithSecondPassword")
  #       .and.returnValue(M.privateKey)
  #     spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
  #     spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
  #     spyOn(obs, "success").and.callFake () -> done(); return
  #     spyOn(obs, "error").and.callFake () -> done(); return

  #     Spender(M.note, obs.success, obs.error, obs.listener, obs.getPassword)
  #       .fromAddress(M.fromAddress, M.amount, M.fee)
  #         .toEmail("fotli@pou.cat")

  #   it "should push the right transaction to the network", ->

  #     txHex = (BlockchainAPI.push_tx.calls.argsFor(0)[0]).toHex()
  #     testTx = txHex is M.txHash1 or txHex is M.txHash2
  #     note = BlockchainAPI.push_tx.calls.argsFor(0)[1]

  #     expect(testTx).toBeTruthy()
  #     expect(note).toEqual(M.note)
  #     expect(obs.success).toHaveBeenCalled()
  #     expect(obs.error).not.toHaveBeenCalled()
################################################################################
