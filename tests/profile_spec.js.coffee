proxyquire = require('proxyquireify')(require)

MyWallet = {
  wallet: {
    syncWallet: () ->
  }
}

stubs = {
  './wallet': MyWallet,
}

Profile    = proxyquire('../src/profile', stubs)

describe "Profile", ->

  p = undefined

  beforeEach ->
    spyOn(MyWallet, "syncWallet")

  describe "class", ->
    describe "new Profile()", ->

      it "should set country to null", ->
        p = new Profile()
        expect(p.countryCode).toEqual(null)

      it "should transform an Object to a Profile", ->
        p = new Profile({country_code: "NL"})
        expect(p.countryCode).toEqual("NL")

  describe "instance", ->
    beforeEach ->
      p = new Profile({country_code: "NL"})

    describe "Setter", ->

      describe "countryCode", ->
        it "should update the country code", ->
          p.countryCode = "GB"
          expect(p.countryCode).toEqual("GB");

        it "should sync wallet", ->
          p.countryCode = "GB"
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should convert to upper case", ->
          p.countryCode = "GB"
          expect(p.countryCode).toEqual("GB");

        it "should check the format", ->
          expect(() -> p.countryCode = "1").toThrow()

    describe "JSON serializer", ->
      p  = new Profile({country_code: "NL"})

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(p, null, 2)
        b = JSON.parse(json, Profile.reviver)
        expect(p).toEqual(b)

      it 'should not serialize non-expected fields', ->
        p.rarefield = "I am an intruder"
        json = JSON.stringify(p, null, 2)
        b = JSON.parse(json)

        expect(b.country_code).toBeDefined()
        expect(b.rarefield).not.toBeDefined()

      it 'should not deserialize non-expected fields', ->
        b = new Profile({country_code: "NL", rarefield: "I am an intruder"})
        expect(b).toEqual(p)
