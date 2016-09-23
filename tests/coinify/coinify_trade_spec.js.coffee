proxyquire = require('proxyquireify')(require)

stubs = {
}

CoinifyTrade    = proxyquire('../../src/coinify/trade', stubs)

describe "CoinifyTrade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined

  api = undefined


  beforeEach ->

    tradeJSON = {
      id: 1142
      inCurrency: "USD"
      outCurrency: "BTC"
      inAmount: 40
      transferIn: {
        medium: "card"
        details: {
          paymentId: "05e18928-7b29-4b70-b29e-84cfe9fbc5ac"
        }
      }
      transferOut: {
        details: {
          account: "19g1YFsoR5duHgTFcs4HKnjKHH7PgNqBJM"
          }
      }
      outAmountExpected: 0.06454481
      state: "awaiting_transfer_in"
      receiptUrl: "my url"
      createTime: "2016-08-26T14:53:26.650Z"
    }

    tradeJSON2 = JSON.parse(JSON.stringify(tradeJSON))
    tradeJSON2.id = 1143

    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new CoinifyTrade()", ->

      it "should keep a reference to the API", ->
        api = {}
        delegate = {}
        t = new CoinifyTrade(tradeJSON, api, delegate)
        expect(t._api).toBe(api)
        expect(t._id).toBe(tradeJSON.id)
        expect(t._inCurrency).toBe(tradeJSON.inCurrency)
        expect(t._outCurrency).toBe(tradeJSON.outCurrency)
        expect(t._medium).toBe(tradeJSON.transferIn.medium)
        expect(t._receiveAddress).toBe(tradeJSON.transferOut.details.account)
        expect(t._state).toBe(tradeJSON.state)
        expect(t._iSignThisID).toBe(tradeJSON.transferIn.details.paymentId)
        expect(t._receiptUrl).toBe(tradeJSON.receiptUrl)

      it "should warn if there is an unknown state type", ->
        tradeJSON.state = "unknown"
        spyOn(window.console, 'warn')
        new CoinifyTrade(tradeJSON, api, {})
        expect(window.console.warn).toHaveBeenCalled()
        expect(window.console.warn.calls.argsFor(0)[1]).toEqual('unknown')

  describe "instance", ->
    profile = undefined
    trade   = undefined
    exchangeDelegate = undefined

    beforeEach ->
      profile = {
        name: "John Do"
        gender: 'male'
        mobile:
          countryCode: "1"
          number: "1234"
        address:
          street: "Hoofdstraat 1"
          city: "Amsterdam"
          zipcode: "1111 AA"
          state: "NH"
          country: "NL"
      }

      exchangeDelegate = {
        reserveReceiveAddress: () -> { receiveAddress: "1abcd", commit: -> }
        removeLabeledAddress: () ->
        releaseReceiveAddress: () ->
        commitReceiveAddress: () ->
        save: () -> Promise.resolve()
      }

      api = {
        authGET: (method) ->
          Promise.resolve({
            id: 1
            defaultCurrency: 'EUR'
            email: "john@do.com"
            profile: profile
            feePercentage: 3
            currentLimits:
              card:
                in:
                  daily:100
              bank:
                in:
                  daily:0
                  yearly:0
                out:
                  daily: 100
                  yearly:1000

            requirements: []
            level: {name: '1'}
            nextLevel: {name: '2'}
            state: 'awaiting_transfer_in'
          })
        authPOST: () -> Promise.resolve('something')
      }
      spyOn(api, "authGET").and.callThrough()
      spyOn(api, "authPOST").and.callThrough()
      trade = new CoinifyTrade(tradeJSON, api, exchangeDelegate)

    describe "set(obj)", ->
      it "set new object and does not change id or date", ->
        oldId = tradeJSON.id
        oldTimeStamp = trade._createdAt
        tradeJSON.id = 100
        tradeJSON.inCurrency = "monopoly"
        trade.set(tradeJSON)
        expect(trade._id).toBe(oldId)
        expect(trade._createdAt).toEqual(oldTimeStamp)
        expect(trade._inCurrency).toBe(tradeJSON.inCurrency)

      it "should round correctly", ->
        tradeJSON.inAmount = 35.05
        tradeJSON.transferIn.sendAmount  = 35.05
        tradeJSON.outAmount = 0.00003505
        tradeJSON.outAmountExpected = 0.00003505

        trade.set(tradeJSON)
        expect(trade.inAmount).toEqual(3505)
        expect(trade.sendAmount).toEqual(3505)
        expect(trade.outAmount).toEqual(3505)
        expect(trade.outAmountExpected).toEqual(3505)

      it "state should stay 'rejected' after card decline", ->
        trade._isDeclined = true
        trade.set(tradeJSON) # {state: 'awaiting_transfer_in'}
        expect(trade.state).toEqual('rejected')

    describe "declined()", ->
      beforeEach ->
        trade.set(tradeJSON)

      it "should change state to rejected and set _isDeclined", ->
        trade.declined()
        expect(trade.state).toEqual('rejected')
        expect(trade._isDeclined).toEqual(true)


    describe "cancel()", ->
      beforeEach ->
        api.authPATCH = () ->
                  then: (cb) ->
                    cb({state: "cancelled"})
        spyOn(api, "authPATCH").and.callThrough()

      it "should cancel a trade and update its state", ->
        trade.cancel()
        expect(api.authPATCH).toHaveBeenCalledWith('trades/' + trade._id + '/cancel')
        expect(trade._state).toBe('cancelled')

      it "should notifiy the delegate the receive address is no longer needed", ->
        spyOn(exchangeDelegate, "releaseReceiveAddress")
        trade.cancel()
        expect(exchangeDelegate.releaseReceiveAddress).toHaveBeenCalled()

    describe "watchAddress()", ->
      it "should return a promise with the total received", (done) ->
        testBitcoinReceived = (bit_rec) ->
          expect(bit_rec).toBe(1714)

        trade.watchAddress()
          .then(testBitcoinReceived)
          .catch(console.log)
          .then(done)

        trade._watchAddressResolve(1714)

    describe "watchAddress()", ->
      it "should listen the websocket", (done) ->
        # not sure how to test this esoteric case full of sideeffects with the eventListener
        pending()

        # getBalanceAnswer = {
        #   '19g1YFsoR5duHgTFcs4HKnjKHH7PgNqBJM': {
        #     total_received: 0
        #   }
        # }
        # spyOn(API, "getBalances").and.returnValue(Promise.resolve(getBalanceAnswer))
        #
        # testBitcoinReceived = (bit_rec) -> expect(bit_rec).toBe(1715)
        #
        # trade.watchAddress()
        #   .then(testBitcoinReceived)
        #   .catch(console.log)
        #   .then(done)
        #
        # WalletStore.sendEvent('on_tx_received', {out: [{addr: '19g1YFsoR5duHgTFcs4HKnjKHH7PgNqBJM', value: 1715}]});


    describe "fakeBankTransfer()", ->
      it "should POST a fake bank-transfer", (done) ->
        # probably no test needed
        pending()

    describe "buy()", ->
      quote = undefined

      beforeEach ->
        spyOn(CoinifyTrade.prototype, "_monitorAddress").and.callFake(() ->)
        quote = { id: 101 }
        api.authPOST = () ->
          Promise.resolve(tradeJSON)

      it "should POST the quote and resolve the trade", (done) ->
        spyOn(api, "authPOST").and.callThrough()
        testTrade = (t) ->
          expect(api.authPOST).toHaveBeenCalled()
          expect(t.id).toEqual(1142)

        promise = CoinifyTrade.buy(quote, 'bank', api, exchangeDelegate)
          .then(testTrade)

        expect(promise).toBeResolved(done)

      it "should watch the address", (done) ->
        checks = (trade) ->
          expect(trade._monitorAddress).toHaveBeenCalled()

        promise = CoinifyTrade.buy(quote, 'bank', api, exchangeDelegate)
          .then(checks)

        expect(promise).toBeResolved(done)


    describe "fetchAll()", ->
      beforeEach ->
        spyOn(exchangeDelegate, "releaseReceiveAddress").and.callThrough()

      it "should fetch all the trades", (done) ->
        api.authGET = () ->
                        then: (cb) ->
                          cb([tradeJSON,tradeJSON2])

        check = (res) ->
          expect(res.length).toBe(2)
          done()

        promise = CoinifyTrade.fetchAll(api).then(check)
        expect(promise).toBeResolved()

    describe "process", ->
      it "should release addresses for cancelled trades", ->
        pending()

    describe "refresh()", ->
      beforeEach ->
        api.authGET = () ->
          Promise.resolve({})

        spyOn(api , "authGET").and.callThrough()

      it "should authGET /trades/:id and update the trade object", (done) ->
        checks  = () ->
          expect(api.authGET).toHaveBeenCalledWith('trades/' + trade._id)
          expect(trade.set).toHaveBeenCalled()

        trade.set = () -> Promise.resolve(trade)
        spyOn(trade, "set").and.callThrough()

        promise = trade.refresh().then(checks)

        expect(promise).toBeResolved(done)


      it "should save metadata", (done) ->
        checks = () ->
          expect(trade._coinifyDelegate.save).toHaveBeenCalled()

        trade.set = () -> Promise.resolve(trade)
        spyOn(trade._coinifyDelegate, "save").and.callThrough()
        promise = trade.refresh().then(checks)

        expect(promise).toBeResolved(done)

      it "should resolve with trade object", (done) ->
        checks = (res) ->
          expect(res).toEqual(trade)

        trade.set = () -> Promise.resolve(trade)
        promise = trade.refresh().then(checks)

        expect(promise).toBeResolved(done)

    describe "_checkOnce()", ->
      _getTransactionHashCalled = undefined

      beforeEach ->
        spyOn(CoinifyTrade, '_getTransactionHash').and.callFake(() ->
          _getTransactionHashCalled = true
        )


      it "should call _getTransactionHash", (done) ->
        coinifyDelegate = {
          save: () -> Promise.resolve()
        }

        filter = () -> true

        promise = CoinifyTrade._checkOnce([trade], filter, coinifyDelegate).catch(console.log)

        expect(promise).toBeResolved(done)

        expect(_getTransactionHashCalled).toEqual(true)
