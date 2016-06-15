proxyquire = require('proxyquireify')(require)

walletStoreGuid = undefined
walletStoreEncryptedWalletData = undefined
WalletStore = {
  setGuid: (guid) ->
     walletStoreGuid = guid
  getGuid: () ->
    walletStoreGuid
  setRealAuthType: () ->
  setSyncPubKeys: () ->
  setLanguage: () ->
  setEncryptedWalletData: (data) ->
    walletStoreEncryptedWalletData = data
  getEncryptedWalletData: () -> walletStoreEncryptedWalletData || "encrypted"
}

BlockchainSettingsAPI = {
  change_language: () ->
  change_local_currency: () ->
}

WalletCrypto = {
  decryptWallet: () ->
}

hdwallet = {
  guid: "1234",
  sharedKey: "shared"
  scanBip44: () -> {
    then: (cb) ->
      cb()
      {
        catch: () ->
      }
  }
}

WalletSignup = {
  generateNewWallet: (inputedPassword, inputedEmail, mnemonic, bip39Password, firstAccountName, successCallback, errorCallback) ->
    successCallback(hdwallet)
}

API =
  securePostCallbacks: () ->
  request: (action, method, data, withCred) ->

WalletNetwork =
  insertWallet: () ->
    console.log(WalletNetwork.failInsertion)
    if WalletNetwork.failInsertion
      new Promise((resolve, reject) -> reject())
    else
      new Promise((resolve) -> resolve())

  establishSession: (token) ->
    then: (cb) ->
      if token != "token"
        token = "new_token"
      cb(token)
      {
        catch: (cb) ->
      }

  fetchWallet: (guid, sessionToken, needsTwoFactorCode, authorizationRequired) ->
    then: (cb) ->
      if guid == "wallet-2fa"
        needsTwoFactorCode(1)
      else if guid == "wallet-email-auth"
        authorizationRequired().then(() ->
          # WalletNetwork proceeds with login and then calls success:
          cb({guid: guid, payload: "encrypted"})
        )
      else if guid == "wallet-email-auth-2fa"
        authorizationRequired().then(() ->
          # WalletNetwork proceeds with login and now asks for 2FA:
          needsTwoFactorCode(1)
        )
      else
        WalletStore.setGuid(guid)
        WalletStore.setEncryptedWalletData("encrypted")
        cb({guid: guid, payload: "encrypted"})
      {
        catch: (cb) ->
      }

  fetchWalletWithSharedKey: (guid) ->
    then: (cb) ->
      WalletStore.setGuid(guid)
      WalletStore.setEncryptedWalletData("encrypted")
      cb({guid: guid, payload: "encrypted"})
      {
        catch: (cb) ->
      }

  fetchWalletWithTwoFactor: (guid, sessionToken, twoFactorCode) ->
    then: (cb) ->
      WalletStore.setGuid(guid)
      WalletStore.setEncryptedWalletData("encrypted")
      cb({guid: guid, payload: "encrypted"})
      {
        catch: (cb) ->
      }

  pollForSessionGUID: (token) ->
    then: (cb) ->
      cb()
      {
        catch: (cb) ->
      }

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
  './wallet-store': WalletStore,
  './wallet-crypto': WalletCrypto,
  './wallet-signup': WalletSignup,
  './api': API,
  './wallet-network' : WalletNetwork,
  'bip39': BIP39,
  './rng' : RNG,
  './blockchain-settings-api' : BlockchainSettingsAPI
}

MyWallet = proxyquire('../src/wallet', stubs)

describe "Wallet", ->

  callbacks = undefined

  beforeEach ->
    JasminePromiseMatchers.install()
    WalletStore.setGuid(undefined)
    WalletStore.setEncryptedWalletData(undefined)

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "makePairingCode()", ->
    success = undefined
    error = undefined

    beforeEach ->
      MyWallet.wallet =
        guid: 'wallet-guid'
        sharedKey: 'shared-key'
      spyOn(API, 'securePostCallbacks').and.callFake((_a, _b, cb) -> cb('enc-phrase'))
      spyOn(WalletStore, 'getPassword').and.returnValue('pw')
      spyOn(WalletCrypto, 'encrypt').and.callFake((d) -> "(enc:#{d})")
      success = jasmine.createSpy('pairing code success')
      error = jasmine.createSpy('pairing code error')

    it "should make a pairing code", ->
      MyWallet.makePairingCode(success, error)
      expect(success).toHaveBeenCalledWith('1|wallet-guid|(enc:shared-key|7077)')
      expect(error).not.toHaveBeenCalled()

    it "should call WalletCrypto.encrypt with the encryption phrase", ->
      MyWallet.makePairingCode(success, error)
      expect(WalletCrypto.encrypt).toHaveBeenCalledWith('shared-key|7077', 'enc-phrase', 10)
      expect(error).not.toHaveBeenCalled()

  describe "login", ->

    callbacks = {
      success: () ->
      needsTwoFactorCode: () ->
      wrongTwoFactorCode: () ->
      authorizationRequired: () ->
      otherError: () ->
    }

    beforeEach ->

      spyOn(MyWallet, "didFetchWallet").and.callFake((obj) ->
        {
          then: (cb) ->
            obj.encrypted = undefined
            cb(obj)
            {
              catch: (cb) ->
            }
        }
      )

      spyOn(MyWallet,"initializeWallet").and.callFake((inputedPassword, didDecrypt, didBuildHD) ->
        {
          then: (cb) ->
            if(inputedPassword == "password")
              cb()
            {
              catch: (cb) ->
                if(inputedPassword != "password")
                  cb("WRONG_PASSWORD")
            }
        }
      )

      spyOn(callbacks, "success")
      spyOn(WalletNetwork, "establishSession").and.callThrough()
      spyOn(callbacks, "wrongTwoFactorCode")
      spyOn(API, "request").and.callThrough()
      spyOn(callbacks, "authorizationRequired").and.callFake((cb) ->
        cb()
      )

    describe "with a shared key", ->
      it "should not not use a session token", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null,
              sharedKey: "shared-key"
          },
          callbacks
        )

        expect(promise).toBeResolved(done)
        expect(WalletNetwork.establishSession).not.toHaveBeenCalled()

      it "should return the guid", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null,
              sharedKey: "shared-key"
          },
          callbacks
        )

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: "1234"}), done)

    describe "without shared key", ->

      it "should use a session token", ->
        MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null
          },
          callbacks
        )

        expect(WalletNetwork.establishSession).toHaveBeenCalled()

      it "should return guid and session token", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null
          },
          callbacks
        )

        expect(promise).toBeResolvedWith(jasmine.objectContaining(
          {guid: "1234", sessionToken: "new_token"}
        ), done)


      it "should reuse an existing session token if provided", ->

        MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null,
              sessionToken: "token"
          },
          callbacks
        )

        expect(WalletNetwork.establishSession).toHaveBeenCalledWith("token")

      it "should not reuse a null token", ->
        MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null,
              sessionToken: undefined
          },
          callbacks
        )

        expect(WalletNetwork.establishSession).not.toHaveBeenCalledWith(null)

      it "should ask for 2FA if applicable and include method and session token", ->
        spyOn(callbacks, "needsTwoFactorCode")

        MyWallet.login(
          "wallet-2fa",
          "password",
          {
              twoFactor: null,
              sessionToken: "token"
          },
          callbacks
        )
        expect(callbacks.needsTwoFactorCode).toHaveBeenCalledWith("token", 1)

    describe "email authoritzation", ->
      promise = undefined

      beforeEach ->
        spyOn(WalletNetwork, "pollForSessionGUID").and.callThrough()

        promise = MyWallet.login(
          "wallet-email-auth",
          "password",
          {
              twoFactor: null,
              sessionToken: "token"
          },
          callbacks
        )

      it "should notify user if applicable", ->
        expect(callbacks.authorizationRequired).toHaveBeenCalled()

      it "should start polling to check for authoritzation, using token", ->
        expect(WalletNetwork.pollForSessionGUID).toHaveBeenCalledWith("token")

      it "should continue login after request is approved", (done) ->
        expect(promise).toBeResolvedWith(jasmine.objectContaining(
          {guid: "wallet-email-auth", sessionToken: "token"}
        ), done)

    describe "email authoritzation and 2FA", ->
      promise = undefined
      beforeEach ->
        spyOn(WalletNetwork, "pollForSessionGUID").and.callThrough()

        promise = MyWallet.login(
          "wallet-email-auth-2fa",
          "password",
          {
              twoFactor: null,
              sessionToken: "token"
          },
          callbacks
        )

      it "should start polling to check for authoritzation, using token", ->
        expect(WalletNetwork.pollForSessionGUID).toHaveBeenCalledWith("token")


      it "should ask for 2FA after email auth", (done) ->
        spyOn(callbacks, "needsTwoFactorCode").and.callFake((token, method) ->
          expect(token).toEqual("token")
          expect(method).toEqual(1)
          done()
        )

    describe "with 2FA", ->
      beforeEach ->
        spyOn(WalletNetwork, "fetchWalletWithTwoFactor").and.callThrough()

      it "should return guid and session token", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: {type: 5, code: "BF399"}
              sessionToken: "token"
          },
          callbacks
        )

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: "1234", sessionToken: "token"}), done)

      it "should call WalletNetwork.fetchWalletWithTwoFactor with the code and session token", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: {type: 5, code: "BF399"}
              sessionToken: "token"
          },
          callbacks
        )

        expect(promise).toBeResolved(done)
        expect(WalletNetwork.fetchWalletWithTwoFactor).toHaveBeenCalled()
        expect(WalletNetwork.fetchWalletWithTwoFactor.calls.argsFor(0)[2]).toEqual(
          {type: 5, code: "BF399"}
        )
        expect(WalletNetwork.fetchWalletWithTwoFactor.calls.argsFor(0)[1]).toEqual("token")


      it "should not call fetchWalletWithTwoFactor() when null", (done) ->
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null
              sessionToken: "token"
          },
          callbacks
        )

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: "1234"}), done)
        expect(WalletNetwork.fetchWalletWithTwoFactor).not.toHaveBeenCalled()

    describe "wrong password", ->
      promise = undefined

      beforeEach ->
        spyOn(WalletNetwork, "fetchWallet").and.callThrough()

        promise = MyWallet.login(
          "1234",
          "wrong_password",
          {
              twoFactor: null
              sessionToken: "token"
          },
          callbacks
        )

      it "should fetch the wallet and throw an error", (done) ->
        expect(promise).toBeRejectedWith("WRONG_PASSWORD", done)
        expect(WalletNetwork.fetchWallet).toHaveBeenCalled()

      it "should not fetch wallet again at the next attempt", (done) ->
        # Second attempt:
        promise = MyWallet.login(
          "1234",
          "password",
          {
              twoFactor: null
              sessionToken: "token"
          },
          callbacks
        )

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: "1234"}), done)
        expect(WalletNetwork.fetchWallet.calls.count()).toEqual(1) # First attempt only

  describe "didFetchWallet", ->
    beforeEach ->
      spyOn(WalletStore, "setEncryptedWalletData").and.callThrough()

    it "should resolve", (done) ->
      promise = MyWallet.didFetchWallet({payload: ""})
      expect(promise).toBeResolved(done)

    it "should update the wallet store", ->
      MyWallet.didFetchWallet({payload: "encrypted"})
      expect(WalletStore.setEncryptedWalletData).toHaveBeenCalled()

    it "should not update the wallet store if there's no payload", ->
      MyWallet.didFetchWallet({})
      MyWallet.didFetchWallet({payload: ""})

      expect(WalletStore.setEncryptedWalletData).not.toHaveBeenCalled()

    it "should not update the wallet store if payload is 'Not modified'", ->
      MyWallet.didFetchWallet({payload: "Not modified"})

      expect(WalletStore.setEncryptedWalletData).not.toHaveBeenCalled()

  describe "initializeWallet", ->
    beforeEach ->
      spyOn(MyWallet, "decryptAndInitializeWallet")

    it "should call decryptAndInitializeWallet()", () ->
      MyWallet.initializeWallet()
      expect(MyWallet.decryptAndInitializeWallet).toHaveBeenCalled()

  describe "decryptAndInitializeWallet", ->
    beforeEach ->
      spyOn(WalletCrypto, "decryptWallet")

    it "should call WalletCrypto.decryptWallet", ->
      MyWallet.decryptAndInitializeWallet((() ->), (() ->))
      expect(WalletCrypto.decryptWallet).toHaveBeenCalled()

  describe "recoverFromMnemonic", ->
    beforeEach ->
      spyOn(WalletSignup, "generateNewWallet").and.callThrough()
      spyOn(WalletStore, "unsafeSetPassword")

    it "should generate a new wallet", ->
      MyWallet.recoverFromMnemonic("a@b.com", "secret", "nuclear bunker sphaghetti monster dim sum sauce", undefined, (() ->))
      expect(WalletSignup.generateNewWallet).toHaveBeenCalled()
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[0]).toEqual("secret")
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[1]).toEqual("a@b.com")
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[2]).toEqual("nuclear bunker sphaghetti monster dim sum sauce")

    it "should call unsafeSetPassword", ->
      MyWallet.recoverFromMnemonic("a@b.com", "secret", "nuclear bunker sphaghetti monster dim sum sauce", undefined, (() ->))
      expect(WalletStore.unsafeSetPassword).toHaveBeenCalledWith("secret")

    it "should pass guid, shared key and password upon success", (done) ->
      obs = {
        success: () ->
      }
      spyOn(obs, "success").and.callThrough()

      MyWallet.recoverFromMnemonic("a@b.com", "secret", "nuclear bunker sphaghetti monster dim sum sauce", undefined, obs.success)

      result = () ->
        expect(obs.success).toHaveBeenCalledWith({ guid: '1234', sharedKey: 'shared', password: 'secret' })
        done()

      setTimeout(result, 1)

    it "should scan address space", ->
      spyOn(hdwallet, "scanBip44").and.callThrough()
      MyWallet.recoverFromMnemonic("a@b.com", "secret", "nuclear bunker sphaghetti monster dim sum sauce", undefined, (() ->))
      expect(hdwallet.scanBip44).toHaveBeenCalled()

  describe "createNewWallet", ->
    beforeEach ->
      spyOn(BIP39, "generateMnemonic").and.callThrough()
      spyOn(RNG, "run").and.callThrough()

    it "should call BIP39.generateMnemonic with our RNG", ->
      w = MyWallet.createNewWallet()
      expect(BIP39.generateMnemonic).toHaveBeenCalled()
      expect(RNG.run).toHaveBeenCalled()

    it "should throw if RNG throws", ->
      # E.g. because there was a network failure.
      # This assumes BIP39.generateMnemonic does not rescue a throw
      # inside the RNG
      RNG.shouldThrow = true
      expect(() -> MyWallet.createNewWallet()).toThrow('Connection failed')
      RNG.shouldThrow = false

    describe "when the wallet insertion fails", ->

      observers = null

      beforeEach (done) ->
        observers =
          success: () -> done()
          error: () -> done()

        spyOn(observers, "success").and.callThrough()
        spyOn(observers, "error").and.callThrough()

        WalletNetwork.failInsertion = true
        MyWallet.createNewWallet('a@b.com', "1234", 'My Wallet', 'en', 'usd', observers.success, observers.error)

      it "should fail", ->
        expect(observers.success).not.toHaveBeenCalled()
        expect(observers.error).toHaveBeenCalled()

      afterEach ->
        WalletNetwork.failInsertion = false
