proxyquire = require('proxyquireify')(require)

PaymentAccount = (api, medium, quote) ->
  {
    mock: "payment-account"
    fiatMedium: medium
    quote: quote
  }

stubs = {
    './payment-account': PaymentAccount
}

PaymentMethod    = proxyquire('../../src/coinify/payment-medium', stubs)
o = undefined
coinify = undefined
b = undefined
s = undefined
api = undefined
quote = undefined

beforeEach ->
  api = {}
  o = {
    inMedium: "bank"
    outMedium: "blockchain"
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
  sell = {
    inMedium: "blockchain"
    outMedium: "bank"
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
  sellQuote = {baseAmount: 0.5, baseCurrency: "BTC", quoteAmount: 25000}

  s = new PaymentMethod(sell, api, sellQuote)
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "Coinify Payment medium", ->

  describe "constructor", ->
    quote = undefined

    beforeEach ->
      quote = {baseAmount: -1000, baseCurrency: "EUR", quoteAmount: 2}

    it "must put everything on place", ->
      b = new PaymentMethod(o, api)
      expect(b._inMedium).toBe(o.inMedium)
      expect(b._outMedium).toBe(o.outMedium)
      expect(b._name).toBe(o.name)
      expect(b._inCurrencies).toBe(o.inCurrencies)
      expect(b._outCurrencies).toBe(o.outCurrencies)
      expect(b._inCurrency).toBe(o.inCurrency)
      expect(b._outCurrency).toBe(o.outCurrency)
      expect(b._inFixedFee).toBe(o.inFixedFee * 100)
      expect(b._outFixedFee).toBe(o.outFixedFee * 100)
      expect(b._inPercentageFee).toBe(o.inPercentageFee)
      expect(b._outPercentageFee).toBe(o.outPercentageFee)

    it "should have getters", ->
      b = new PaymentMethod(o, api)
      expect(b.name).toEqual(o.name)

    it "should set fee, given a fiat quote", ->
      b = new PaymentMethod(o, api, quote)
      expect(b.fee).toEqual(30 + 1)

    it "should set total, given a BTC quote", ->
      quote = {baseAmount: -10000000, baseCurrency: "BTC", quoteAmount: -200}
      b = new PaymentMethod(o, api, quote)
      expect(b.total).toEqual(200 + 6 + 1)

    it "should set total, given a quote", ->
      b = new PaymentMethod(o, api, quote)
      expect(b.total).toEqual(1000 + 30 + 1)

    it "must correctly round the fixed fee for fiat to BTC", ->
      o.inFixedFee = 35.05 # 35.05 * 100 = 3504.9999999999995 in javascript
      o.outFixedFee = 35.05 # 35.05 * 100 = 3504.9999999999995 in javascript
      b = new PaymentMethod(o, api)
      expect(b.inFixedFee).toEqual(3505)
      expect(b.outFixedFee).toEqual(3505000000)

    it "must correctly round the fixed fee for BTC to fiat", ->
      o.inCurrency = "BTC"
      o.outCurrency = "EUR"
      o.inFixedFee = 35.05
      o.outFixedFee = 35.05
      b = new PaymentMethod(o, api)
      expect(b.inFixedFee).toEqual(3505000000)
      expect(b.outFixedFee).toEqual(3505)

    it "should set the fiat medium", ->
      o.inMedium = "blockchain"
      o.outMedium = "bank"
      b = new PaymentMethod(o, api)
      expect(b.fiatMedium).toEqual("bank")

      o.inMedium = "card"
      o.outMedium = "blockchain"
      b = new PaymentMethod(o, api)
      expect(b.fiatMedium).toEqual("card")


  describe "getAll()", ->
    beforeEach ->
      coinify = {
        authGET: (method, params) ->
          if params.inCurrency == 'EUR'
            Promise.resolve([o,o,o,o])
          else
            Promise.resolve([s])
      }

    it "should authGET trades/payment-methods with the correct arguments", (done) ->

      spyOn(coinify, "authGET").and.callThrough()

      promise = PaymentMethod.getAll('EUR', 'BTC', coinify)
      argument = {
        inCurrency: 'EUR',
        outCurrency: 'BTC'
      }
      testCalls = () ->
        expect(coinify.authGET).toHaveBeenCalledWith('trades/payment-methods', argument)
      promise
        .then(testCalls)
        .then(done)

    it "should return {bank: ..., card: ...} for buy", (done) ->

      promise = PaymentMethod.getAll('EUR', 'BTC', coinify)

      testCalls = (res) ->
        expect(res.bank).toBeDefined()

      promise
        .then(testCalls)
        .then(done)

    it "should return {bank: ...} for sell", (done) ->

      promise = PaymentMethod.getAll('BTC', 'EUR', coinify)

      testCalls = (res) ->
        expect(res.bank).toBeDefined()

      promise
        .then(testCalls)
        .then(done)

  describe "instance", ->
    beforeEach ->
      quote = {baseAmount: -1000, baseCurrency: "EUR", quoteAmount: 2}
      b = new PaymentMethod(o, api, quote)

    describe "getAccounts()", ->
      it "should return a dummy account", (done) ->
        promise = b.getAccounts().then((res) ->
          expect(res).toEqual([{
            mock: "payment-account", fiatMedium: "bank", quote: quote
          }])
        )
        expect(promise).toBeResolved(done)
