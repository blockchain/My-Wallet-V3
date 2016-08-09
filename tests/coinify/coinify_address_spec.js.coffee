
proxyquire = require('proxyquireify')(require)

stubs = {
}

Address = proxyquire('../../src/coinify/address', stubs)

describe "CoinifyAddress", ->

  aObj = undefined
  a = undefined

  beforeEach ->

    aObj = {
      street: "221B Baker Street"
      city: "London"
      state: "England"
      zipcode: "NW1 6XE"
      country: "United Kingdom"
    }
    a = new Address(aObj)

  describe "class", ->
    describe "new Address()", ->
      it "should construct an Address", ->
        expect(a._street).toBe(aObj.street)
        expect(a._city).toBe(aObj.city)
        expect(a._state).toBe(aObj.state)
        expect(a._zipcode).toBe(aObj.zipcode)
        expect(a._country).toBe(aObj.country)

  describe "instance", ->
    describe "getters", ->
      it "should work", ->

        expect(a.street).toBe(aObj.street)
        expect(a.city).toBe(aObj.city)
        expect(a.state).toBe(aObj.state)
        expect(a.zipcode).toBe(aObj.zipcode)
        expect(a.country).toBe(aObj.country)
