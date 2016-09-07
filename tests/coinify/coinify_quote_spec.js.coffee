
proxyquire = require('proxyquireify')(require)

stubs = {
}

Quote = proxyquire('../../src/coinify/quote', stubs)

describe "CoinifyQuote", ->

  obj = undefined
  q = undefined

  beforeEach ->

    obj = {
      id:353482,
      baseCurrency:"EUR",
      quoteCurrency:"BTC",
      baseAmount:-12,
      quoteAmount:0.02287838,
      issueTime:"2016-09-02T13:50:55.648Z",
      expiryTime:"2016-09-02T14:05:55.000Z"
    }
    q = new Quote(obj)

  describe "class", ->
    describe "new Quote()", ->
      it "should construct a Quote", ->
        expect(q._expiresAt).toEqual(new Date(obj.expiryTime))
        expect(q._baseCurrency).toBe(obj.baseCurrency)
        expect(q._quoteCurrency).toBe(obj.quoteCurrency)
        expect(q._baseAmount).toBe(obj.baseAmount * 100)
        expect(q._quoteAmount).toBe(obj.quoteAmount * 100000000)
        expect(q._id).toBe(obj.id)

    describe "getQuote()", ->
      coinify = {
        POST: () -> Promise.resolve()
        authPOST: () -> Promise.resolve()
      }

      beforeEach ->
        spyOn(coinify, "POST").and.callThrough()
        spyOn(coinify, "authPOST").and.callThrough()

      describe "without an account", ->
        it "should POST /trades/quote", ->
          Quote.getQuote(coinify, 1000, 'EUR', 'BTC')
          expect(coinify.POST).toHaveBeenCalled()
          expect(coinify.POST.calls.argsFor(0)[0]).toEqual('trades/quote')

      describe "with an account", ->
        beforeEach ->
          coinify.hasAccount = true

        it "should POST /trades/quote with credentials", ->
          Quote.getQuote(coinify, 1000, 'EUR', 'BTC')
          expect(coinify.authPOST).toHaveBeenCalled()
          expect(coinify.authPOST.calls.argsFor(0)[0]).toEqual('trades/quote')

        it "should convert cents", ->
          Quote.getQuote(coinify, 1000, 'EUR', 'BTC')
          expect(coinify.authPOST.calls.argsFor(0)[1].baseAmount).toEqual(10)

        it "should convert satoshis", ->
          Quote.getQuote(coinify, 100000000, 'BTC', 'EUR')
          expect(coinify.authPOST.calls.argsFor(0)[1].baseAmount).toEqual(1)

  describe "instance", ->
    describe "getters", ->
      it "should work", ->
        expect(q.expiresAt).toBe(q._expiresAt)
        expect(q.baseCurrency).toBe(q._baseCurrency)
        expect(q.quoteCurrency).toBe(q._quoteCurrency)
        expect(q.baseAmount).toBe(q._baseAmount)
        expect(q.quoteAmount).toBe(q._quoteAmount)
        expect(q.id).toBe(q._id)

    describe "getPaymentMethods", ->
      it "...", ->
        pending()
