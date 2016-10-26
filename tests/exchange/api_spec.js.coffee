proxyquire = require('proxyquireify')(require)

require('isomorphic-fetch')

fetchMock = require('fetch-mock')

stubs = {
}

API = proxyquire('../../src/exchange/api', stubs)

describe "API", ->

  api = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new API()", ->
      it "should have a contructor", ->
        api = new API()
        expect(api instanceof API).toBeTruthy()

  describe "instance", ->
    beforeEach ->
      api = new API()

    describe '_request', ->
      beforeEach ->
        fetchMock.get('/fail', {throws: 'fail'})
        fetchMock.get('/fail-500', 500)
        fetchMock.post('/empty', 204)
        fetchMock.get('*', {})
        fetchMock.post('*', {})

      afterEach ->
        fetchMock.restore()

      it "should use fetch()", ->
        api._request('GET', '/trades', {}, {})
        expect(fetchMock.lastUrl()).toEqual('/trades')

      it 'should make a GET request', ->
        api._request('GET', 'trades', {}, {})
        expect(fetchMock.lastOptions().method).toEqual('GET')

      it 'should make a POST request', (done) ->
        promise = api._request('POST', 'trades', {}, {}).then((res) ->
          expect(res).toEqual({})
        )
        expect(fetchMock.lastOptions().method).toEqual('POST')
        expect(promise).toBeResolved(done)

      it 'should handle a POST with an empty response', (done) ->
        promise = api._request('POST', 'empty', {}, {})
        expect(promise).toBeResolvedWith(undefined, done)

      it "should URL encode parameters for GET requests", ->
        api._request('GET', '/trades', {param: 1}, {})
        expect(fetchMock.lastUrl()).toEqual('/trades?param=1')
        expect(fetchMock.lastOptions().method).toEqual('GET')

      it "should skip parameters for GET requests if there's no data", ->
        api._request('GET', '/trades', {}, {})
        expect(fetchMock.lastUrl()).toEqual('/trades')
        api._request('GET', '/trades', undefined, {})
        expect(fetchMock.lastUrl()).toEqual('/trades')

      it "should JSON encode POST data", ->
        api._request('POST', '/trades', {param: 1}, {})
        expect(fetchMock.lastUrl()).toEqual('/trades')
        expect(fetchMock.lastOptions().method).toEqual('POST')
        expect(JSON.parse(fetchMock.lastOptions().body)).toEqual({param: 1})

      it "should add headers", ->
        api._request('GET', '/trades', undefined, {Authorization: 'Bearer session-token'})
        expect(fetchMock.lastOptions().headers.Authorization).toEqual('Bearer session-token')

      describe 'network error', ->
        it "should throw an error message", (done) ->
          promise = api._request('GET', '/fail')
          expect(promise).toBeRejectedWith(jasmine.objectContaining(error: 'EXCHANGE_CONNECT_ERROR'), done)

      describe 'network error', ->
        it "should throw an error message", (done) ->
          promise = api._request('GET', '/fail-500')
          expect(promise).toBeRejectedWith('', done)
