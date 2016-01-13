proxyquire = require('proxyquireify')(require)

describe "token endpoints", ->
  API = {
    request: (action, method, data, withCred) ->
      {
        then: (callback) ->
          if data.token == "token" || data.token == "authorize-approve-token"
            callback({success: true, guid: '1234'})
          if data.token == "authorize-approve-token-different-browser"
            if data.confirm_approval?
              callback({success: true})
            else
              callback({success: null})
          if data.token == "token-fail-200"
            callback({success: false, error: "Invalid Token"})
          {
            catch: (callback) ->
              if data.token == "token-fail-500"
                callback("Server error")
              {
              }
          }
      }
  }

  Helpers = {}

  Q = require("q")

  WTE = proxyquire('../src/wallet-token-endpoints', {
     './api': API,
     './helpers': Helpers
  })
  
  jasmine.clock().install()

  describe "postTokenEndpoint", ->
    callbacks =
      success: () ->
      error:   () ->

    beforeEach ->
      spyOn(API, "request").and.callThrough()
      spyOn(callbacks, "success")
      spyOn(callbacks, "error")

    it "should require a token and extra params", ->
      expect(() -> WTE.postTokenEndpoint("method")).toThrow()
      expect(() -> WTE.postTokenEndpoint("method", "token")).toThrow()
      expect(() -> WTE.postTokenEndpoint("method", "token", {})).not.toThrow()

    it "should submit a token", ->
      WTE.postTokenEndpoint("method", "token", {})
        .then( callbacks.success)
        .catch(callbacks.error)
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

    it "should call success with the guid", () ->
      WTE.postTokenEndpoint("method", "token", {})
        .then(callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.success).toHaveBeenCalledWith({ success: true, guid: "1234"})

    it "should errorCallback if server returns 500", () ->
      WTE.postTokenEndpoint("method", "token-fail-500", {})
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.error).toHaveBeenCalled()

    it "should errorCallback message if server returns 200 and {success: false}", ->
      WTE.postTokenEndpoint("method", "token-fail-200", {})
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.success).not.toHaveBeenCalled()
      expect(callbacks.error).toHaveBeenCalledWith({ success: false, error: 'Invalid Token' })

  describe "verifyEmail", ->
    callbacks =
      success: () ->
      error:   () ->

    beforeEach ->
      spyOn(callbacks, "success")
      spyOn(callbacks, "error")

    it "should submit a token", ->
      spyOn(API, "request").and.callThrough()
      WTE.verifyEmail("token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

    it "shoud call postTokenEndpoint with token", ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.verifyEmail("token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "unsubscribe", ->
    callbacks =
      success: () ->
      error:   () ->

    beforeEach ->
      spyOn(callbacks, "success")
      spyOn(callbacks, "error")

    it "shoud call postTokenEndpoint with token", ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.unsubscribe("token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "resetTwoFactor", ->
    callbacks =
      success: () ->
      error:   () ->

    beforeEach ->
      spyOn(callbacks, "success")
      spyOn(callbacks, "error")

    it "shoud call postTokenEndpoint with token", ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.resetTwoFactor("token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  describe "authorizeApprove", ->
    callbacks =
      success: () ->
      error:   () ->
      differentBrowser: () ->

    beforeEach ->
      spyOn(callbacks, "success")
      spyOn(callbacks, "error")
      spyOn(callbacks, "differentBrowser")

    it "shoud call postTokenEndpoint with token", ->
      spyOn(WTE, "postTokenEndpoint").and.callThrough()
      WTE.authorizeApprove("token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(WTE.postTokenEndpoint).toHaveBeenCalled()
      expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

    it "should successCallback if same browser", ->
      WTE.authorizeApprove("authorize-approve-token")
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.success).toHaveBeenCalled()

    it "should differentBrowserCallback", ->
      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser)
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.differentBrowser).toHaveBeenCalled()
      expect(callbacks.success).not.toHaveBeenCalled()
      expect(callbacks.error).not.toHaveBeenCalled()

    it "should pass differentBrowserApproved along", ->

      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, true)
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.success).toHaveBeenCalled()
      expect(callbacks.differentBrowser).not.toHaveBeenCalled()

    it "should also consider a rejected browser success", ->

      WTE.authorizeApprove("authorize-approve-token-different-browser", callbacks.differentBrowser, false)
        .then( callbacks.success)
        .catch(callbacks.error)

      jasmine.clock().tick()

      expect(callbacks.success).toHaveBeenCalled()
