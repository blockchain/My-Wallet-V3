proxyquire = require('proxyquireify')(require)

stubs = {
}

CoinifyKYC    = proxyquire('../../src/coinify/kyc', stubs)
o = undefined
coinify = undefined

beforeEach ->
  o = {
    id: "id"
    state: "state"
    externalId: "externalId"
  }
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "KYC", ->

  describe "constructor", ->
    it "must put everything in place", ->
      api = {}
      k = new CoinifyKYC(o, api)
      expect(k._api).toBe(api)
      expect(k._id).toBe(o.id)
      expect(k._iSignThisID).toBe(o.externalId)

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
        authGET: (method) -> Promise.resolve([o,o,o,o]),
      }
      spyOn(coinify, "authGET").and.callThrough()
      k = new CoinifyKYC(o, coinify)

      promise = k.refresh()
      testCalls = () ->
        expect(coinify.authGET).toHaveBeenCalledWith('kyc/' + k._id)
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
