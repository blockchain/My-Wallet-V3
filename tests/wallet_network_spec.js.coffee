describe "MyWallet", ->
  proxyquire = require('proxyquireify')(require)

  API = {
    retry: (f) ->
      f()
    request: (action, method, data, withCred) ->
      new Promise (resolve, reject) ->
        if method == "uuid-generator"
          resolve({uuids: ['1234', '5678']})
        else if method == "wallet"
          if data.method == "recover-wallet"
            resolve({success: true, message: "Sent email"})
          else if data.method == "reset-two-factor-form"
            if data.kaptcha == "eH1hs"
              resolve({success: true, message: "Request Submitted"})
            else
              reject({success: false, message: "Invalid Captcha"})
        else
          resolve('done')
  }

  WalletNetwork = proxyquire('../src/wallet-network', {
    './api': API,
  })

  describe "generateUUIDs", ->
    it "should return two UUIDs", (done) ->
      WalletNetwork.generateUUIDs(2)
        .then((response) ->
          expect(response).toEqual(["1234", "5678"])
          done()
        )
        .catch(done)

  describe "recoverGuid", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST the users email and captcha", (done) ->
      WalletNetwork.recoverGuid("a@b.com", "eH1hs").then(() -> done())
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].email).toEqual('a@b.com')
      expect(API.request.calls.argsFor(0)[2].captcha).toEqual('eH1hs')

    it "should resolve if succesful", (done) ->
      WalletNetwork.recoverGuid("a@b.com", "eH1hs")
        .then((response) ->
          expect(response).toEqual('Sent email')
          done()
        )
        .catch(done)

  describe "resendTwoFactorSms", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should GET with resend_code to true", (done) ->
      WalletNetwork.resendTwoFactorSms("1234").then(() -> done())
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].resend_code).toEqual(true)

  describe "requestTwoFactorReset", ->
    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should POST a captcha and other fields", (done) ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
        .then(() -> done())
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].kaptcha).toEqual("eH1hs")

    it "should resolve if succesful", (done) ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "eH1hs")
        .then((response) ->
          expect(response).toEqual("Request Submitted")
          done()
        )
        .catch(done)

    it "should reject if captcha is invalid", (done) ->
      WalletNetwork.requestTwoFactorReset("1234", "a@b.com", "", "", "Hi support", "can't read")
        .then(done)
        .catch(() -> done())
