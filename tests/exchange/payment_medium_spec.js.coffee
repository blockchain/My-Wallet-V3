proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentMedium    = proxyquire('../../src/exchange/payment-medium', stubs)
api = undefined

beforeEach ->
  api = {mock: "api"}

  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

fdescribe "Payment method", ->
  describe "class", ->
    describe "constructor", ->
      it "should keep a reference to the api", ->
        b = new PaymentMedium(api, undefined, {})
        expect(b._api).toEqual(api)

  describe "instance", ->
    p = undefined
    delegate = undefined

    beforeEach ->
      delegate =
        save: () -> Promise.resolve()

      p = new PaymentMedium(api, quote, Trade)

    it "should have getters", ->
      p._inMedium = 'card'
      expect(p.inMedium).toBe('card')
