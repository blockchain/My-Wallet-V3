proxyquire = require('proxyquireify')(require)

stubs = {
}

BankAccount    = proxyquire('../../src/coinify/bank-account', stubs)
o = undefined
address = undefined

beforeEach ->
  JasminePromiseMatchers.install()

  address = {
    street: "221B Baker Street"
    city: "London"
    state: "England"
    zipcode: "NW1 6XE"
    country: "United Kingdom"
  }

  o = {
    id: "id"
    account: {
      type: 'type'
      currency: "currency"
      bic: "bic"
      number: "number"
    }
    bank: {
      name: "name"
      address: address
    }
    holder: {
      address: address
    }
    referenceText: "referenceText"
    updateTime: "updateTime"
    createTime: "createTime"
  }

afterEach ->
  JasminePromiseMatchers.uninstall()

fdescribe "Coinify: Bank account", ->

  describe "constructor", ->
    it "coinify reference must be preserved", ->
      b = new BankAccount(o)
      expect(b._id).toBe(o.id)
      expect(b._type).toBe(o.account.type)
      expect(b._currency).toBe(o.account.currency)
      expect(b._bic).toBe(o.account.bic)
      expect(b._number).toBe(o.account.number)

      expect(b._bank_name).toBe(o.bank.name)
      expect(b._holder_name).toBe(o.bank.name)
      expect(b._referenceText).toBe(o.referenceText)

      expect(b._updated_at).toBe(o.updateTime)
      expect(b._created_at).toBe(o.createTime)
