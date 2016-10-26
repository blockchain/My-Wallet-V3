proxyquire = require('proxyquireify')(require)

PaymentAccount = (api, medium, quote) ->
  {
    mock: "payment-account"
    fiatMedium: medium
    quote: quote
  }
PaymentAccount.add = () -> Promise.resolve({mock: "payment-account"})

stubs = {
  './payment-account': PaymentAccount
}

PaymentMedium    = proxyquire('../../src/sfox/payment-medium', stubs)

sfox = undefined
m = undefined
quote = undefined
api = {
  mock: "api"
}


beforeEach ->
  JasminePromiseMatchers.install()

afterEach ->
  JasminePromiseMatchers.uninstall()

describe "SFOX Payment Medium", ->

  describe "constructor", ->
    quote = undefined

    beforeEach ->
      quote = {baseAmount: -1000}

    it "should store the medium", ->
      m = new PaymentMedium(undefined, api, quote)
      expect(m.inMedium).toBe('ach')
      expect(m.outMedium).toBe('blockchain')

    it "should set fee, given a quote", ->
      m = new PaymentMedium(undefined, api, quote)
      expect(m.fee).toEqual(0)

    it "should set total, given a quote", ->
      m = new PaymentMedium(undefined, api, quote)
      expect(m.total).toEqual(1000)

  describe "fetch all", ->
    it "should return an array of one", () ->
      promise = PaymentMedium.getAll('USD', 'BTC', api, quote)
      expect(promise).toBeResolvedWith([{}])

  describe "instance", ->
    beforeEach ->
      quote = {baseAmount: -1000}
      m = new PaymentMedium(undefined, api, quote)

    describe "addAccount", ->
      it "should call PaymentAccount.add", ->
        spyOn(PaymentAccount, "add").and.callThrough()
        m.addAccount("12345", "1234567890", "John Do", "Banky McBankface")
        expect(PaymentAccount.add).toHaveBeenCalledWith({mock: "api"}, '12345', '1234567890', 'John Do', 'Banky McBankface', undefined)

    describe "getAccounts", ->
      it "...", ->
        pending()
