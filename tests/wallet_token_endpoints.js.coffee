proxyquire = require('proxyquireify')(require)

API = {
  request: (action, method, data, withCred) ->
    {
      then: (callback) ->
        if data.token == "token"
          callback({success: true, guid: '1234'})
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

WTE = proxyquire('../src/wallet-token-endpoints', {
   './api': API,
   './helpers': Helpers
})

describe "postTokenEndpoint", ->
  callbacks =
    success: () ->
    error:   () ->

  beforeEach ->
    spyOn(callbacks, "success")
    spyOn(callbacks, "error")

  it "should require a token, success and error callbacks", ->

    expect(() -> WTE.postTokenEndpoint("method")).toThrow()
    expect(() -> WTE.postTokenEndpoint("method", "token")).toThrow()
    expect(() -> WTE.postTokenEndpoint("method", "token", callbacks.succes)).toThrow()
    expect(() -> WTE.postTokenEndpoint("method", "token", {}, callbacks.success, callbacks.error)).not.toThrow()

  it "should submit a token", ->
    spyOn(API, "request").and.callThrough()
    WTE.postTokenEndpoint("method", "token", {}, callbacks.success, callbacks.error)
    expect(API.request).toHaveBeenCalled()
    expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

  it "should call success with the guid", ->
    WTE.postTokenEndpoint("method", "token", {}, callbacks.success, callbacks.error)
    expect(callbacks.success).toHaveBeenCalledWith({ success: true, guid: "1234"})

  it "should errorCallback if server returns 500", ->
    WTE.postTokenEndpoint("method", "token-fail-500", {}, callbacks.success, callbacks.error)
    expect(callbacks.success).not.toHaveBeenCalled()
    expect(callbacks.error).toHaveBeenCalled()

  it "should errorCallback message if server returns 200 and {success: false}", ->
    WTE.postTokenEndpoint("method", "token-fail-200", {}, callbacks.success, callbacks.error)
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
    WTE.verifyEmail("token", callbacks.success, callbacks.error)
    expect(API.request).toHaveBeenCalled()
    expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

  it "shoud call postTokenEndpoint with token", ->
    spyOn(WTE, "postTokenEndpoint")
    WTE.verifyEmail("token", callbacks.success, callbacks.error)
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
    spyOn(WTE, "postTokenEndpoint")
    WTE.unsubscribe("token", callbacks.success, callbacks.error)
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
    spyOn(WTE, "postTokenEndpoint")
    WTE.resetTwoFactor("token", callbacks.success, callbacks.error)
    expect(WTE.postTokenEndpoint).toHaveBeenCalled()
    expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

describe "authorizeApprove", ->
  callbacks =
    success: () ->
    error:   () ->

  beforeEach ->
    spyOn(callbacks, "success")
    spyOn(callbacks, "error")

  it "shoud call postTokenEndpoint with token", ->
    spyOn(WTE, "postTokenEndpoint")
    WTE.authorizeApprove("token", callbacks.success, callbacks.error)
    expect(WTE.postTokenEndpoint).toHaveBeenCalled()
    expect(WTE.postTokenEndpoint.calls.argsFor(0)[1]).toEqual("token")

  it "should successCallback if same browser", ->
    pending()

  it "should differentBrowserCallback", ->
    pending()

  it "should pass differentBrowserApproved along", ->
    pending()
