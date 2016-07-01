proxyquire = require('proxyquireify')(require)

MyWallet = {
  wallet: {
    syncWallet: () ->
  }
}

emailVerified = true

API = {
  request: (action, method, data, headers) ->
    return new Promise (resolve, reject) ->
      if action == 'GET' && method == "wallet/signed-email-token"
        if emailVerified
          resolve({success: true, token: 'json-web-token'})
        else
          resolve({success: false})
      else
        reject('bad call')
}

stubs = {
  './wallet': MyWallet,
  './api' : API
}

Coinify    = proxyquire('../src/coinify', stubs)

fdescribe "Coinify", ->

  c = undefined

  beforeEach ->
    spyOn(MyWallet, "syncWallet")
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

        spyOn(c, "getEmailToken").and.callFake(() ->
          {
            then: (cb) ->
              cb('')
          }
        )

        # Mock POST requests.
        # TODO: simulate API errors, e.g. if email already registered
        spyOn(c, "POST").and.callFake((endpoint, data) ->
          handle = (resolve, reject) ->
            if endpoint == "signup/trader"
              if data.email == "duplicate@blockchain.com"
                reject("DUPLICATE_EMAIL")
              else if data.email == "fail@blockchain.com"
                reject("ERROR_MESSAGE")
              else
                resolve({
                  trader: {id: "1"}
                  offlineToken: "offline-token"
                })

            else if endpoint == "auth"
              resolve({access_token: "access-token", token_type: "bearer"})
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

      describe "signup", ->
        beforeEach ->
          MyWallet.wallet.accountInfo = {
            email: "info@blockchain.com"
            isEmailVerified: true
            currency: "EUR"
          }

        it 'requires the country to be set', ->
          MyWallet.wallet.profile.countryCode = null
          expect(c.signup()).toBeRejected()


        it 'requires email', ->
          MyWallet.wallet.accountInfo.email = null
          expect(c.signup()).toBeRejected()

        it 'requires verified email', ->
          MyWallet.wallet.accountInfo.isEmailVerified = false
          expect(c.signup()).toBeRejected()

        it 'requires default currency', ->
          MyWallet.wallet.accountInfo.currency = null
          expect(c.signup()).toBeRejected()

        it 'sets a user and offline token', (done) ->
          promise = c.signup()

          expect(promise).toBeResolved(done)
          expect(c.user).toEqual("1")
          expect(c._offline_token).toEqual("offline-token")

        it 'lets the user know if email is already registered', ((done) ->
          MyWallet.wallet.accountInfo.email = "duplicate@blockchain.com"
          promise = c.signup()
          expect(promise).toBeRejectedWith("DUPLICATE_EMAIL", done)
        )

        it 'might fail for an unexpected reason', ((done) ->
          MyWallet.wallet.accountInfo.email = "fail@blockchain.com"
          promise = c.signup()
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
          promise = c.login()
          expect(promise).toBeResolved(done)
          expect(c._access_token).toEqual("access-token")

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

    describe 'getEmailToken', ->
      afterEach ->
        emailVerified = true

      it 'should get the token', (done) ->
        promise = c.getEmailToken()
        expect(promise).toBeResolvedWith('json-web-token', done);

      it 'should reject if email is not verified', (done) ->
        emailVerified = false
        promise = c.getEmailToken()
        expect(promise).toBeRejected(done);
