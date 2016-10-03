proxyquire = require('proxyquireify')(require)

require('isomorphic-fetch')

fetchMock = require('fetch-mock')

stubs = {
}

API = proxyquire('../../src/sfox/api', stubs)

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
      api._accountToken = "account-token"

    describe "Getter", ->
      describe "hasAccount", ->
        it "should use _accountToken to see if user has account", ->
          api._accountToken = undefined
          expect(api.hasAccount).toEqual(false)

          api._accountToken = "token"
          expect(api.hasAccount).toEqual(true)

    describe '_request', ->
      beforeEach ->
        api._rootURL = '/'
        api._apiKey = 'api-key'
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

      it "should add API key header", ->
        api._apiKey = 'api-key'
        api._request('GET', 'trades', undefined)
        expect(fetchMock.lastOptions().headers["X-SFOX-PARTNER-ID"]).toEqual('api-key')

      it "should add Authorization header if asked", ->
        api._accountToken = 'account-token'
        api._request('GET', 'trades', undefined, true)
        expect(fetchMock.lastOptions().headers.Authorization).toEqual('Bearer account-token')

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
          api._accountToken = undefined

        it "should refuse if no account token is present for GET", ->
          api.authGET('/trades')

          expect(fetchMock.lastUrl()).not.toBeDefined()

        it "should refuse if no account token is present for POST", ->
          api.authPOST('/trades')

          expect(fetchMock.lastUrl()).not.toBeDefined()

        it "should refuse if no account token is present for PATCH", ->
          api.authPATCH('/trades')

          expect(fetchMock.lastUrl()).not.toBeDefined()

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
