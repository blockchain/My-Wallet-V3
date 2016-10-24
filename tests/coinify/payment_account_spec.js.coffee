proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentAccount    = proxyquire('../../src/coinify/payment-account', stubs)
o = undefined
coinify = undefined
b = undefined
api = undefined

beforeEach ->
  api = {}
  o = {
    inMedium: "inMedium"
    outMedium: "outMedium"
    name: "name"
    inCurrencies: "inCurrencies"
    outCurrencies: "outCurrencies"
    inCurrency: "inCurrency"
    outCurrency: "outCurrency"
    inFixedFee: 0.01
    outFixedFee: 0
    inPercentageFee: 3
    outPercentageFee: 0
  }
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "Coinify Payment account", ->

  describe "constructor", ->
    quote = undefined

    beforeEach ->
      quote = {baseAmount: -1000}

    it "should set the medium", ->
      b = new PaymentAccount(api, 'bank', quote)
      expect(b._fiatMedium).toBe('bank')
