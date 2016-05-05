proxyquire = require('proxyquireify')(require)


WalletNetwork =
  generateUUIDs: () ->
    if WalletNetwork.generateBadUUIDs
      new Promise((resolve) -> resolve(['a8098c1a-f8', 'b77e160355e']))
    else
      new Promise((resolve) -> resolve(['a8098c1a-f86e-11da-bd1a-00112444be1e', '6fa459ea-ee8a-3ca4-894e-db77e160355e']))
  insertWallet: () ->
    if WalletNetwork.failInsertion
      new Promise((resolve, reject) -> reject())
    else
      new Promise((resolve) -> resolve())

Wallet =
  new: (guid, sharedKey, mnemonic, bip39Password, firstAccountLabel, success, error) -> success()

stubs =
  './blockchain-wallet': Wallet
  './wallet-network': WalletNetwork

WalletSignup = proxyquire('../src/wallet-signup', stubs)


describe "WalletSignup", ->

  describe "generateNewWallet", ->

    observers = null

    it "should not generate a wallet with a password longer than 256 chars", ->
      password = (new Array(1024)).join("x")
      expect(() -> WalletSignup.generateNewWallet(password, 'a@a.co', undefined, undefined, 'My Wallet')).toThrow()

    describe "it should not generate a wallet with bad UUIDs", ->

      beforeEach (done) ->
        observers =
          success: () -> done()
          error: () -> done()
          progress: () ->

        spyOn(observers, "success").and.callThrough()
        spyOn(observers, "error").and.callThrough()
        spyOn(observers, "progress")

        WalletNetwork.generateBadUUIDs = true
        WalletSignup.generateNewWallet('pass', 'a@a.co', undefined, undefined, 'My Wallet', observers.success, observers.error, observers.progress)

      it "", ->
        expect(observers.success).not.toHaveBeenCalled()
        expect(observers.error).toHaveBeenCalled()
        expect(observers.progress).toHaveBeenCalled()

        WalletNetwork.generateBadUUIDs = false

    describe "should generate a wallet when all conditions are met", ->

      observers = null

      beforeEach (done) ->
        observers =
          success: () -> done()
          error: () -> done()
          progress: () ->

        spyOn(observers, "success").and.callThrough()
        spyOn(observers, "error").and.callThrough()
        spyOn(observers, "progress")

        WalletSignup.generateNewWallet('totot', 'a@a.co', undefined, undefined, 'My Wallet', observers.success, observers.error, observers.progress)

      it "", ->
        expect(observers.success).toHaveBeenCalled()
        expect(observers.error).not.toHaveBeenCalled()
        expect(observers.progress).toHaveBeenCalled()

    describe "should fail when the wallet insertion fails", ->

      observers = null

      beforeEach (done) ->
        observers =
          success: () -> done()
          error: () -> done()
          progress: () ->

        spyOn(observers, "success").and.callThrough()
        spyOn(observers, "error").and.callThrough()
        spyOn(observers, "progress")

        WalletNetwork.failInsertion = true
        WalletSignup.generateNewWallet('totot', 'a@a.co', undefined, undefined, 'My Wallet', observers.success, observers.error, observers.progress)

      it "", ->
        expect(observers.success).not.toHaveBeenCalled()
        expect(observers.error).toHaveBeenCalled()
        expect(observers.progress).toHaveBeenCalled()

        WalletNetwork.failInsertion = false
