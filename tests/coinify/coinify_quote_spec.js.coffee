
proxyquire = require('proxyquireify')(require)

PaymentMethod = {
  fetchAll: () -> Promise.resolve([
    {
      inMedium: 'bank'
      calculateFee: this.prototype.calculateFee
    }
  ])
}

stubs = {
  './payment-method' : PaymentMethod
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

      it "must correctly round the fixed fee, fiat to BTC", ->
        obj.baseAmount = 35.05 # 35.05 * 100 = 3504.9999999999995 in javascript
        obj.quoteAmount = 0.00003505
        q = new Quote(obj)
        expect(q.baseAmount).toEqual(3505)
        expect(q.quoteAmount).toEqual(3505)

      it "must correctly round the fixed fee, BTC to fait", ->
        obj.baseCurrency = "BTC"
        obj.quoteCurrency = "EUR"
        obj.baseAmount = 0.00003505
        obj.quoteAmount = 35.05
        q = new Quote(obj)
        expect(q.baseAmount).toEqual(3505)
        expect(q.quoteAmount).toEqual(3505)

    describe "getQuote()", ->
      coinify = {
        POST: (endpoint, data) ->
          console.log(endpoint, data)
          if endpoint == 'trades/quote'
            Promise.resolve(data)
          else
            Promise.reject()

        authPOST: (endpoint, data) ->
          console.log(endpoint, data)
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

        it "should check if the base currency is supported", ->
          promise = Quote.getQuote(coinify, 100000000, 'XXX', 'BTC')
          expect(promise).toBeRejected()

        it "should check if the quote currency is supported", ->
          promise = Quote.getQuote(coinify, 100000000, 'EUR', 'DOGE')
          expect(promise).toBeRejected()

        it "should resolve with the quote", (done) ->
          checks = (res) ->
            expect(res.quoteAmount).toEqual(50000)
            done()

          promise = Quote.getQuote(coinify, 100000000, 'BTC', 'EUR')
                    .then(checks)

          expect(promise).toBeResolved()

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
      it "should cache the result", ->
        q.paymentMethods = {}
        spyOn(PaymentMethod, "fetchAll")
        q.getPaymentMethods()
        expect(PaymentMethod.fetchAll).not.toHaveBeenCalled()

      it "should set .bank for the bank method", (done) ->
        checks = (res) ->
          expect(res.bank).toBeDefined()
          done()

        q.getPaymentMethods().then(checks)

      it "should calculate fees", (done) ->
        spyOn(PaymentMethod.prototype, "calculateFee").and.callFake(
          () ->
        )

        checks = (res) ->
          expect(PaymentMethod.prototype.calculateFee).toHaveBeenCalled()
          done()

        q.getPaymentMethods().then(checks)

    describe "QA expire()", ->
      it "should set expiration time to 3 seconds in the future", ->
        originalExpiration = q.expiresAt
        q.expire()
        expect(q.expiresAt).not.toEqual(originalExpiration)
