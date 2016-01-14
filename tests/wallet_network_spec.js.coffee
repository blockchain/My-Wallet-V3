describe "MyWallet", ->
  proxyquire = require('proxyquireify')(require)

  API = {
    retry: (f) ->
      f()
    request: (action, method, data, withCred) ->
      {
        then: (callback) ->
          if method == "uuid-generator"
            callback({uuids: ['1234', '5678']})
          else if method == "wallet"
            if data.method == "recover-wallet"
              callback({success: true, message: "Sent email"})
            else if data.method == "reset-two-factor-form"
              if data.kaptcha == "eH1hs"
                callback({success: true, message: "Request Submitted"})
          {
            catch: (callback) ->
              if method == "wallet"
                if data.method == "reset-two-factor-form"
                  if data.kaptcha != "eH1hs"
                    callback({success: false, message: "Invalid Captcha"})
              {
              }
          }
      }
  }

  WalletNetwork = proxyquire('../src/wallet-network', {
    './api': API,
  })

  Q = require("q")

  callbacks =
    success: () ->
    error: () ->

  beforeEach ->
    spyOn(callbacks, "success")
    spyOn(callbacks, "error")

  describe "generateUUIDs", ->
    it "should return two UUIDs", ->
      WalletNetwork.generateUUIDs(2).then(callbacks.success).catch(callbacks.error)
      jasmine.clock().tick()
      expect(callbacks.success).toHaveBeenCalledWith(["1234", "5678"])

  describe "recoverGuid", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST the users email and captcha", ->
      WalletNetwork.recoverGuid("a@b.com", "eH1hs")
        .then( callbacks.success)
        .catch(callbacks.error)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].email).toEqual('a@b.com')
      expect(API.request.calls.argsFor(0)[2].captcha).toEqual('eH1hs')

    it "should resolve if succesful", ->
      WalletNetwork.recoverGuid("a@b.com", "eH1hs")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()
      expect(callbacks.error).not.toHaveBeenCalled()
      expect(callbacks.success).toHaveBeenCalledWith("Sent email")

  describe "resendTwoFactorSms", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should GET with resend_code to true", ->
      WalletNetwork.resendTwoFactorSms("1234")
        .then( callbacks.success)
        .catch(callbacks.error)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].resend_code).toEqual(true)

  describe "requestTwoFactorReset", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST a captcha and other fields", ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
        .then( callbacks.success)
        .catch(callbacks.error)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].kaptcha).toEqual("eH1hs")

    it "should resolve if succesful", ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()
      expect(callbacks.error).not.toHaveBeenCalled()
      expect(callbacks.success).toHaveBeenCalledWith("Request Submitted")

    it "should reject if captcha is invalid", ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "can't read")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()
      expect(callbacks.error).toHaveBeenCalled()
