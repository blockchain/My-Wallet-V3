proxyquire = require('proxyquireify')(require)

BankAccount = () ->
  {mock: "bank-account"}

stubs = {
  './bank-account' : BankAccount
}

Trade = proxyquire('../../src/coinify/trade', stubs)

describe "Coinify Trade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined

  api = undefined

  delegate = undefined

  beforeEach ->
    jasmine.clock().uninstall();
    jasmine.clock().install()

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
      updateTime: "2016-08-26T14:54:00.000Z"
      quoteExpireTime: "2016-08-26T15:10:00.000Z"
    }

    tradeJSON2 = JSON.parse(JSON.stringify(tradeJSON))
    tradeJSON2.id = 1143

  afterEach ->
    jasmine.clock().uninstall()

  describe "class", ->
    describe "new Trade()", ->
      delegate = {
        getReceiveAddress: () ->
      }

      it "should keep a reference to the API", ->
        api = {}

        t = new Trade(tradeJSON, api, delegate)
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
        new Trade(tradeJSON, api, delegate)
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
        deserializeExtraFields: () ->
        getReceiveAddress: () ->
        serializeExtraFields: () ->
        monitorAddress: () ->
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
      trade = new Trade(tradeJSON, api, exchangeDelegate)
      trade._getQuote = (api, amount, currency) ->
        Promise.resolve({quoteAmount: 0.071})

    describe "getters", ->
      it "should have some simple ones restored from trades JSON", ->
        trade = new Trade({
          id: 1142
          state: 'awaiting_transfer_in'
          tx_hash: null
          confirmed: false
          is_buy: true
        }, api, exchangeDelegate)

        expect(trade.id).toEqual(1142)
        expect(trade.state).toEqual('awaiting_transfer_in')
        expect(trade.confirmed).toEqual(false)
        expect(trade.isBuy).toEqual(true)
        expect(trade.txHash).toEqual(null)

      it "should have more simple ones loaded from API", ->
        trade = new Trade(tradeJSON, api, exchangeDelegate)
        expect(trade.id).toEqual(1142)
        expect(trade.iSignThisID).toEqual('05e18928-7b29-4b70-b29e-84cfe9fbc5ac')
        expect(trade.quoteExpireTime).toEqual(new Date('2016-08-26T15:10:00.000Z'))
        expect(trade.createdAt).toEqual(new Date('2016-08-26T14:53:26.650Z'))
        expect(trade.updatedAt).toEqual(new Date('2016-08-26T14:54:00.000Z'))
        expect(trade.inCurrency).toEqual('USD')
        expect(trade.outCurrency).toEqual('BTC')
        expect(trade.inAmount).toEqual(4000)
        expect(trade.medium).toEqual('card')
        expect(trade.state).toEqual('awaiting_transfer_in')
        expect(trade.sendAmount).toEqual(0)
        expect(trade.outAmount).toEqual(0)
        expect(trade.outAmountExpected).toEqual(6454481)
        expect(trade.receiptUrl).toEqual('my url')
        expect(trade.receiveAddress).toEqual('19g1YFsoR5duHgTFcs4HKnjKHH7PgNqBJM')
        expect(trade.bitcoinReceived).toEqual(false)
        expect(trade.confirmed).toEqual(false)
        expect(trade.isBuy).toEqual(true)
        expect(trade.txHash).toEqual(null)

      it "should have a bank account for a bank trade", ->
        tradeJSON.transferIn = {
          medium: "bank"
          details: {} # Bank account details are mocked
        }
        trade = new Trade(tradeJSON, api, exchangeDelegate)
        expect(trade.bankAccount).toEqual({mock: "bank-account"})

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
        trade._txHash = "hash"
        expect(JSON.stringify(trade)).toEqual(JSON.stringify({
          id: 1142
          state: 'awaiting_transfer_in'
          tx_hash: 'hash'
          confirmed: false
          is_buy: true
        }))

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
      it "should equal _is_buy if set", ->
        trade._is_buy = false
        expect(trade.isBuy).toEqual(false)

        trade._is_buy = true
        expect(trade.isBuy).toEqual(true)

      it "should default to true for older test wallets", ->
        trade._is_buy = undefined
        trade._outCurrency = undefined
        expect(trade.isBuy).toEqual(true)

      it "should be true if out currency is BTC", ->
        trade._is_buy = undefined
        trade._outCurrency = 'BTC'
        expect(trade.isBuy).toEqual(true)

        trade._outCurrency = 'EUR'
        expect(trade.isBuy).toEqual(false)

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

      it "should round correctly for buy", ->
        tradeJSON.inAmount = 35.05
        tradeJSON.transferIn.sendAmount  = 35.05
        tradeJSON.outAmount = 0.00003505
        tradeJSON.outAmountExpected = 0.00003505

        trade.set(tradeJSON)
        expect(trade.inAmount).toEqual(3505)
        expect(trade.sendAmount).toEqual(3505)
        expect(trade.outAmount).toEqual(3505)
        expect(trade.outAmountExpected).toEqual(3505)

      it "should round correctly for sell", ->
        tradeJSON.inCurrency = 'BTC'
        tradeJSON.outCurrency = 'EUR'
        tradeJSON.inAmount = 0.00003505
        tradeJSON.transferIn.sendAmount  = 0.00003505
        tradeJSON.outAmount = 35.05
        tradeJSON.outAmountExpected = 35.05

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

    describe "fakeBankTransfer()", ->
      it "should POST a fake bank-transfer", () ->
        trade.fakeBankTransfer()
        expect(api.authPOST).toHaveBeenCalledWith('trades/1142/test/bank-transfer', {
          sendAmount: 40
          currency: 'USD'
        })

    describe "buy()", ->
      quote = undefined

      beforeEach ->
        spyOn(Trade.prototype, "_monitorAddress").and.callFake(() ->)
        quote = { id: 101 }
        api.authPOST = () ->
          Promise.resolve(tradeJSON)

      it "should POST the quote and resolve the trade", (done) ->
        spyOn(api, "authPOST").and.callThrough()
        testTrade = (t) ->
          expect(api.authPOST).toHaveBeenCalled()
          expect(t.id).toEqual(1142)

        promise = Trade.buy(quote, 'bank', api, exchangeDelegate)
          .then(testTrade)

        expect(promise).toBeResolved(done)

      it "should watch the address", (done) ->
        checks = (trade) ->
          expect(trade._monitorAddress).toHaveBeenCalled()

        promise = Trade.buy(quote, 'bank', api, exchangeDelegate)
          .then(checks)

        expect(promise).toBeResolved(done)


    describe "fetchAll()", ->
      beforeEach ->
        spyOn(exchangeDelegate, "releaseReceiveAddress").and.callThrough()

      it "should fetch all the trades", (done) ->
        api.authGET = () ->
          Promise.resolve([tradeJSON,tradeJSON2])

        check = (res) ->
          expect(res.length).toBe(2)
          done()

        promise = Trade.fetchAll(api).then(check)
        expect(promise).toBeResolved()

    describe "btcExpected", ->
      beforeEach ->
        now = new Date(2016, 9, 25, 12, 10, 0) # 12:10:00
        jasmine.clock().mockDate(now);
        trade.quoteExpireTime = new Date(2016, 9, 25, 12, 15, 0) # 12:15:00

      it "should use the quote if that's still valid", ->
        promise = trade.btcExpected()
        expect(promise).toBeResolvedWith(0.06454481)

      describe "when quote expired", ->
        beforeEach ->
          trade._lastBtcExpectedGuessAt = new Date(2016, 9, 25, 12, 15, 15) # 12:15:15
          trade._lastBtcExpectedGuess = 0.07

        it "should use the last value if quote expired less than a minute ago", ->
          jasmine.clock().mockDate(new Date(2016, 9, 25, 12, 15, 45)) # 12:15:45

          promise = trade.btcExpected()
          expect(promise).toBeResolvedWith(0.07)

        it "should get and store quote", (done) ->
          now = new Date(2016, 9, 25, 12, 16, 15)
          jasmine.clock().mockDate(now) # 12:16:15
          spyOn(trade, "_getQuote").and.callThrough()

          checks = () ->
            expect(trade._lastBtcExpectedGuessAt).toEqual(now)
            expect(trade._lastBtcExpectedGuess).toEqual(0.071)
            done()

          promise = trade.btcExpected().then(checks)
          expect(promise).toBeResolvedWith(0.071)

    describe "expireQuote", ->
      it "should expire the quote sooner", ->
        now = new Date(2016, 9, 25, 11, 50, 0)
        threeSeconds = new Date(2016, 9, 25, 11, 50, 3)
        trade._quoteExpireTime = new Date(2016, 9, 25, 12, 0)
        jasmine.clock().mockDate(now);
        trade.expireQuote()
        expect(trade.quoteExpireTime).toEqual(threeSeconds)

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
          expect(trade._delegate.save).toHaveBeenCalled()

        trade.set = () -> Promise.resolve(trade)
        spyOn(trade._delegate, "save").and.callThrough()
        promise = trade.refresh().then(checks)

        expect(promise).toBeResolved(done)

      it "should resolve with trade object", (done) ->
        checks = (res) ->
          expect(res).toEqual(trade)

        trade.set = () -> Promise.resolve(trade)
        promise = trade.refresh().then(checks)

        expect(promise).toBeResolved(done)
