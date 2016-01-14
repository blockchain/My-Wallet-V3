proxyquire = require('proxyquireify')(require)

describe "token endpoints", ->
  API = {
    request: (action, method, data, withCred) ->
      new Promise (resolve, reject) ->
        if data.token == "token" || data.token == "authorize-approve-token"
          resolve({success: true, guid: '1234'})
        if data.token == "authorize-approve-token-different-browser"
          if data.confirm_approval?
            resolve({success: true})
          else
            resolve({success: null})
        if data.token == "token-fail-200"
          resolve({success: false, error: "Invalid Token"})
        if data.token == "token-fail-500"
          reject("Server error")
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
      WTE.postTokenEndpoint("method", "token", {})
        .then(() -> done())
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

    it "should call success with the guid", (done) ->
      WTE.postTokenEndpoint("method", "token", {})
        .then((response) ->
          expect(response).toDeepEqual({ success: true, guid: "1234"})
          done()
        )
        .catch(done)

    it "should errorCallback if server returns 500", (done) ->
      WTE.postTokenEndpoint("method", "token-fail-500", {})
        .then(done)
        .catch(() -> done())

    it "should errorCallback message if server returns 200 and {success: false}", (done) ->
      WTE.postTokenEndpoint("method", "token-fail-200", {})
        .then(done)
        .catch((err) ->
          expect(err).toEqual({ success: false, error: 'Invalid Token' })
          done()
        )

  describe "verifyEmail", ->

    it "should submit a token", (done) ->
      spyOn(API, "request").and.callThrough()
      WTE.verifyEmail("token").then(() ->
        expect(API.request).toHaveBeenCalled()
        expect(API.request.calls.argsFor(0)[2].token).toEqual('token')
        done()
      )

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.verifyEmail("token").then(() ->
        expect(WTE.postTokenEndpoint).toHaveBeenCalled()
        expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")
        done()
      )

  describe "unsubscribe", ->

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.unsubscribe("token")
        .then(() ->
          expect(WTE.postTokenEndpoint).toHaveBeenCalled()
          expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")
          done()
        )
        .catch(done)

  describe "resetTwoFactor", ->

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.resetTwoFactor("token")
        .then(() ->
          expect(WTE.postTokenEndpoint).toHaveBeenCalled()
          expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")
          done()
        )
        .catch(done)

  describe "authorizeApprove", ->
    callbacks =
      differentBrowser: () ->

    beforeEach ->
      spyOn(callbacks, "differentBrowser")

    it "shoud call postTokenEndpoint with token", (done) ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.authorizeApprove("token")
        .then(() ->
          expect(WTE.postTokenEndpoint).toHaveBeenCalled()
          expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")
          done()
        )
        .catch(done)

    it "should successCallback if same browser", (done) ->
      WTE.authorizeApprove("authorize-approve-token")
        .then(() -> done())
        .catch(done)

    it "should differentBrowserCallback", (done) ->
      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser)
        .then(() ->
          expect(callbacks.differentBrowser).toHaveBeenCalled()
          done()
        )
        .catch(done)

    it "should pass differentBrowserApproved along", (done) ->

      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, true)
        .then(() ->
          expect(callbacks.differentBrowser).not.toHaveBeenCalled()
          done()
        )
        .catch(done)

    it "should also consider a rejected browser success", (done) ->

      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, false)
        .then(() -> done())
        .catch(done)
