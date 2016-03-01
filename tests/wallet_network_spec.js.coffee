proxyquire = require('proxyquireify')(require)

describe "MyWallet", ->

  API =
    retry: (f) ->
      f()
    request: (action, method, data) ->
      new Promise (resolve, reject) ->
        if method == "uuid-generator"
          if API.callFail
            resolve({})
          else
            resolve({uuids: ['1234', '5678']})
        else if method == "wallet"
          if data.method == "recover-wallet"
            if data.captcha == "eH1hs"
              resolve({success: true, message: "Sent email"})
            else
              resolve({success: false, message: "Invalid Captcha"})
          else if data.method == "reset-two-factor-form"
            if data.kaptcha == "eH1hs"
              resolve({success: true, message: "Request Submitted"})
            else
              resolve({success: false, message: "Invalid Captcha"})
        else if method == "wallet/1234"
          if API.callFail
            throw ''
          else
            resolve('done')
        else
          reject('bad call')

    securePost: () ->
      if API.callFail
        return Promise.reject('api call fail')
      else
        return Promise.resolve('api call success')

    securePostCallbacks: (url, data, success, error) ->
      if API.callFail
        return error('api call fail')
      else
        if data.method == "wallet.aes.json"
          if API.badChecksum
            success({payload: 'hex data'})
          else
            success({payload: 'Not modified'})

  WalletCrypto =
    encryptWallet: () ->
      if WalletCrypto.encryptError
        []
      else
        ['encrypted']
    decryptWalletSync: () ->
      if WalletCrypto.decryptError
        throw ''
      else
        'decrypted'
    sha256: (msg) -> msg

  MyWallet =
    wallet:
      defaultPbkdf2Iterations: 10000
      isUpgradedToHD: true



  WalletNetwork = proxyquire('../src/wallet-network', {
    './api': API,
    './wallet-crypto': WalletCrypto,
    './wallet': MyWallet,
  })

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "generateUUIDs", ->
    it "should return two UUIDs", (done) ->
      promise = WalletNetwork.generateUUIDs(2)
      expect(promise).toBeResolvedWith(jasmine.objectContaining(['1234', '5678']), done)

    it "should not be resolved if the API call fails", (done) ->
      API.callFail = true
      promise = WalletNetwork.generateUUIDs(2)
      expect(promise).toBeRejectedWith('Could not generate uuids', done)
      API.callFail = false

  describe "recoverGuid", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST the users email and captcha", (done) ->
      promise = WalletNetwork.recoverGuid("a@b.com", "eH1hs")
      expect(promise).toBeResolved(done)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].email).toEqual('a@b.com')
      expect(API.request.calls.argsFor(0)[2].captcha).toEqual('eH1hs')

    it "should resolve if succesful", (done) ->
      promise = WalletNetwork.recoverGuid("a@b.com", "eH1hs")
      expect(promise).toBeResolvedWith('Sent email', done)

  describe "resendTwoFactorSms", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should GET with resend_code to true", (done) ->
      WalletNetwork.resendTwoFactorSms("1234").then(() -> done())
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].resend_code).toEqual(true)

    it "should not be resolved if the call fails", (done) ->
      API.callFail = true
      promise = WalletNetwork.resendTwoFactorSms("1234")
      expect(promise).toBeRejectedWith('Could not resend two factor sms', done)
      API.callFail = false

  describe "requestTwoFactorReset", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST a captcha and other fields", (done) ->
      promise = WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
      expect(promise).toBeResolved(done)

      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].kaptcha).toEqual("eH1hs")

    it "should resolve if succesful", (done) ->
      promise = WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
      expect(promise).toBeResolvedWith('Request Submitted', done)

    it "should reject if captcha is invalid", (done) ->
      promise  = WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "can't read")
      expect(promise).toBeRejectedWith('Invalid Captcha', done)

  describe "insertWallet", ->

    observers =
      callback: () ->

    beforeEach ->
      spyOn(observers, "callback")

    it "should not go through without a GUID", ->
      try
        WalletNetwork.insertWallet()
      catch e
        expect(e.toString()).toEqual('AssertionError: GUID missing')

    it "should not go through without a shared key", ->
      try
        WalletNetwork.insertWallet("1234")
      catch e
        expect(e.toString()).toEqual('AssertionError: Shared Key missing')

    it "should not go through without a password", ->
      try
        WalletNetwork.insertWallet("1234", "key")
      catch e
        expect(e.toString()).toEqual('AssertionError: Password missing')

    it "should not go through without a callback", ->
      try
        WalletNetwork.insertWallet("1234", "key", "password", {})
      catch e
        expect(e.toString()).toEqual('AssertionError: decryptWalletProgress must be a function')

      try
        WalletNetwork.insertWallet("1234", "key", "password", {}, "sdfsdfs")
      catch e
        expect(e.toString()).toEqual('AssertionError: decryptWalletProgress must be a function')

    it "should not be resolved if the encryption fails", (done) ->
      WalletCrypto.encryptError = true
      promise = WalletNetwork.insertWallet("1234", "key", "password", "badcb", observers.callback)
      expect(promise).toBeRejectedWith('Error encrypting the JSON output', done)
      expect(observers.callback).not.toHaveBeenCalled()

    it "should not be resolved if the decryption fails", (done) ->
      WalletCrypto.decryptError = true
      promise = WalletNetwork.insertWallet("1234", "key", "password", "badcb", observers.callback)
      expect(promise).toBeRejectedWith('', done)
      expect(observers.callback).toHaveBeenCalled()

    it "should not be resolved if the api call fails", (done) ->
      API.callFail = true
      promise = WalletNetwork.insertWallet("1234", "key", "password", "badcb", observers.callback)
      expect(promise).toBeRejected(done)
      expect(observers.callback).toHaveBeenCalled()


    it "should be resolved if the api call does not fails", (done) ->
      promise = WalletNetwork.insertWallet("1234", "key", "password", "badcb", observers.callback)
      expect(promise).toBeResolved(done)
      expect(observers.callback).toHaveBeenCalled()

    afterEach ->
      WalletCrypto.encryptError = false
      WalletCrypto.decryptError = false
      API.callFail = false

  describe "checkWalletChecksum", ->

    observers =
      success: () ->
      error: () ->

    beforeEach ->
      spyOn(observers, "success")
      spyOn(observers, "error")

    it "should not go through without a checksum", ->
      try
        WalletNetwork.checkWalletChecksum()
      catch e
        expect(e.toString()).toEqual('AssertionError: Payload checksum missing')

    it "should go through without callbacks", ->
      WalletNetwork.checkWalletChecksum('payload_checksum')

    it "should be able to fail without callbacks", ->
      API.callFail = true
      WalletNetwork.checkWalletChecksum('payload_checksum')

    it "should go through with callbacks", ->
      WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error)

    it "should not be succeed if the api call fails", ->
      API.callFail = true
      WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error)
      expect(observers.success).not.toHaveBeenCalled()
      expect(observers.error).toHaveBeenCalled()

    it "should not be succeed if the checksum is bad", ->
      API.badChecksum = true
      WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error)
      expect(observers.success).not.toHaveBeenCalled()
      expect(observers.error).toHaveBeenCalled()

    afterEach ->
      API.callFail = false
      API.badChecksum = false
