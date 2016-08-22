proxyquire = require('proxyquireify')(require)

stubs = {
}

ExchangeRate    = proxyquire('../../src/coinify/exchange-rate', stubs)

describe "Coinify: Exchange Rate", ->

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "constructor", ->
    it "coinify reference must be preserved", ->
      fakeCoinify = {}
      e = new ExchangeRate(fakeCoinify)
      expect(e._coinify).toBe(fakeCoinify)

  describe "get", ->
    it "must obtain the right rate", (done) ->

      coinify = {
        GET: (method, object) -> {
          then: (cb) ->
            cb({ rate: 1000 })
        }
      }

      baseC = 'litecoin'
      quoteC = 'dogecoin'
      e = new ExchangeRate(coinify)
      promise = e.get(baseC, quoteC)
      expect(promise).toBeResolvedWith(1000, done)

  describe "get", ->
    it "coinify.GET must be called", (done) ->
      coinify = {
        GET: (method, object) -> {
          then: (cb) ->
            cb({ rate: 1000 })
        }
      }
      spyOn(coinify, "GET").and.callThrough()
      baseC = 'litecoin'
      quoteC = 'dogecoin'
      e = new ExchangeRate(coinify)
      promise = e.get(baseC, quoteC)
      argument = {
        baseCurrency: baseC,
        quoteCurrency: quoteC
      }
      testCalls = () ->
        expect(coinify.GET).toHaveBeenCalledWith('rates/approximate', argument)
      promise
        .then(testCalls)
        .then(done)
