
proxyquire = require('proxyquireify')(require)

Trade = () ->
Trade.buy = (quote) ->
  Promise.resolve({amount: quote.amount})


stubs = {
  './trade' : Trade
}

Quote = proxyquire('../../src/sfox/quote', stubs)

describe "SFOX Quote", ->

  obj = undefined
  q = undefined

  beforeEach ->

    obj =
      action: "buy"
      quote_currency: "usd"
      quote_amount: "35.05"
      base_currency: "btc",
      base_amount: "0.05544907",
      expires_on: 1476075783431,
      expires_on_str: "2016-10-10T05:03:03Z",
      fee_amount: "0.3505",
      fee_currency: "usd",
      quote_id: "df69eefd-77bf-432c-7f22-6d7c40b40384"

    q = new Quote(obj, 'usd', {}, {
      save: () -> Promise.resolve()
      trades: []
    }, false)

  describe "class", ->
    describe "new Quote()", ->
      it "should construct a Quote", ->
        expect(q.expiresAt).toEqual(new Date(obj.expires_on))
        expect(q.baseCurrency).toBe('USD')
        expect(q.quoteCurrency).toBe('BTC')
        expect(q.baseAmount).toBe(3505)
        expect(q.quoteAmount).toBe(5544907)
        expect(q.id).toBe(obj.quote_id)

      it "must correctly round the fixed fee, fiat to BTC", ->
        obj.quote_amount = 35.05 # 35.05 * 100 = 3504.9999999999995 in javascript
        obj.base_amount = 0.03505
        q = new Quote(obj, 'usd', {}, {})
        expect(q.baseAmount).toEqual(3505)
        expect(q.quoteAmount).toEqual(3505000)

      it "must correctly round the fixed fee, BTC to fiat", ->
        obj.base_currency = "BTC"
        obj.quote_currency = "USD"
        obj.quote_amount = 35.05
        obj.base_amount = 0.00003505
        q = new Quote(obj, 'btc', {}, {})
        expect(q.baseAmount).toEqual(3505)
        expect(q.quoteAmount).toEqual(3505)

    describe "getQuote()", ->
      api = {
        POST: (endpoint, data) ->
          if endpoint == 'trades/quote'
            Promise.resolve(data)
          else
            Promise.reject()

        authPOST: (endpoint, data) ->
          if endpoint == 'trades/quote'
            rate = undefined
            if data.baseCurrency == 'BTC'
              rate = 500
            else
              rate = 0.002

            Promise.resolve({
              baseCurrency: data.baseCurrency
              quoteCurrency: data.quoteCurrency
              baseAmount: data.baseAmount
              quoteAmount: data.baseAmount * rate
            })
          else
            Promise.reject()
      }

      beforeEach ->
        spyOn(api, "POST").and.callThrough()

        it "should POST /quote", (done) ->
          Quote.getQuote(api, {}, 1000, 'USD', 'BTC').then(() ->
            expect(api.POST).toHaveBeenCalled()
            expect(api.POST.calls.argsFor(0)[0]).toEqual('quote')
          ).then(done)

        it "should resolve with the quote", (done) ->
          checks = (res) ->
            expect(res.quoteAmount).toEqual(50000)
            done()

          promise = Quote.getQuote(api, {}, 100000000, 'BTC', 'EUR')
                    .then(checks)

          expect(promise).toBeResolved()
