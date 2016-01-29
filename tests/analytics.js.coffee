proxyquire = require('proxyquireify')(require)

describe "analytics", ->

  API = {
    request: (action, method, data, withCred) ->
      # new Promise (resolve, reject) ->
      # Not using an actual promise here, because the tests are synchronous,
      # which is because the methods don't return promises.
      {
        then: (cb) ->
          if data.hashed_guid == "guid|sha256"
            cb({success: true})
          {
            catch: (cb) ->
              if data.hashed_guid == "guid|sha256"
                # Handled by 'then'
              else if data.hashed_guid == "guid-fail-200|sha256"
                cb({success: false, error: "Some reason"})
              else if data.hashed_guid == "guid-fail-500|sha256"
                cb("Server error")
              else
                cb("Unknown")
          }
      }
  }

  CryptoJS = {
    SHA256: (input) -> {
      toString: () ->
        input + "|sha256"
    }
  }

  Analytics = proxyquire('../src/analytics', {
     './api': API,
     'crypto-js' : CryptoJS
  })

  describe "postEvent", ->

    beforeEach ->
      spyOn(API, "request").and.callThrough()
      spyOn(window.console, "log")

    it "should require a guid and event name", ->
      expect(() -> Analytics.postEvent()).toThrow()
      expect(() -> Analytics.postEvent("event")).toThrow()
      expect(() -> Analytics.postEvent("event", "guid", {})).not.toThrow()

    it "should not return a promise", ->
      res = Analytics.postEvent("event", "guid")
      expect(res).not.toBeDefined()

    it "should submit the event", ->
      Analytics.postEvent("event", "guid")
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].name).toEqual('event')

    it "should submit the hashed guid", ->
      Analytics.postEvent("event", "guid")
      expect(API.request).toHaveBeenCalled()
      expect(API.request.calls.argsFor(0)[2].hashed_guid).toEqual('guid|sha256')

    it "should not log to the console if all goes well", ->
      Analytics.postEvent("event", "guid")
      expect(window.console.log).not.toHaveBeenCalled()

    it "should log to the console if server returns 500", (done) ->
      Analytics.postEvent("event", "guid-fail-500")
      expect(window.console.log).toHaveBeenCalled()
      done()

    it "should log to the console if server returns 200 and {success: false}",->
        Analytics.postEvent("event", "guid-fail-200")
        expect(window.console.log).toHaveBeenCalled()

  describe "walletCreated", ->
    it "shoud call postEvent with create_v3 and guid", ->
      spyOn(Analytics, "postEvent").and.callThrough()
      promise = Analytics.walletCreated("guid")

      expect(Analytics.postEvent).toHaveBeenCalled()
      expect(Analytics.postEvent.calls.argsFor(0)[0]).toEqual("create_v3")
      expect(Analytics.postEvent.calls.argsFor(0)[1]).toEqual("guid")


  describe "walletUpgraded", ->
    it "shoud call postEvent with guid and upgrade_v3", ->
      spyOn(Analytics, "postEvent").and.callThrough()
      promise = Analytics.walletUpgraded("guid")

      expect(Analytics.postEvent).toHaveBeenCalled()
      expect(Analytics.postEvent.calls.argsFor(0)[0]).toEqual("upgrade_v3")
      expect(Analytics.postEvent.calls.argsFor(0)[1]).toEqual("guid")
