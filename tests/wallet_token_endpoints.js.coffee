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


describe "verifyEmail", ->
  callbacks =
    success: () ->
    error:   () ->

  beforeEach ->
    spyOn(callbacks, "success")
    spyOn(callbacks, "error")

  it "should require a token, success and error callbacks", ->

    expect(() -> WTE.verifyEmail()).toThrow()
    expect(() -> WTE.verifyEmail("token")).toThrow()
    expect(() -> WTE.verifyEmail("token", callbacks.succes)).toThrow()
    expect(() -> WTE.verifyEmail("token", callbacks.success, callbacks.error)).not.toThrow()

  it "should submit a token", ->
    spyOn(API, "request").and.callThrough()
    WTE.verifyEmail("token", callbacks.success, callbacks.error)
    expect(API.request).toHaveBeenCalled()
    expect(API.request.calls.argsFor(0)[2].token).toEqual('token')

  it "should call success with the guid", ->
    WTE.verifyEmail("token", callbacks.success, callbacks.error)
    expect(callbacks.success).toHaveBeenCalledWith("1234")

  it "should errorCallback if server returns 500", ->
    WTE.verifyEmail("token-fail-500", callbacks.success, callbacks.error)
    expect(callbacks.success).not.toHaveBeenCalled()
    expect(callbacks.error).toHaveBeenCalled()

  it "should errorCallback message if server returns 200 and {success: false}", ->
    WTE.verifyEmail("token-fail-200", callbacks.success, callbacks.error)
    expect(callbacks.success).not.toHaveBeenCalled()
    expect(callbacks.error).toHaveBeenCalledWith("Invalid Token")
