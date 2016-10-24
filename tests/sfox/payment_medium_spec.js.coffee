proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentMedium    = proxyquire('../../src/sfox/payment-medium', stubs)

sfox = undefined
b = undefined
quote = undefined
api = {}


beforeEach ->
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "SFOX Payment Medium", ->

  describe "constructor", ->
    quote = undefined

    beforeEach ->
      quote = {baseAmount: -1000}

    it "should store the medium", ->
      b = new PaymentMedium(undefined, api, quote)
      expect(b.inMedium).toBe('ach')
      expect(b.outMedium).toBe('blockchain')

    it "should set fee, given a quote", ->
      b = new PaymentMedium(undefined, api, quote)
      expect(b.fee).toEqual(0)

    it "should set total, given a quote", ->
      b = new PaymentMedium(undefined, api, quote)
      expect(b.total).toEqual(1000)

  describe "fetch all", ->
    it "should return an array of one", () ->
      promise = PaymentMedium.getAll('USD', 'BTC', api, quote)
      expect(promise).toBeResolvedWith([{}])
