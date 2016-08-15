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
    it "must put everything on place", ->
      coinify = {}
      k = new CoinifyKYC(o, coinify)
      expect(k._coinify).toBe(coinify)
      expect(k._id).toBe(o.id)
      expect(k._iSignThisID).toBe(o.externalId)

  describe "fetch all", ->
    it "should call GET with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
        GET: (method, params) -> Promise.resolve([o,o,o,o]),
        login: () -> Promise.resolve({access_token: 'my-token', expires_in: 1000})
      }
      spyOn(coinify, "GET").and.callThrough()
      spyOn(coinify, "login").and.callThrough()

      promise = CoinifyKYC.fetchAll(coinify)
      testCalls = () ->
        expect(coinify.GET).toHaveBeenCalledWith('kyc')
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)

  describe "refresh", ->
    it "should call GET with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
        GET: (method) -> Promise.resolve([o,o,o,o]),
        login: () -> Promise.resolve({access_token: 'my-token', expires_in: 1000})
      }
      spyOn(coinify, "GET").and.callThrough()
      spyOn(coinify, "login").and.callThrough()
      k = new CoinifyKYC(o, coinify)

      promise = k.refresh()
      testCalls = () ->
        expect(coinify.GET).toHaveBeenCalledWith('kyc/' + k._id)
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)

  describe "trigger", ->
    it "should call GET with the correct arguments ", (done) ->

      coinify = {
        _kycs: []
        POST: (method) -> Promise.resolve(o),
        login: () -> Promise.resolve({access_token: 'my-token', expires_in: 1000})
      }
      spyOn(coinify, "POST").and.callThrough()
      spyOn(coinify, "login").and.callThrough()

      promise = CoinifyKYC.trigger(coinify)
      testCalls = () ->
        expect(coinify.POST).toHaveBeenCalledWith('traders/me/kyc')
      promise
        .then(testCalls)
        .then(done)
        .catch(console.log)
