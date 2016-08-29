proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentMethod    = proxyquire('../../src/coinify/payment-method', stubs)
o = undefined
coinify = undefined

beforeEach ->
  o = {
    inMedium: "inMedium"
    outMedium: "outMedium"
    name: "name"
    inCurrencies: "inCurrencies"
    outCurrencies: "outCurrencies"
    inCurrency: "inCurrency"
    outCurrency: "outCurrency"
    inFixedFee: "inFixedFee"
    outFixedFee: "outFixedFee"
    inPercentageFee: "inPercentageFee"
    outPercentageFee: "outPercentageFee"
  }
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "Payment method", ->

  describe "constructor", ->
    it "must put everything on place", ->
      b = new PaymentMethod(o)
      expect(b._inMedium).toBe(o.inMedium)
      expect(b._outMedium).toBe(o.outMedium)
      expect(b._name).toBe(o.name)
      expect(b._inCurrencies).toBe(o.inCurrencies)
      expect(b._outCurrencies).toBe(o.outCurrencies)
      expect(b._inCurrency).toBe(o.inCurrency)
      expect(b._outCurrency).toBe(o.outCurrency)
      expect(b._inFixedFee).toBe(o.inFixedFee)
      expect(b._outFixedFee).toBe(o.outFixedFee)
      expect(b._inPercentageFee).toBe(o.inPercentageFee)
      expect(b._outPercentageFee).toBe(o.outPercentageFee)

  describe "fetch all", ->
    it "should call get with the correct arguments ", (done) ->
      coinify = {
        GET: (method, params) -> Promise.resolve([o,o,o,o]),
        login: () -> Promise.resolve({access_token: 'my-token', expires_in: 1000})
      }
      spyOn(coinify, "GET").and.callThrough()
      spyOn(coinify, "login").and.callThrough()

      promise = PaymentMethod.fetchAll('EUR', 'BTC', coinify)
      argument = {
        inCurrency: 'EUR',
        outCurrency: 'BTC'
      }
      testCalls = () ->
        expect(coinify.GET).toHaveBeenCalledWith('trades/payment-methods', argument)
      promise
        .then(testCalls)
        .then(done)
