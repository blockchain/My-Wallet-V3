proxyquire = require('proxyquireify')(require)

Quote = {
  getQuote: (coinify, amount, baseCurrency, quoteCurrency) ->
    Promise.resolve({
      baseAmount: amount,
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency
    })
}

stubs = {
  './quote'  : Quote
}

Coinify    = proxyquire('../../src/coinify/coinify', stubs)

describe "Coinify", ->

  c = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

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
      c.partnerId = 18
      c.save = () ->
        Promise.resolve()
      spyOn(c, "save").and.callThrough()

      c.delegate = {
        email: () -> "info@blockchain.com"
        isEmailVerified: () -> true
        getEmailToken: () -> "json-web-token"
      }

      # Mock POST requests.
      # TODO: simulate API errors, e.g. if email already registered
      spyOn(c, "POST").and.callFake((endpoint, data) ->
        if endpoint == "signup/trader"
          console.log("singup/trader")
          if data.email == "duplicate@blockchain.com"
            console.log("Duplicate, reject!")
            Promise.reject("DUPLICATE_EMAIL")
          else if data.email == "fail@blockchain.com"
            Promise.reject("ERROR_MESSAGE")
          else
            Promise.resolve({
              trader: {id: "1"}
              offlineToken: "offline-token"
            })

        else if endpoint == "auth"
          if data.offline_token == 'invalid-offline-token'
            Promise.reject({"error":"offline_token_not_found"})
          else if data.offline_token == 'random-fail-offline-token'
            Promise.reject()
          else
            Promise.resolve({access_token: "access-token", token_type: "bearer"})
        else
          Promise.reject("Unknown endpoint")
      )

      spyOn(c, "PATCH").and.callFake((endpoint, data) ->
        handle = (resolve, reject) ->
          if endpoint == "traders/me"
            console.log(data)
            resolve({
              profile:
                name: (data.profile && data.profile.name) || c._profile._full_name
              defaultCurrency: data.defaultCurrency || c._profile._default_currency
            })
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

    describe "Setter", ->

      describe "autoLogin", ->
        beforeEach ->

        it "should update", ->
          c.autoLogin = false
          expect(c.autoLogin).toEqual(false)

        it "should save", ->
          c.autoLogin = false
          expect(c.save).toHaveBeenCalled()

        it "should check the input", ->
          expect(() -> c.autoLogin = "1").toThrow()

    describe "JSON serializer", ->
      p  = new Coinify({auto_login: true})

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(c, null, 2)
        b = new Coinify(JSON.parse(json))
        expect(json).toEqual(JSON.stringify(b, null, 2))

      it 'should not serialize non-expected fields', ->
        expectedJSON = JSON.stringify(c, null, 2)
        c.rarefield = "I am an intruder"
        json  = JSON.stringify(c, null, 2)
        expect(json).toEqual(expectedJSON)

    describe "signup", ->
      it 'sets a user and offline token', (done) ->
        checks  = () ->
          expect(c.user).toEqual("1")
          expect(c._offline_token).toEqual("offline-token")

        promise = c.signup('NL', 'EUR').then(checks)

        expect(promise).toBeResolved(done)

      it 'requires the country', ->
        expect(c.signup('NL', 'EUR')).toBeResolved()
        expect(c.signup(undefined, 'EUR')).toBeRejected()

      it 'requires the currency', ->
        expect(c.signup('NL', 'EUR')).toBeResolved()
        expect(c.signup('NL')).toBeRejected()

      it 'requires email', ->
        c.delegate.email = () -> null
        expect(c.signup('NL', 'EUR')).toBeRejected()

      it 'requires verified email', ->
        c.delegate.isEmailVerified = () -> false
        expect(c.signup('NL', 'EUR')).toBeRejected()

      it 'lets the user know if email is already registered', ((done) ->
        c.delegate.email = () -> "duplicate@blockchain.com"
        promise = c.signup('NL', 'EUR')
        expect(promise).toBeRejectedWith("DUPLICATE_EMAIL", done)
      )

      it 'might fail for an unexpected reason', ((done) ->
        c.delegate.email = () -> "fail@blockchain.com"
        promise = c.signup('NL', 'EUR')
        expect(promise).toBeRejectedWith("ERROR_MESSAGE", done)
      )

    describe 'login', ->
      beforeEach ->
        c._user = "user-1"
        c._offline_token = "offline-token"

      it 'requires an offline token', ->
        c._offline_token = undefined
        promise = c.login()
        expect(promise).toBeRejectedWith("NO_OFFLINE_TOKEN")

      it 'should POST the offline token to /auth', ->
        promise = c.login()
        expect(c.POST).toHaveBeenCalled()
        expect(c.POST.calls.argsFor(0)[1].offline_token).toEqual('offline-token')

      it 'should store the access token', (done) ->
        # This is ephemeral, not saved to the wallet.
        checks = () ->
          expect(c._access_token).toEqual("access-token")

        promise = c.login().then(checks)
        expect(promise).toBeResolved(done)

      it 'should store the expiration time', () ->
        # Pending API change
        pending()

      it 'should handle token not found error', (done) ->
        c._offline_token = 'invalid-offline-token'
        promise = c.login()
        expect(promise).toBeRejectedWith(jasmine.objectContaining({error: 'offline_token_not_found'}), done)

      it 'should handle generic failure', (done) ->
        c._offline_token = 'random-fail-offline-token'
        promise = c.login()
        expect(promise).toBeRejected(done)

    describe 'profile', ->
      beforeEach ->
        c._user = "user-1"
        c._offline_token = "offline-token"
        c._access_token = "access-token"
        c._profile._did_fetch = true;
        c._profile._full_name = "John Doe"
        c._profile._default_currency = "EUR"

      describe 'fullName', ->
        it 'can be updated', () ->
          c.profile.setFullName("Jane Doe")
          expect(c.PATCH).toHaveBeenCalled()
          expect(c.PATCH.calls.argsFor(0)[1].profile).toEqual({name: 'Jane Doe'})
          expect(c.profile.fullName).toEqual('Jane Doe')

      describe 'default currency', ->
        pending()

    describe 'getBuyQuote', ->
      it 'should use Quote.getQuote', ->
        spyOn(Quote, "getQuote").and.callThrough()

        c.getBuyQuote(1000, 'EUR', 'BTC')

        expect(Quote.getQuote).toHaveBeenCalled()

      it 'should use a negative amount', (done) ->
        checks = (quote) ->
          expect(quote.baseAmount).toEqual(-1000)

        promise = c.getBuyQuote(1000, 'EUR', 'BTC').then(checks)

        expect(promise).toBeResolved(done)

      it 'should set the quote currency to BTC for fiat base currency', (done) ->
        checks = (quote) ->
          expect(quote.quoteCurrency).toEqual('BTC')

        promise = c.getBuyQuote(1000, 'EUR').then(checks)

        expect(promise).toBeResolved(done)


      it 'should set _lastQuote', (done) ->
        checks = (quote) ->
          expect(c._lastQuote.baseAmount).toEqual(-1000)

        promise = c.getBuyQuote(1000, 'EUR').then(checks)

        expect(promise).toBeResolved(done)
