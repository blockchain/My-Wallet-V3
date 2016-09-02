
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
        expect(q._baseAmount).toBe(obj.baseAmount)
        expect(q._quoteAmount).toBe(obj.quoteAmount)
        expect(q._id).toBe(obj.id)

    describe "getQuote()", ->
      it "...", ->
        pending()

  describe "instance", ->
    describe "getters", ->
      it "should work", ->
        expect(q.expiresAt).toBe(q._expiresAt)
        expect(q.baseCurrency).toBe(q._baseCurrency)
        expect(q.quoteCurrency).toBe(q._quoteCurrency)
        expect(q.baseAmount).toBe(q._baseAmount)
        expect(q.quoteAmount).toBe(q._quoteAmount)
        expect(q.id).toBe(q._id)
