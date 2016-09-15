proxyquire = require('proxyquireify')(require)

Level = (obj) ->
  {
    name: obj.name
  }


Limits = (obj) ->
  {
    card:
      in: obj.card.in
  }

stubs = {
  './level'  : Level,
  './limits'  : Limits
}

CoinifyProfile    = proxyquire('../../src/coinify/profile', stubs)

describe "CoinifyProfile", ->

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new CoinifyProfile()", ->

      it "should keep a reference to API object", ->
        api = {}
        p = new CoinifyProfile(api)
        expect(p._api).toBe(api)

  describe "instance", ->
    p = undefined
    coinify = undefined
    profile = undefined

    beforeEach ->
      profile = {
        name: "John Do"
        gender: 'male'
        mobile:
          countryCode: "1"
          number: "1234"
        address:
          street: "Hoofdstraat 1"
          city: "Amsterdam"
          zipcode: "1111 AA"
          state: "NH"
          country: "NL"
      }
      coinify = {
        authGET: (method) -> {
          then: (cb) ->
            cb({
              id: 1
              defaultCurrency: 'EUR'
              email: "john@do.com"
              profile: profile
              feePercentage: 3
              currentLimits:
                card:
                  in: 100
                bank:
                  in: 0

              requirements: []
              level: {name: '1'}
              nextLevel: {name: '2'}
            })
            {
              catch: () ->
            }
        }
        authPATCH: () ->
      }
      spyOn(coinify, "authGET").and.callThrough()
      spyOn(coinify, "authPATCH").and.callThrough()
      p = new CoinifyProfile(coinify)

    describe "fetch()", ->
      it "calls /traders/me", ->
        p.fetch()
        expect(coinify.authGET).toHaveBeenCalledWith('traders/me')

      it "populates the profile", ->
        p.fetch()
        expect(p.fullName).toEqual('John Do')
        expect(p.defaultCurrency).toEqual('EUR')
        expect(p.email).toEqual('john@do.com')
        expect(p.gender).toEqual('male')
        expect(p.mobile).toEqual('+11234')
        expect(p.city).toEqual('Amsterdam')
        expect(p.country).toEqual('NL')
        expect(p.state).toEqual('NH')
        expect(p.street).toEqual('Hoofdstraat 1')
        expect(p.zipcode).toEqual('1111 AA')
        expect(p.level.name).toEqual('1')
        expect(p.nextLevel.name).toEqual('2')
        expect(p.currentLimits.card.in).toEqual(100)

    describe "update()", ->
      it "should update", ->
        p.update({profile: {name: 'Jane Do'}})
        expect(coinify.authPATCH).toHaveBeenCalledWith('traders/me', {profile: { name: 'Jane Do' }})

    describe "Setter", ->
      beforeEach ->
        spyOn(p, "update").and.callFake((values) ->
          then: (cb) ->
            if values.profile
              profile.name = values.profile.name || profile.name
              if values.profile.gender != undefined # can be null
                profile.gender = values.profile.gender
              if values.profile.address
                profile.address.city = values.profile.address.city || profile.city
                profile.address.country = values.profile.address.country || profile.country
                profile.address.state = values.profile.address.state || profile.state
                profile.address.street = values.profile.address.street || profile.street
                profile.address.zipcode = values.profile.address.zipcode || profile.zipcode

            cb({profile: profile})
            {
              catch: () ->
            }
        )

      describe "setFullName", ->
        it "should update", ->
          p.setFullName('Jane Do')
          expect(p.update).toHaveBeenCalledWith({profile: { name: 'Jane Do' }})
          expect(p.fullName).toEqual('Jane Do')

      describe "setGender", ->
        it "should update", ->
          p.setGender('female')
          expect(p.update).toHaveBeenCalledWith({profile: { gender: 'female' }})
          expect(p.gender).toEqual('female')

          p.setGender('male')
          expect(p.gender).toEqual('male')

        it "can be unset", ->
          p.setGender(null)
          expect(p.gender).toEqual(null)

        it "should only accept male, female or null", ->
          try
            p.setGender('wrong')
          catch e
            expect(e.toString()).toEqual('AssertionError: invalid gender')

          expect(p.update).not.toHaveBeenCalled()

      describe "setCity", ->
        it "should update", ->
          p.setCity('London')
          expect(p.update).toHaveBeenCalledWith({profile: { address: { city: 'London'} }})
          expect(p.city).toEqual('London')

      describe "setCountry", ->
        it "should update", ->
          p.setCountry('GB')
          expect(p.update).toHaveBeenCalledWith({profile: { address: { country: 'GB'} }})
          expect(p.country).toEqual('GB')

      describe "setState", ->
        it "should update", ->
          p.setState('LND')
          expect(p.update).toHaveBeenCalledWith({profile: { address: { state: 'LND'} }})
          expect(p.state).toEqual('LND')

      describe "setStreet", ->
        it "should update", ->
          p.setStreet('Main St 1')
          expect(p.update).toHaveBeenCalledWith({profile: { address: { street: 'Main St 1'} }})
          expect(p.street).toEqual('Main St 1')

      describe "setZipcode", ->
        it "should update", ->
          p.setZipcode('1234')
          expect(p.update).toHaveBeenCalledWith({profile: { address: { zipcode: '1234'} }})
          expect(p.zipcode).toEqual('1234')
