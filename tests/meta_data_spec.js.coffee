proxyquire = require('proxyquireify')(require)

metaDataSharedKey = "1234"

jsonObject = {version: 1, iv: "tc/+ZZYqawtMyWcvnn2ss1H9Vti8kDOLvPh/nb/JNy8=", payload: "qNrWtmU4CfWTy1UM7L+dtA=="}
didYouKnows = [1,2,3]

API =
  request: (action, method, data, withCredentials, syncBool, extraHeaders) ->
    then: (resolve, reject) ->
      if action == "GET" && method.split("/").pop() == "alerts"
        resolve(jsonObject)
      else
        resolve()
      {
        catch: (reason) ->
          # Nothing to do here
      }
   
stubs =
  './api': API
  './wallet-crypto':
    decryptMetaData: (encrypted) ->
      if encrypted == jsonObject
        return didYouKnows
      else
        return null
    encryptMetaData: (obj) ->
      if obj == didYouKnows
        return jsonObject
      else
        return null
  './wallet':
    wallet:
      metaDataKey: "YiVGNZY/Wi2bS7LQyCpOSF3FHwWQe/pcsVi4wmPjing="
      metaDataSharedKey: metaDataSharedKey

obs = undefined


proxyquire.preserveCache = false

MetaData = proxyquire('../src/meta-data', stubs)


describe "MetaData", ->
  beforeEach ->
    MetaData._reset()

  describe "setEndpoint()", ->
    it "should allow a custom endpoint", ->
      expect(typeof(MetaData.setEndpoint)).toBe("function")

  describe "updateEndpoint()", ->
    beforeEach ->
      spyOn(API,"request").and.callThrough()

      obs =
        success: () ->

      MetaData._updateEndpoint("alerts", didYouKnows)

    it "should send the latest payload", ->
      expect(API.request).toHaveBeenCalled()

    it "should encrypt the payload", ->
      MetaData._updateEndpoint("alerts", didYouKnows, obs.success)

      expect(API.request.calls.argsFor(0)[2]).toBe jsonObject

    it "should identify using shared key", ->
      expect(API.request.calls.argsFor(0)[5]).toEqual({ 'X-Blockchain-Shared-Key': metaDataSharedKey })

  describe "fetchEndpoint()", ->
    beforeEach ->
      spyOn(API,"request").and.callThrough()

      obs =
        success: () ->

    it "should fetch the latest encrypted payload", ->
      MetaData._fetchEndpoint("alerts")

      expect(API.request).toHaveBeenCalled()

    it "should decrypt the payload", ->
      spyOn(obs,"success").and.callThrough()

      MetaData._fetchEndpoint("alerts", obs.success)
      
      expect(obs.success).toHaveBeenCalledWith(didYouKnows)

    it "should identify using shared key", ->
      MetaData._fetchEndpoint("alerts")

      expect(API.request.calls.argsFor(0)[5]).toEqual({ 'X-Blockchain-Shared-Key': metaDataSharedKey })

  describe "getSeenDidYouKnows()", ->
    it "should fetch from server if not done so already", ->
      spyOn(MetaData, "_fetchEndpoint").and.callFake((name, success) ->
        success([1]))

      MetaData.getSeenDidYouKnows()
      expect(MetaData._fetchEndpoint).toHaveBeenCalled()

      MetaData.getSeenDidYouKnows()

      expect(MetaData._fetchEndpoint.calls.count()).toEqual(1)

    it 'should return an empty array if endpoint returns 404', ->
      spyOn(MetaData, "_fetchEndpoint").and.callFake((name, success, error) ->
        error({code: 404})
      )

      obs =
        success: () ->

      spyOn(obs, "success")

      MetaData.getSeenDidYouKnows(obs.success)

      expect(obs.success).toHaveBeenCalledWith([])


  describe "markDidYouKnowSeen()", ->
    it "should call getSeenDidYouKnows() not done so already", ->

      spyOn(MetaData, "_fetchEndpoint").and.callFake((name, success) ->
        success([]))

      spyOn(MetaData, "getSeenDidYouKnows").and.callThrough()
      MetaData.seenDidYouKnow(4)
      expect(MetaData.getSeenDidYouKnows).toHaveBeenCalled()

      MetaData.seenDidYouKnow(5)
      expect(MetaData.getSeenDidYouKnows.calls.count()).toEqual(1)

    it "should add it to the array and save", ->
      spyOn(MetaData, "getSeenDidYouKnows").and.callFake((success) ->
        success([1,2,3])
      )

      spyOn(MetaData, "_updateEndpoint")
      MetaData.seenDidYouKnow(4)
      expect(MetaData._updateEndpoint).toHaveBeenCalled()
      expect(MetaData._updateEndpoint.calls.argsFor(0)[1]).toContain(4)


    it "should not save a duplicate", ->
      spyOn(MetaData, "getSeenDidYouKnows").and.callFake((success) ->
        success([1,2,3])
      )
      spyOn(MetaData, "_updateEndpoint")
      MetaData.seenDidYouKnow(3)
      expect(MetaData._updateEndpoint).not.toHaveBeenCalled()
