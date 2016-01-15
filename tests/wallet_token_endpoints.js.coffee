proxyquire = require('proxyquireify')(require)

describe "token endpoints", ->
  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  API = {
    request: (action, method, data, withCred) ->
      new Promise (resolve, reject) ->
        if data.token == "token" || data.token == "authorize-approve-token"
          resolve({success: true, guid: '1234'})
        else if data.token == "authorize-approve-token-different-browser"
          if data.confirm_approval?
            resolve({success: true})
          else
            resolve({success: null})
        else if data.token == "token-fail-200"
          resolve({success: false, error: "Invalid Token"})
        else if data.token == "token-fail-500"
          reject("Server error")
        else
          reject("Unknown")
  }

  Helpers = {}

  WTE = proxyquire('../src/wallet-token-endpoints', {
     './api': API,
     './helpers': Helpers
  })

  describe "postTokenEndpoint", ->

    beforeEach ->
      spyOn(API, "request").and.callThrough()

    it "should require a token and extra params", ->
      expect(() -> WTE.postTokenEndpoint("method")).toThrow()
      expect(() -> WTE.postTokenEndpoint("method", "token")).toThrow()
      expect(() -> WTE.postTokenEndpoint("method", "token", {})).not.toThrow()

    it "should submit a token", (done) ->
      promise = WTE.postTokenEndpoint("method", "token", {})
      expect(promise).toBeResolved(done)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

    it "should call success with the guid", (done) ->
      promise = WTE.postTokenEndpoint("method", "token", {})
      expect(promise).toBeResolvedWith(jasmine.objectContaining({ success: true, guid: "1234"}), done)

    it "should errorCallback if server returns 500", (done) ->
      promise = WTE.postTokenEndpoint("method", "token-fail-500", {})
      expect(promise).toBeRejectedWith('Server error', done)

    it "should errorCallback message if server returns 200 and {success: false}", (done) ->
      promise = WTE.postTokenEndpoint("method", "token-fail-200", {})
      expect(promise).toBeRejectedWith(jasmine.objectContaining({ success: false, error: 'Invalid Token' }), done)

  describe "verifyEmail", ->

    it "should submit a token", (done) ->
      spyOn(API, "request").and.callThrough()
      promise = WTE.verifyEmail("token")
      expect(promise).toBeResolved(done)

      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      promise = WTE.verifyEmail("token")
      expect(promise).toBeResolved(done)

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "unsubscribe", ->

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      promise = WTE.unsubscribe("token")
      expect(promise).toBeResolved(done)

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "resetTwoFactor", ->

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      promise = WTE.resetTwoFactor("token")
      expect(promise).toBeResolved(done)

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "authorizeApprove", ->
    callbacks =
      differentBrowser: () ->

    beforeEach ->
      spyOn(callbacks, "differentBrowser")

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      promise = WTE.authorizeApprove("token")
      expect(promise).toBeResolved(done)

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

    it "should resolve if same browser", (done) ->
      promise = WTE.authorizeApprove("authorize-approve-token")
      expect(promise).toBeResolvedWith(jasmine.objectContaining({ success: true, guid: "1234"}), done)

    it "should differentBrowserCallback", (done) ->
      promise = WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser)
        .then(() ->
          expect(callbacks.differentBrowser).toHaveBeenCalled()
        )
      expect(promise).toBeResolved(done)

    it "should pass differentBrowserApproved along", (done) ->

      promise = WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, true)
        .then(() ->
          expect(callbacks.differentBrowser).not.toHaveBeenCalled()
        )
      expect(promise).toBeResolved(done)

    it "should also consider a rejected browser success", (done) ->

      promise = WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, false)
      expect(promise).toBeResolvedWith(jasmine.objectContaining({ success: true}),done)
