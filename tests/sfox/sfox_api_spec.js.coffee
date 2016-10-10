proxyquire = require('proxyquireify')(require)

class ExchangeAPI
  _request: () ->

stubs = {
  '../exchange/api': ExchangeAPI
}

API = proxyquire('../../src/sfox/api', stubs)

describe "SFOX API", ->

  api = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "instance", ->
    beforeEach ->
      api = new API()
      api._accountToken = "account-token"
      api._apiKey = 'api-key'


    describe "Getter", ->
      describe "hasAccount", ->
        it "should use _accountToken to see if user has account", ->
          api._accountToken = undefined
          expect(api.hasAccount).toEqual(false)

          api._accountToken = "token"
          expect(api.hasAccount).toEqual(true)

    describe '_url()', ->
      it "...", ->
        pending()

    describe '_request()', ->
      beforeEach ->
        spyOn(ExchangeAPI.prototype, '_request')
        spyOn(api, "_url").and.callFake((subdomain, version, endpoint) ->
          return "/" + endpoint
        )

      it "should set the API key header for all requests", ->
        api._request('GET', 'trades', 'v1', 'api', {}, false)
        expect(ExchangeAPI.prototype._request).toHaveBeenCalled()
        expect(ExchangeAPI.prototype._request.calls.argsFor(0)[3]['X-SFOX-PARTNER-ID']).toEqual('api-key')

      it "should not set the API key header for quotes", ->
        api._request('GET', 'trades', 'v1', 'quotes', {}, false)
        expect(ExchangeAPI.prototype._request.calls.argsFor(0)[3]['X-SFOX-PARTNER-ID']).not.toBeDefined()

      it "should set the account token for authenticated requests", ->
        api._request('GET', 'trades', 'v1', 'api', {}, true)
        expect(ExchangeAPI.prototype._request).toHaveBeenCalled()
        expect(ExchangeAPI.prototype._request.calls.argsFor(0)[3]['Authorization']).toEqual('Bearer account-token')

      it "should not set the account token for unauthenticated requests", ->
        api._request('GET', 'trades', 'v1', 'api', {}, false)
        expect(ExchangeAPI.prototype._request).toHaveBeenCalled()
        expect(ExchangeAPI.prototype._request.calls.argsFor(0)[3]['Authorization']).not.toBeDefined()

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
