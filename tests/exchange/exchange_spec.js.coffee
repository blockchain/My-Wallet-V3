proxyquire = require('proxyquireify')(require)

API = () ->
  {
    GET: () ->
    POST: () ->
    PATCH: () ->
  }

Trade = (obj) ->
  obj
tradesJSON = [
  {
    id: 1
    state: "awaiting_transfer_in"
  }
]
Trade.spyableProcessTrade = () ->
Trade.fetchAll = () ->
  Promise.resolve([
    {
      id: tradesJSON[0].id
      state: tradesJSON[0].state
      process: Trade.spyableProcessTrade
    }
  ])

Quote = (obj) ->
  obj
Quote.getQuote = () ->

stubs = {
  './trade' : Trade
  './quote' : Quote
  './api' : API
}

Exchange = proxyquire('../../src/exchange/exchange', stubs)

describe "Exchange", ->

  e = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new Exchange()", ->

      it "should work", ->
        e = new Exchange({}, Trade, Quote)
        expect(e.constructor.name).toEqual("Exchange")

  describe "instance", ->
    beforeEach ->
      e = new Exchange({
        email: () -> "info@blockchain.com"
        isEmailVerified: () -> true
        getEmailToken: () -> "json-web-token"
        save: () -> Promise.resolve()
      }, Trade, Quote)
      e.api = new API()

    describe "debug", ->
      it "should set debug", ->
        e.debug = true
        expect(e.debug).toEqual(true)

      it "should set debug flag on the delegate", ->
        e._delegate = {debug: false}
        e.debug = true
        expect(e.delegate.debug).toEqual(true)

      it "should set debug flag on trades", ->
        e._trades = [{debug: false}]
        e.debug = true
        expect(e.trades[0].debug).toEqual(true)

    describe "updateList", ->
      it "...", ->
        pending()

    describe 'getTrades()', ->
      it 'should call Trade.fetchAll', ->
        spyOn(Trade, 'fetchAll').and.callThrough()
        e.getTrades()
        expect(Trade.fetchAll).toHaveBeenCalled()

      it 'should store the trades', (done) ->
        checks = (res) ->
          expect(e._trades.length).toEqual(1)

        promise = e.getTrades().then(checks)
        expect(promise).toBeResolved(done)

      it 'should resolve the trades', (done) ->
        checks = (res) ->
          expect(res.length).toEqual(1)
          done()

        promise = e.getTrades().then(checks)

      it 'should call process on each trade', (done) ->
        spyOn(Trade, 'spyableProcessTrade')

        checks = (res) ->
          expect(Trade.spyableProcessTrade).toHaveBeenCalled()
          done()

        e.getTrades().then(checks)

      it "should update existing trades", (done) ->
        e._trades = [
          {
            _id: 1
            process: () ->
            state: 'awaiting_transfer_in'
            set: (obj) ->
              this.state = obj.state
          },
          {
            _id: 2
            process: () ->
            state: 'awaiting_transfer_in'
            set: () ->
              this.state = obj.state
          }
        ]

        tradesJSON[0].state = "completed_test"

        checks = () ->
          expect(e._trades.length).toBe(2)
          expect(e._trades[0].state).toEqual('completed_test')
          done()

        e.getTrades().then(checks)
