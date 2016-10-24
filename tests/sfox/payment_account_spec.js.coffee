proxyquire = require('proxyquireify')(require)

stubs = {
}

PaymentAccount    = proxyquire('../../src/sfox/payment-account', stubs)
o = undefined
b = undefined
api = undefined
quote = undefined

beforeEach ->
  api = {}
  o = {
    payment_method_id: "1234"
    type: "ach",
    status: "active",
    routing_number: "**89",
    account_number: "**67",
    nickname: "checking 1",
    currency: "usd"
  }
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "SFOX Payment Account", ->

  describe "constructor", ->
    quote = undefined

    beforeEach ->
      quote = {baseAmount: -1000}

    it "should deserialize JSON", ->
      b = new PaymentAccount(o, api, quote)
      expect(b._id).toEqual(o.payment_method_id)
      expect(b._status).toEqual(o.status)
      expect(b._routingNumber).toEqual(o.routing_number)
      expect(b._accountNumber).toEqual(o.account_number)
      expect(b._name).toEqual(o.nickname)


  describe "getAll", ->
    it "should authGET payment-methods", (done) ->
      api = {
        authGET: (method, params) -> Promise.resolve([o]),
      }
      spyOn(api, "authGET").and.callThrough()

      promise = PaymentAccount.getAll('USD', 'BTC', api, quote)
      testCalls = () ->
        expect(api.authGET).toHaveBeenCalledWith('payment-methods')

      promise
        .then(testCalls)
        .then(done)
