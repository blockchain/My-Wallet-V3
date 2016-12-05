proxyquire = require('proxyquireify')(require)

stubs = {
}

Profile    = proxyquire('../../src/sfox/profile', stubs)

describe "SFOX Profile", ->

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    api = undefined

    beforeEach ->
      api =
        authGET: (method) ->
          Promise.resolve({
            token: "account-token",
            account:
              id: "account-id",
              verification_status:
                level: "pending"
              can_buy: true,
              can_sell: true,
              limits:
                available:
                  buy: 100
                  sell: 100
          })

    describe "fetch()", ->
      it "calls /account", ->
        spyOn(api, "authGET").and.callThrough()
        res = Profile.fetch(api)
        expect(api.authGET).toHaveBeenCalledWith('account')

      it "populates the profile", (done) ->
        promise = Profile.fetch(api).then((p) ->
          expect(p.verificationStatus).toEqual({level: 'pending'})
          expect(p.limits).toEqual({buy: 100, sell: 100})
        )

        expect(promise).toBeResolved(done)

  describe "instance", ->
    profile = undefined
