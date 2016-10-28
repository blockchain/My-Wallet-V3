proxyquire = require('proxyquireify')(require)

Trade = () ->
Trade.buy = (quote) ->
  Promise.resolve({amount: quote.baseAmount})

stubs = {
  './trade' : Trade
}

PaymentAccount    = proxyquire('../../src/exchange/payment-account', stubs)
api = undefined

beforeEach ->
  api = {mock: "api"}

  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "Payment Account", ->
  describe "class", ->
    describe "constructor", ->
      it "should keep a reference to the api", ->
        b = new PaymentAccount(api, 'bank', undefined, {})
        expect(b._api).toEqual(api)

  describe "instance", ->
    p = undefined
    delegate = undefined

    beforeEach ->
      delegate =
        save: () -> Promise.resolve()
        trades: []

      quote =
        expiresAt: new Date(new Date().getTime() + 100000)
        baseAmount: -1000
        baseCurrency: 'EUR'
        delegate: delegate
        api: {}
        debug: false

      p = new PaymentAccount(api, 'bank', quote, Trade)
      p._name = "John Do"

    it "should have a name", ->
      expect(p.name).toEqual("John Do")

    it "should have getters", ->
      p._id = '1234'
      expect(p.id).toBe('1234')

    describe 'buy()', ->
      it 'should use Trade.buy', ->
        spyOn(Trade, "buy").and.callThrough()

        p.buy('card')

        expect(Trade.buy).toHaveBeenCalled()

      it 'should check for a quote', (done) ->
        p._quote = undefined
        promise = p.buy('card').catch((e) ->
          expect(e.toEqual('QUOTE_MISSING'))
        )
        expect(promise).toBeRejected(done)

      it 'should return the trade', (done) ->
        checks = (res) ->
          expect(res).toEqual({amount: -1000, debug: false})

        p.buy('card').then(checks).then(done)

      it "should save", (done) ->
        spyOn(delegate, "save").and.callThrough()

        checks = () ->
          expect(delegate.save).toHaveBeenCalled()

        p.buy('card').then(checks).then(done)
