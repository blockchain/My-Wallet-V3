proxyquire = require('proxyquireify')(require)

stubs = {
}

CoinifyKYC    = proxyquire('../../src/coinify/kyc', stubs)
o = undefined
coinify = undefined

beforeEach ->
  o = {
    id: "id"
    state: "pending"
    externalId: "externalId"
    createTime: "2016-07-07T12:10:19Z"
    updateTime: "2016-07-07T12:11:36Z"
  }
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "KYC", ->

  describe "constructor", ->
    api = {}

    it "must put everything in place", ->
      k = new CoinifyKYC(o, api, null, coinify)
      expect(k._api).toBe(api)
      expect(k._id).toBe(o.id)
      expect(k._iSignThisID).toBe(o.externalId)

    it "should warn if there is an unknown state type", ->
      o.state = "unknown"
      spyOn(window.console, 'warn')
      new CoinifyKYC(o, api, null, coinify)
      expect(window.console.warn).toHaveBeenCalled()
      expect(window.console.warn.calls.argsFor(0)[1]).toEqual('unknown')

  describe "fetch all", ->
    it "should call authGET with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
        authGET: (method, params) -> Promise.resolve([o,o,o,o]),
      }
      spyOn(coinify, "authGET").and.callThrough()

      promise = CoinifyKYC.fetchAll(coinify)
      testCalls = () ->
        expect(coinify.authGET).toHaveBeenCalledWith('kyc')
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)

  describe "refresh", ->
    it "should call authGET with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
      }
      api = {
        authGET: (method) -> Promise.resolve([o,o,o,o]),
      }
      spyOn(api, "authGET").and.callThrough()
      k = new CoinifyKYC(o, api, null, coinify)

      promise = k.refresh()
      testCalls = () ->
        expect(api.authGET).toHaveBeenCalledWith('kyc/' + k._id)
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)

  describe "trigger", ->
    it "should authPOST traders/me/kyc with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
        authPOST: (method) -> Promise.resolve(o),
      }
      spyOn(coinify, "authPOST").and.callThrough()

      promise = CoinifyKYC.trigger(coinify)
      testCalls = () ->
        expect(coinify.authPOST).toHaveBeenCalledWith('traders/me/kyc')
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)

  describe "instance", ->
    k = undefined
    beforeEach ->
      api = {}
      k = new CoinifyKYC(o, api, null, coinify)

    it "should have getters", ->
      expect(k.id).toBe(o.id)
      expect(k.state).toBe(o.state)
      expect(k.iSignThisID).toBe(o.externalId)
      expect(k.createdAt).toEqual(new Date(o.createTime))
      expect(k.updatedAt).toEqual(new Date(o.updateTime))
