proxyquire = require('proxyquireify')(require)

require('isomorphic-fetch')

fetchMock = require('fetch-mock')

stubs = {
}

API = proxyquire('../../src/coinify/api', stubs)

describe "API", ->

  api = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new API()", ->
      it "should have a root URL", ->
        api = new API()
        expect(api._rootURL).toBeDefined()

  describe "instance", ->
    beforeEach ->
      api = new API()
      api._offlineToken = "offline-token"

    describe "Getter", ->
      describe "hasAccount", ->
        it "should use offline_token to see if user has account", ->
          api._offlineToken = undefined
          expect(api.hasAccount).toEqual(false)

          api._offlineToken = "token"
          expect(api.hasAccount).toEqual(true)

      describe "isLoggedIn", ->
        beforeEach ->
          api._access_token = "access_token"
          api._loginExpiresAt = new Date(new Date().getTime() + 100000)

        it "checks if there is an access token", ->
          expect(api.isLoggedIn).toEqual(true)

          api._access_token = undefined
          expect(api.isLoggedIn).toEqual(false)

        it "checks if the token hasn't expired", ->
          expect(api.isLoggedIn).toEqual(true)

          api._loginExpiresAt = new Date(new Date().getTime() - 100000)
          expect(api.isLoggedIn).toEqual(false)


        it "should be a few seconds on the safe side", ->
          expect(api.isLoggedIn).toEqual(true)

          api._loginExpiresAt = new Date(new Date().getTime())
          expect(api.isLoggedIn).toEqual(false)

    describe 'login', ->
      beforeEach ->
        api._user = "user-1"
        api._offlineToken = "offline-token"

        spyOn(api, "POST").and.callFake((endpoint, data) ->
          if endpoint == "auth"
            if data.offline_token == 'invalid-offline-token'
              Promise.reject({"error":"offline_token_not_found"})
            else if data.offline_token == 'random-fail-offline-token'
              Promise.reject()
            else
              Promise.resolve({access_token: "access-token", token_type: "bearer"})
          else
            Promise.reject("Unknown endpoint")
        )

      it 'requires an offline token', ->
        api._offlineToken = undefined
        promise = api.login()
        expect(promise).toBeRejectedWith("NO_OFFLINE_TOKEN")

      it 'should POST the offline token to /auth', ->
        promise = api.login()
        expect(api.POST).toHaveBeenCalled()
        expect(api.POST.calls.argsFor(0)[1].offline_token).toEqual('offline-token')

      it 'should store the access token', (done) ->
        checks = () ->
          expect(api._access_token).toEqual("access-token")

        promise = api.login().then(checks)
        expect(promise).toBeResolved(done)

      it 'should handle token not found error', (done) ->
        api._offlineToken = 'invalid-offline-token'
        promise = api.login()
        expect(promise).toBeRejectedWith(jasmine.objectContaining({error: 'offline_token_not_found'}), done)

      it 'should handle generic failure', (done) ->
        api._offlineToken = 'random-fail-offline-token'
        promise = api.login()
        expect(promise).toBeRejected(done)

    describe '_request', ->
      beforeEach ->
        api._rootURL = '/'
        fetchMock.get('*', {})
        fetchMock.post('*', {})

      afterEach ->
        fetchMock.restore()

      it "should use fetch()", ->
        api._request('GET', 'trades')
        expect(fetchMock.lastUrl()).toEqual('/trades')

      it "should URL encode parameters for GET requests", ->
        api._request('GET', 'trades', {param: 1})
        expect(fetchMock.lastUrl()).toEqual('/trades?param=1')
        expect(fetchMock.lastOptions().method).toEqual('GET')

      it "should JSON encode POST data", ->
        api._request('POST', 'trades', {param: 1})
        expect(fetchMock.lastUrl()).toEqual('/trades')
        expect(fetchMock.lastOptions().method).toEqual('POST')
        expect(JSON.parse(fetchMock.lastOptions().body)).toEqual({param: 1})

      it "should add Authorization header if asked", ->
        api._access_token = 'session-token'
        api._loginExpiresAt = new Date(new Date().getTime() + 15000)
        api._request('GET', 'trades', undefined, true)
        expect(fetchMock.lastOptions().headers.Authorization).toEqual('Bearer session-token')

    describe 'REST', ->
      beforeEach ->
        spyOn(api, '_request')

      describe 'GET', ->
        it "should make a GET request", ->
          api.GET('/trades')
          expect(api._request).toHaveBeenCalled()
          expect(api._request.calls.argsFor(0)[0]).toEqual('GET')

      describe 'POST', ->
        it "should make a POST request", ->
          api.POST('/trades')
          expect(api._request).toHaveBeenCalled()
          expect(api._request.calls.argsFor(0)[0]).toEqual('POST')

      describe 'PATCH', ->
        it "should make a PATCH request", ->
          api.PATCH('/trades')
          expect(api._request).toHaveBeenCalled()
          expect(api._request.calls.argsFor(0)[0]).toEqual('PATCH')

      describe "authenticated", ->
        beforeEach ->
          api._access_token = 'session-token'
          api._loginExpiresAt = new Date(new Date().getTime() + 15000)
          spyOn(api, "login").and.callFake(() ->
            api._access_token = 'session-token'
            api._loginExpiresAt = new Date(new Date().getTime() + 15000)
            Promise.resolve()
          )

        it "should not login again if access token is valid", ->
          api.authGET('/trades')
          expect(api.login).not.toHaveBeenCalled()

        it "should refuse if no offline token is present", ->
          api._access_token = null
          api._offlineToken = null
          api.authGET('/trades')
          expect(api._request).not.toHaveBeenCalled()

        it "should login first if access token is absent", ->
          api._access_token = null
          api.authGET('/trades')
          expect(api.login).toHaveBeenCalled()

        it "should login first if access token is expired", ->
          api._loginExpiresAt = new Date(new Date().getTime() - 1)
          api.authGET('/trades')
          expect(api.login).toHaveBeenCalled()

        describe 'GET', ->
          it "should make a GET request", ->
            api.authGET('/trades')
            expect(api._request).toHaveBeenCalled()
            expect(api._request.calls.argsFor(0)[0]).toEqual('GET')
            expect(api._request.calls.argsFor(0)[3]).toEqual(true)

        describe 'POST', ->
          it "should make a POST request", ->
            api.authPOST('/trades')
            expect(api._request).toHaveBeenCalled()
            expect(api._request.calls.argsFor(0)[0]).toEqual('POST')
            expect(api._request.calls.argsFor(0)[3]).toEqual(true)

        describe 'PATCH', ->
          it "should make a PATCH request", ->
            api.authPATCH('/trades')
            expect(api._request).toHaveBeenCalled()
            expect(api._request.calls.argsFor(0)[0]).toEqual('PATCH')
            expect(api._request.calls.argsFor(0)[3]).toEqual(true)
