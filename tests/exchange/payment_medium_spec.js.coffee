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

describe "Payment Medium", ->
  describe "class", ->
    describe "constructor", ->
      it "should keep a reference to the api", ->
        b = new PaymentMedium(api, undefined, {})
        expect(b._api).toEqual(api)

  describe "instance", ->
    p = undefined
    delegate = undefined

    beforeEach ->
      quote = {}

      delegate =
        save: () -> Promise.resolve()

      p = new PaymentMedium(api, quote)

    it "should have getters", ->
      p._id = '1234'
      expect(p.id).toBe('1234')
