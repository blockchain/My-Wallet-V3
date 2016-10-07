
proxyquire = require('proxyquireify')(require)

Trade = () ->
Trade.buy = (quote) ->
  Promise.resolve({amount: quote.baseAmount})

stubs = {
  './trade' : Trade
}

Quote = proxyquire('../../src/exchange/quote', stubs)

describe "Quote", ->

  obj = undefined
  q = undefined
  api = undefined

  beforeEach ->
    api = {}
    q = new Quote(api, {
      save: () -> Promise.resolve()
      trades: []
    }, Trade, false)

    q._id = '1'
    q._baseAmount = 1
    q._quoteAmount = 1
    q._baseCurrency = 'EUR'
    q._quoteCurrency = 'BTC'
    q._expiresAt = 1

  describe "class", ->
    describe "new Quote()", ->
      it "should construct a Quote", ->
        expect(q instanceof Quote).toBeTruthy()

    describe "getQuote()", ->
        it "should convert cents", (done) ->
          Quote.getQuote( 1000, 'EUR', 'BTC', ['EUR', 'BTC']).then((base_amount) ->
            expect(base_amount).toEqual('10.00')
          ).then(done)

        it "should convert satoshis", (done) ->
          Quote.getQuote( 100000000, 'BTC', 'EUR', ['EUR', 'BTC']).then((base_amount) ->
            expect(base_amount).toEqual('1.00000000')
          ).then(done)

        it "should check if the base currency is supported", (done) ->
          promise = Quote.getQuote( 100000000, 'XXX', 'BTC', ['EUR', 'BTC'])
          expect(promise).toBeRejected(done)

        it "should check if the quote currency is supported", (done) ->
          promise = Quote.getQuote( 100000000, 'EUR', 'DOGE', ['EUR', 'BTC'])
          expect(promise).toBeRejected(done)

  describe "instance", ->
    describe "getters", ->
      it "should work", ->
        expect(q.expiresAt).toBe(1)
        expect(q.baseCurrency).toBe('EUR')
        expect(q.quoteCurrency).toBe('BTC')
        expect(q.baseAmount).toBe(1)
        expect(q.quoteAmount).toBe(1)
        expect(q.id).toBe('1')

    describe 'buy()', ->
      beforeEach ->
        q._expiresAt = new Date(new Date().getTime() + 100000)
        q._baseAmount = -1000
        q._baseCurrency = 'EUR'

      it 'should use Trade.buy', ->
        spyOn(Trade, "buy").and.callThrough()

        q.buy('card')

        expect(Trade.buy).toHaveBeenCalled()

      it 'should check that quote  is still valid', ->
        q._expiresAt = new Date(new Date().getTime() - 100000)
        expect(() -> q.buy('card')).toThrow()

      it 'should return the trade', (done) ->
        checks = (res) ->
          expect(res).toEqual({amount: -1000, debug: false})

        promise = q.buy('card').then(checks).then(done)

      it "should save", (done) ->
        spyOn(q._delegate, "save").and.callThrough()

        checks = () ->
          expect(q._delegate.save).toHaveBeenCalled()

        promise = q.buy('card').then(checks).then(done)
