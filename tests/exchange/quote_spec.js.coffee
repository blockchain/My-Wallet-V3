
proxyquire = require('proxyquireify')(require)

Trade = () ->
Trade.buy = () ->

PaymentMethod = () ->
PaymentMethod.fetchAll = () ->

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
    }, Trade, PaymentMethod, false)

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
