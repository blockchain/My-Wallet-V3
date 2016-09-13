proxyquire = require('proxyquireify')(require)

stubs = {
}

CoinifyTrade    = proxyquire('../../src/coinify/trade', stubs)

describe "CoinifyTrade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined


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

      it "should keep a reference to Coinify parent object", ->
        coinify = {}
        t = new CoinifyTrade(tradeJSON, coinify)
        expect(t._coinify).toBe(coinify)
        expect(t._id).toBe(tradeJSON.id)
        expect(t._inCurrency).toBe(tradeJSON.inCurrency)
        expect(t._outCurrency).toBe(tradeJSON.outCurrency)
        expect(t._medium).toBe(tradeJSON.transferIn.medium)
        expect(t._receiveAddress).toBe(tradeJSON.transferOut.details.account)
        expect(t._state).toBe(tradeJSON.state)
        expect(t._iSignThisID).toBe(tradeJSON.transferIn.details.paymentId)
        expect(t._receiptUrl).toBe(tradeJSON.receiptUrl)

  describe "instance", ->

    coinify = undefined
    profile = undefined
    trade   = undefined

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
      }

      coinify = {
        _save: () -> Promise.resolve()
        save: () -> Promise.resolve()
        _trades: []
        trades: []
        authGET: (method) -> {
          then: (cb) ->
            cb({
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
              state: 'undefined'
            })
            {
              catch: () ->
            }
        }
        authPOST: () -> Promise.resolve('something')
        _delegate: exchangeDelegate
        delegate: exchangeDelegate
      }
      spyOn(coinify, "authGET").and.callThrough()
      spyOn(coinify, "authPOST").and.callThrough()
      trade = new CoinifyTrade(tradeJSON, coinify)

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

    describe "cancel()", ->
      beforeEach ->
        coinify.authPATCH = () ->
                  then: (cb) ->
                    cb({state: "cancelled"})
        spyOn(coinify, "authPATCH").and.callThrough()

      it "should cancel a trade and update its state", ->
        trade.cancel()
        expect(coinify.authPATCH).toHaveBeenCalledWith('trades/' + trade._id + '/cancel')
        expect(trade._state).toBe('cancelled')

      it "should notifiy the delegate the receive address is no longer needed", ->
        spyOn(coinify.delegate, "releaseReceiveAddress")
        trade.cancel()
        expect(coinify.delegate.releaseReceiveAddress).toHaveBeenCalled()

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
        coinify.authPOST = () -> Promise.resolve(tradeJSON)
        spyOn(coinify, "authPOST").and.callThrough()

      it "should POST the quote and add the received trade to the list", (done) ->
        testTrade = (t) ->
          expect(coinify.authPOST).toHaveBeenCalled()
          expect(coinify._trades.length).toBe(1)

        promise = CoinifyTrade.buy(quote, undefined, coinify)
          .then(testTrade)

        expect(promise).toBeResolved(done)

      it "should watch the address", (done) ->
        checks = (trade) ->
          expect(trade._monitorAddress).toHaveBeenCalled()

        promise = CoinifyTrade.buy(quote, undefined, coinify)
          .then(checks)

        expect(promise).toBeResolved(done)


    describe "fetchAll()", ->
      beforeEach ->
        spyOn(coinify.delegate, "releaseReceiveAddress").and.callThrough()

      it "should fetch all the trades", (done) ->
        myCoinify = {
          authGET: () ->
            then: (cb) ->
              cb([tradeJSON,tradeJSON2])
          _trades: []
          isLoggedIn: true
          save: () -> Promise.resolve()
        }
        check = () ->
          expect(myCoinify._trades.length).toBe(2)

        spyOn(myCoinify, "authGET").and.callThrough()
        promise = CoinifyTrade.fetchAll(myCoinify).then(check)
        expect(promise).toBeResolved(done)

      it "should update existing trades", (done) ->
        tradeJSON.state = "completed_test"
        myCoinify = {
          authGET: () ->
            then: (cb) ->
              cb([tradeJSON,tradeJSON2])
          _trades: []
          isLoggedIn: true
          save: () -> Promise.resolve()
        }
        check = () ->
          expect(myCoinify._trades.length).toBe(2)
          expect(myCoinify._trades[0].state).toEqual('completed_test')

        spyOn(myCoinify, "authGET").and.callThrough()
        promise = CoinifyTrade.fetchAll(myCoinify).then(check)
        expect(promise).toBeResolved(done)

      it "should release addresses for cancelled trades", ->
        pending()

    describe "refresh()", ->
      it "should authGET /trades/:id and update the trade object", ->
        trade.set = () -> trade
        spyOn(trade, "set").and.callThrough()
        trade.refresh()
        expect(coinify.authGET).toHaveBeenCalledWith('trades/' + trade._id)
        expect(trade.set).toHaveBeenCalled()

    describe "_checkOnce()", ->
      myCoinify = undefined
      _getTransactionHashCalled = undefined

      beforeEach ->
        spyOn(CoinifyTrade, '_getTransactionHash').and.callFake(() ->
          _getTransactionHashCalled = true
        )

        myCoinify = {
          _trades: [trade]
          isLoggedIn: true
          save: () ->
            Promise.resolve()
        }

        myCoinify._trades[0].status = 'completed'


      it "should call _getTransactionHash", (done) ->

        filter = () -> true

        promise = CoinifyTrade._checkOnce(myCoinify, filter)

        expect(promise).toBeResolved(done)

        expect(_getTransactionHashCalled).toEqual(true)
