proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentMethod    = proxyquire('../../src/exchange/payment-method', stubs)
api = undefined

beforeEach ->
  api = {mock: "api"}

  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "Payment method", ->

  describe "constructor", ->
    it "should keep a reference to the api", ->
      b = new PaymentMethod(api)
      expect(b._api).toEqual(api)

    describe "instance", ->
      it "should have getters", ->
        b = new PaymentMethod(api)
        b._inMedium = 'card'
        expect(b.inMedium).toBe('card')
