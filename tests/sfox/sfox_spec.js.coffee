proxyquire = require('proxyquireify')(require)

API = () ->
  {
    GET: () ->
    POST: () ->
    PATCH: () ->
  }

ExchangeDelegate = () ->
  {
    save: () -> Promise.resolve()
  }

stubs = {
  '../exchange/api' : API,
  '../exchange-delegate' : ExchangeDelegate
}

SFOX    = proxyquire('../../src/sfox/sfox', stubs)

describe "SFOX", ->

  s = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new SFOX()", ->

      it "should transform an Object to a SFOX", ->
        s = new SFOX({auto_login: true}, {})
        expect(s.constructor.name).toEqual("SFOX")

      it "should use fields", ->
        s = new SFOX({auto_login: true}, {})
        expect(s._auto_login).toEqual(true)

      it "should require a delegate", ->
        expect(() -> new SFOX({auto_login: true})).toThrow()

      it "should deserialize trades", ->
        pending()
        # s = new SFOX({
        #   auto_login: true,
        #   trades: [{}]
        # }, {})
        # expect(s.trades.length).toEqual(1)


    describe "SFOX.new()", ->
      it "sets autoLogin to true", ->
        s = SFOX.new({})
        expect(s._auto_login).toEqual(true)

      it "should require a delegate", ->
        expect(() -> SFOX.new()).toThrow()

  describe "instance", ->
    beforeEach ->
      s = SFOX.new({
        email: () -> "info@blockchain.com"
        mobile: () -> "+1 55512345678"
        isEmailVerified: () -> true
        isMobileVerified: () -> true
        getToken: () -> "json-web-token"
        save: () -> Promise.resolve()
      })
      s.partnerId = 'blockchain'
      s._debug = false

      spyOn(s._api, "POST").and.callFake((endpoint, data) ->
        console.log(data)
        if endpoint == "account"
          if data.user_data == "fail-token"
            Promise.reject("ERROR_MESSAGE")
          else
            Promise.resolve({
              token: "account-token"
              account:
                id: "1"
            })
        else
          Promise.reject("Unknown endpoint")
      )

    describe "Getter", ->
      describe "hasAccount", ->
        it "should use account_token to see if user has account", ->
          s._accountToken = undefined
          expect(s.hasAccount).toEqual(false)

          s._accountToken = "token"
          expect(s.hasAccount).toEqual(true)

    describe "Setter", ->

      describe "autoLogin", ->
        beforeEach ->
          spyOn(s.delegate, "save").and.callThrough()

        it "should update", ->
          s.autoLogin = false
          expect(s.autoLogin).toEqual(false)

        it "should save", ->
          s.autoLogin = false
          expect(s.delegate.save).toHaveBeenCalled()

        it "should check the input", ->
          expect(() -> s.autoLogin = "1").toThrow()

      describe "debug", ->
        it "should set debug", ->
          s.debug = true
          expect(s.debug).toEqual(true)

        it "should set debug flag on the delegate", ->
          s._delegate = {debug: false}
          s.debug = true
          expect(s.delegate.debug).toEqual(true)

        it "should set debug flag on trades", ->
          pending()
          # s._trades = [{debug: false}]
          # s.debug = true
          # expect(s.trades[0].debug).toEqual(true)

    describe "JSON serializer", ->
      obj = undefined

      beforeEach ->
        obj =
          user: "1"
          account_token: "token"
          auto_login: true

        s  = new SFOX(obj, {})

      it 'should serialize the right fields', ->
        json = JSON.stringify(s, null, 2)
        d = JSON.parse(json)
        expect(d.user).toEqual("1")
        expect(d.account_token).toEqual("token")
        expect(d.auto_login).toEqual(true)

      it 'should serialize trades', ->
        pending()
        # p.trades = []
        # json = JSON.stringify(p, null, 2)
        # d = JSON.parse(json)
        # expect(d.trades).toEqual([])

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(s, null, 2)
        b = new SFOX(JSON.parse(json), {})
        expect(json).toEqual(JSON.stringify(b, null, 2))

      it 'should not serialize non-expected fields', ->
        expectedJSON = JSON.stringify(s, null, 2)
        s.rarefield = "I am an intruder"
        json  = JSON.stringify(s, null, 2)
        expect(json).toEqual(expectedJSON)

    describe "signup", ->
      it 'sets a user and account token', (done) ->
        checks  = () ->
          expect(s.user).toEqual("1")
          expect(s._accountToken).toEqual("account-token")

        promise = s.signup().then(checks)

        expect(promise).toBeResolved(done)

      it 'requires email', ->
        s.delegate.email = () -> null
        expect(s.signup()).toBeRejected()

      it 'requires verified email', ->
        s.delegate.isEmailVerified = () -> false
        expect(s.signup()).toBeRejected()

      it 'requires mobile', ->
        s.delegate.mobile = () -> null
        expect(s.signup()).toBeRejected()

      it 'requires verified mobile', ->
        s.delegate.isMobileVerified = () -> false
        expect(s.signup()).toBeRejected()

      it 'might fail for an unexpected reason', ((done) ->
        s.delegate.getToken = () -> "fail-token"
        promise = s.signup()
        expect(promise).toBeRejectedWith("ERROR_MESSAGE", done)
      )
