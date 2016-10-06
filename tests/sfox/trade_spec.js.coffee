proxyquire = require('proxyquireify')(require)

stubs = {
}

Trade = proxyquire('../../src/sfox/trade', stubs)

describe "SFOX Trade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined

  api = undefined

  delegate = undefined

  beforeEach ->
    jasmine.clock().uninstall();
    jasmine.clock().install()

    tradeJSON = {
      id: 1142
      status: "pending"
      quote_currency: "usd"
      base_currency: "btc"
    }

    tradeJSON2 = JSON.parse(JSON.stringify(tradeJSON))
    tradeJSON2.id = 1143

    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()
    jasmine.clock().uninstall()

  describe "class", ->
    describe "new Trade()", ->
      delegate = {
        getReceiveAddress: () ->
        deserializeExtraFields: () ->
      }

      api = {}

      it "should keep a reference to the API", ->
        api = {}

        t = new Trade(tradeJSON, api, delegate)
        expect(t._api).toBe(api)

      it "should parse the JSON", ->
        pending()
        # api = {}
        #
        # t = new Trade(tradeJSON, api, delegate)
        # expect(t._api).toBe(api)
        # expect(t._id).toBe(tradeJSON.id)
        # more fields

      it "should warn if there is an unknown state type", ->
        tradeJSON.status = "unknown"
        spyOn(window.console, 'warn')
        new Trade(tradeJSON, api, delegate)
        expect(window.console.warn).toHaveBeenCalled()
        expect(window.console.warn.calls.argsFor(0)[1]).toEqual('unknown')

  describe "instance", ->
    trade   = undefined
    exchangeDelegate = undefined

    beforeEach ->
      exchangeDelegate = {
        reserveReceiveAddress: () -> { receiveAddress: "1abcd", commit: -> }
        removeLabeledAddress: () ->
        releaseReceiveAddress: () ->
        commitReceiveAddress: () ->
        save: () -> Promise.resolve()
        deserializeExtraFields: () ->
        getReceiveAddress: () ->
        serializeExtraFields: () ->
        monitorAddress: () ->
      }

      api = {
        authGET: (method) ->
          Promise.resolve({
            id: 1
            quote_currency: "usd"
            base_currency: "btc"
            # more fields
          })
        authPOST: () -> Promise.resolve('something')
      }
      spyOn(api, "authGET").and.callThrough()
      spyOn(api, "authPOST").and.callThrough()
      trade = new Trade(tradeJSON, api, exchangeDelegate)

    describe "getters", ->
      it "should have some simple ones restored from trades JSON", ->
        pending()
        # trade = new Trade({
        #   id: 1142
        #   # More fields
        # }, api, exchangeDelegate)
        #
        # expect(trade.id).toEqual(1142)
        # expect(trade.state).toEqual('awaiting_transfer_in')
        # expect(trade.confirmed).toEqual(false)
        # expect(trade.isBuy).toEqual(true)
        # expect(trade.txHash).toEqual(null)

      it "should have more simple ones loaded from API", ->
        pending()
        # trade = new Trade(tradeJSON, api, exchangeDelegate)
        # expect(trade.id).toEqual(1142)
        # # more fields...
        # expect(trade.txHash).toEqual(null)

    describe "deserialize from trades JSON", ->
      beforeEach ->
        tradeJSON = {
          id: 1142
          state: 'awaiting_transfer_in'
          tx_hash: 'hash'
          confirmed: false
          is_buy: true
        }

      it "should ask the delegate to deserialize extra fields", ->

        spyOn(exchangeDelegate, "deserializeExtraFields")
        new Trade(tradeJSON, api, exchangeDelegate)
        expect(exchangeDelegate.deserializeExtraFields).toHaveBeenCalled()

      it "should pass in self, so delegate can set extra fields", ->
        tradeJSON.extra = "test"
        exchangeDelegate.deserializeExtraFields = (deserialized, t) ->
          t.extra = deserialized.extra

        trade = new Trade(tradeJSON, api, exchangeDelegate)
        expect(trade.extra).toEqual('test')

    describe "serialize", ->
      it "should store several fields", ->
        pending()
        # trade._txHash = "hash"
        # expect(JSON.stringify(trade)).toEqual(JSON.stringify({
        #   id: 1142
        #   state: 'awaiting_transfer_in'
        #   tx_hash: 'hash'
        #   confirmed: false
        #   is_buy: true
        # }))

      it "should ask the delegate to store more fields", ->
        spyOn(trade._delegate, "serializeExtraFields")
        JSON.stringify(trade)
        expect(trade._delegate.serializeExtraFields).toHaveBeenCalled()

      it "should serialize any fields added by the delegate", ->
        trade._delegate.serializeExtraFields = (t) ->
          t.extra_field = 'test'

        s = JSON.stringify(trade)
        expect(JSON.parse(s).extra_field).toEqual('test')

    describe "isBuy", ->
      it "should equal _is_buy", ->
        trade._is_buy = false
        expect(trade.isBuy).toEqual(false)

        trade._is_buy = true
        expect(trade.isBuy).toEqual(true)

    describe "set(obj)", ->
      it "set new object and does not change id or date", ->
        pending()
        # oldId = tradeJSON.id
        # oldTimeStamp = trade._createdAt
        # tradeJSON.id = 100
        # tradeJSON.inCurrency = "monopoly"
        # trade.set(tradeJSON)
        # expect(trade._id).toBe(oldId)
        # expect(trade._createdAt).toEqual(oldTimeStamp)
        # expect(trade._inCurrency).toBe(tradeJSON.inCurrency)

      it "should round correctly for buy", ->
        pending()
        # tradeJSON.inAmount = 35.05
        # tradeJSON.transferIn.sendAmount  = 35.05
        # tradeJSON.outAmount = 0.00003505
        # tradeJSON.outAmountExpected = 0.00003505
        #
        # trade.set(tradeJSON)
        # expect(trade.inAmount).toEqual(3505)
        # expect(trade.sendAmount).toEqual(3505)
        # expect(trade.outAmount).toEqual(3505)
        # expect(trade.outAmountExpected).toEqual(3505)

      it "should round correctly for sell", ->
        pending()
        # tradeJSON.inCurrency = 'BTC'
        # tradeJSON.outCurrency = 'EUR'
        # tradeJSON.inAmount = 0.00003505
        # tradeJSON.transferIn.sendAmount  = 0.00003505
        # tradeJSON.outAmount = 35.05
        # tradeJSON.outAmountExpected = 35.05
        #
        # trade.set(tradeJSON)
        # expect(trade.inAmount).toEqual(3505)
        # expect(trade.sendAmount).toEqual(3505)
        # expect(trade.outAmount).toEqual(3505)
        # expect(trade.outAmountExpected).toEqual(3505)

    describe "fetchAll()", ->
      beforeEach ->
        spyOn(exchangeDelegate, "releaseReceiveAddress").and.callThrough()

      # it "should fetch all the trades", (done) ->
      #   api.authGET = () ->
      #                   then: (cb) ->
      #                     cb([tradeJSON,tradeJSON2])
      #
      #   check = (res) ->
      #     expect(res.length).toBe(2)
      #     done()
      #
      #   promise = Trade.fetchAll(api).then(check)
      #   expect(promise).toBeResolved()

    describe "refresh()", ->
      beforeEach ->
        api.authGET = () ->
          Promise.resolve({})

        spyOn(api , "authGET").and.callThrough()

      # it "should authGET /trades/:id and update the trade object", (done) ->
      #   checks  = () ->
      #     expect(api.authGET).toHaveBeenCalledWith('trades/' + trade._id)
      #     expect(trade.set).toHaveBeenCalled()
      #
      #   trade.set = () -> Promise.resolve(trade)
      #   spyOn(trade, "set").and.callThrough()
      #
      #   promise = trade.refresh().then(checks)
      #
      #   expect(promise).toBeResolved(done)


      it "should save metadata", (done) ->
        pending()
        # checks = () ->
        #   expect(trade._delegate.save).toHaveBeenCalled()
        #
        # trade.set = () -> Promise.resolve(trade)
        # spyOn(trade._delegate, "save").and.callThrough()
        # promise = trade.refresh().then(checks)
        #
        # expect(promise).toBeResolved(done)

      it "should resolve with trade object", (done) ->
        pending()
        # checks = (res) ->
        #   expect(res).toEqual(trade)
        #
        # trade.set = () -> Promise.resolve(trade)
        # promise = trade.refresh().then(checks)
        #
        # expect(promise).toBeResolved(done)
