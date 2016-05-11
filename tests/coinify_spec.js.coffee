proxyquire = require('proxyquireify')(require)

MyWallet = {
  wallet: {
    syncWallet: () ->
  }
}

stubs = {
  './wallet': MyWallet,
}

Coinify    = proxyquire('../src/coinify', stubs)

describe "Coinify", ->

  c = undefined

  beforeEach ->
    spyOn(MyWallet, "syncWallet")

  describe "class", ->
    describe "new Coinify()", ->

      it "should transform an Object to a Coinify", ->
        c = new Coinify({auto_login: true})
        expect(c.constructor.name).toEqual("Coinify")

      it "should use fields", ->
        c = new Coinify({auto_login: true})
        expect(c._auto_login).toEqual(true)

    describe "Coinify.new()", ->
      it "sets autoLogin to true", ->
        c = Coinify.new()
        expect(c._auto_login).toEqual(true)

  describe "instance", ->
    beforeEach ->
      c = Coinify.new()

    describe "Setter", ->

      describe "autoLogin", ->
        it "should update", ->
          c.autoLogin = false
          expect(c.autoLogin).toEqual(false)

        it "should sync wallet", ->
          c.autoLogin = false
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should check the input", ->
          expect(() -> c.autoLogin = "1").toThrow()

    describe "JSON serializer", ->
      p  = new Coinify({auto_login: true})

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(c, null, 2)
        b = JSON.parse(json, Coinify.reviver)
        expect(c).toEqual(b)

      it 'should not serialize non-expected fields', ->
        c.rarefield = "I am an intruder"
        json = JSON.stringify(c, null, 2)
        b = JSON.parse(json)

        expect(b.auto_login).toBeDefined()
        expect(b.rarefield).not.toBeDefined()

      it 'should not deserialize non-expected fields', ->
        b = new Coinify({auto_login: true, rarefield: "I am an intruder"})
        expect(b).toEqual(c)

    describe "API", ->
      beforeEach ->
        MyWallet.wallet.profile = {countryCode: "GB"}

        # Mock POST requests.
        # TODO: simulate API errors, e.g. if email already registered
        spyOn(c, "POST").and.callFake((endpoint, data) ->
          handle = (resolve, reject) ->
            if endpoint == "signup/trader"
              if data.email != "duplicate@blockchain.com"
                resolve({
                  trader: {id: "1"}
                  offlineToken: "offline-token"
                })
              else
                reject("DUPLICATE_EMAIL")
            else
              reject("Unknown endpoint")
          {
            then: (resolve) ->
              handle(resolve, (() ->))
              {
                catch: (reject) ->
                  handle((() ->), reject)
              }
          }
        )

      describe "signup", ->
        it 'requires the country to be set', ->
          MyWallet.wallet.profile.countryCode = null
          expect(c.signup("info@blockchain.com", "+1234", "EUR")).toBeRejected()


        it 'requires email', ->
          expect(c.signup(undefined, "+1234", "EUR")).toBeRejected()

        it 'requires mobile', ->
          expect(c.signup("info@blockchain.com", undefined , "EUR")).toBeRejected()

        it 'requires default currency', ->
          expect(c.signup("info@blockchain.com", "+1234", undefined)).toBeRejected()

        it 'sets a user and offline token', (done) ->
          promise = c.signup("info@blockchain.com", "+1234", "EUR")

          expect(promise).toBeResolved(done)
          expect(c.user).toEqual("1")
          expect(c._offline_token).toEqual("offline-token")


        it 'lets the user know if email is already registered', ((done) ->
          promise = c.signup("duplicate@blockchain.com", "+1234", "EUR")
          expect(promise).toBeRejectedWith("DUPLICATE_EMAIL", done)
        )
