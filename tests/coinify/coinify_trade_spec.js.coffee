proxyquire = require('proxyquireify')(require)

BankAccount = () ->
  {mock: "bank-account"}

Quote = {
  getQuote: (api, amount, currency) ->
    Promise.resolve({quoteAmount: 0.071})
}

stubs = {
  './bank-account' : BankAccount
  './quote' : Quote
}

CoinifyTrade    = proxyquire('../../src/coinify/trade', stubs)

describe "CoinifyTrade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined

  api = undefined


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
    describe "new CoinifyTrade()", ->
      delegate = {
        getReceiveAddress: () ->
      }

      it "should keep a reference to the API", ->
        api = {}

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
        new CoinifyTrade(tradeJSON, api, delegate)
        expect(window.console.warn).toHaveBeenCalled()
        expect(window.console.warn.calls.argsFor(0)[1]).toEqual('unknown')

    describe "_checkOnce()", ->
      trade = {
        id: 1
        receiveAddress: "trade-address"
        _setTransactionHash: () ->
        refresh: () -> Promise.resolve()
      }
      coinifyDelegate = {
        debug: true
        save: () -> Promise.resolve()
        getReceiveAddress: () ->
        checkAddress: (address) ->
          Promise.resolve({hash: "tx-hash", confirmations: 0}, 1)
      }

      beforeEach ->
        spyOn(trade, "_setTransactionHash").and.callThrough()

      it "should resolve immedidatley if there are no transactions", (done) ->
        filter = () -> true

        promise = CoinifyTrade._checkOnce([], coinifyDelegate)

        expect(promise).toBeResolved(done)


      it "should call _setTransactionHash", (done) ->
        checks = () ->
          expect(trade._setTransactionHash).toHaveBeenCalled()
          done()

        promise = CoinifyTrade._checkOnce([trade], coinifyDelegate).then(checks)

        expect(promise).toBeResolved(done)


    describe "filteredTrades", ->
      it "should return transactions that might still receive payment", ->
        trades  = [
          {state: "awaiting_transfer_in"} # might receive payment
          {state: "cancelled"} # will never receive payment
        ]
        expected = [
          {state: "awaiting_transfer_in"},
        ]
        expect(CoinifyTrade.filteredTrades(trades)).toEqual(expected)

    describe "_monitorWebSockets", ->
      it "should call _monitorAddress() on each trade", ->
        trades = [{
          _monitorAddress: () ->
        }]
        spyOn(trades[0], "_monitorAddress")
        filter = () -> true
        CoinifyTrade._monitorWebSockets(trades, filter)
        expect(trades[0]._monitorAddress).toHaveBeenCalled()

    describe "monitorPayments", ->
      delegate = {
      }

      trade1 = {
        state: "cancelled"
        delegate: delegate
      }
      trade2 = {
        state: "awaiting_transfer_in"
        delegate: delegate
      }
      trades = [trade1, trade2]


      beforeEach ->
        spyOn(CoinifyTrade, "_checkOnce").and.callFake(() ->
          Promise.resolve()
        )

      it "should call _checkOnce with relevant trades", ->
        CoinifyTrade.monitorPayments(trades, delegate)
        expect(CoinifyTrade._checkOnce).toHaveBeenCalled()
        expect(CoinifyTrade._checkOnce.calls.argsFor(0)[0]).toEqual([trade2])

      it "should call _monitorWebSockets with relevant trades", (done) ->
        spyOn(CoinifyTrade , '_monitorWebSockets').and.callFake(() ->
          # monitorPayments() is not a promise, so this test relies on the fact
          # that Jasmine throws a timeout if this code is never run.
          expect(CoinifyTrade._monitorWebSockets).toHaveBeenCalled()
          expect(CoinifyTrade._monitorWebSockets.calls.argsFor(0)[0]).toEqual([trade2])
          done()
        )

        promise = CoinifyTrade.monitorPayments(trades, delegate)

    describe "_monitorAddress", ->
      it "...", ->
        pending()

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
      trade = new CoinifyTrade(tradeJSON, api, exchangeDelegate)

    describe "getters", ->
      it "should have some simple ones restored from trades JSON", ->
        trade = new CoinifyTrade({
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
        trade = new CoinifyTrade(tradeJSON, api, exchangeDelegate)
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
        trade = new CoinifyTrade(tradeJSON, api, exchangeDelegate)
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
        new CoinifyTrade(tradeJSON, api, exchangeDelegate)
        expect(exchangeDelegate.deserializeExtraFields).toHaveBeenCalled()

      it "should pass in self, so delegate can set extra fields", ->
        tradeJSON.extra = "test"
        exchangeDelegate.deserializeExtraFields = (deserialized, t) ->
          t.extra = deserialized.extra

        trade = new CoinifyTrade(tradeJSON, api, exchangeDelegate)
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
        spyOn(trade._coinifyDelegate, "serializeExtraFields")
        JSON.stringify(trade)
        expect(trade._coinifyDelegate.serializeExtraFields).toHaveBeenCalled()

      it "should serialize any fields added by the delegate", ->
        trade._coinifyDelegate.serializeExtraFields = (t) ->
          t.extra_field = 'test'

        s = JSON.stringify(trade)
        expect(JSON.parse(s).extra_field).toEqual('test')

    describe "debug", ->
      it "can be set", ->
        trade.debug = true
        expect(trade.debug).toEqual(true)

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

    describe "watchAddress()", ->
      it "should set this._watchAddressResolve() and return promise with the total received", (done) ->
        testBitcoinReceived = (bit_rec) ->
          expect(bit_rec).toBe(1714)

        trade.watchAddress()
          .then(testBitcoinReceived)
          .catch(console.log)
          .then(done)

        trade._watchAddressResolve(1714)

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
          Promise.resolve([tradeJSON,tradeJSON2])

        check = (res) ->
          expect(res.length).toBe(2)
          done()

        promise = CoinifyTrade.fetchAll(api).then(check)
        expect(promise).toBeResolved()

    describe "process", ->
      beforeEach ->
        spyOn(trade._coinifyDelegate, "releaseReceiveAddress")

      it "should ask delegate to release addresses for cancelled trades", ->
        trade._state = 'cancelled'
        trade.process()
        expect(trade._coinifyDelegate.releaseReceiveAddress).toHaveBeenCalled()

      it "should not ask to release addresses for awaiting_transfer_in trades", ->
        trade._state = 'awaiting_transfer_in'
        trade.process()
        expect(trade._coinifyDelegate.releaseReceiveAddress).not.toHaveBeenCalled()

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
          spyOn(Quote, "getQuote").and.callThrough()

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

    describe "_monitorAddress()", ->
      refreshedState = "completed"

      beforeEach ->
        trade._state = "completed"
        trade._txHash = null
        trade._setTransactionHash = () -> Promise.resolve()

        # tradeWasPaid() calls _watchAddressResolve
        trade._watchAddressResolve = () ->

        spyOn(trade, "_watchAddressResolve")

        spyOn(trade, "refresh").and.callFake(() ->
          trade._state = refreshedState
          {
            then: (cb) ->
              cb()
          }
        )

        spyOn(trade._coinifyDelegate, "save").and.callFake(() ->
          {
            then: (cb) ->
              cb()
          }
        )

      it "should call monitorAddress() on the delegate", ->
        spyOn(trade._coinifyDelegate, "monitorAddress")
        trade._monitorAddress()
        expect(trade._coinifyDelegate.monitorAddress).toHaveBeenCalled()

      it "should first refresh if trade is still awaiting_transfer_in", () ->
        trade._state = "awaiting_transfer_in"

        trade._coinifyDelegate.monitorAddress = (address, callback) ->
          callback("transaction-hash", 1000)

        trade._monitorAddress()

        expect(trade.refresh).toHaveBeenCalled()


      it "should not call tradeWasPaid if state is awaiting_transfer_in after refresh", () ->
        trade._state = "awaiting_transfer_in"
        refreshedState = "awaiting_transfer_in"

        trade._coinifyDelegate.monitorAddress = (address, callback) ->
          callback("transaction-hash", 1000)

        trade._monitorAddress()

        expect(trade._watchAddressResolve).not.toHaveBeenCalled()

      it "should not call tradeWasPaid if trade already has a hash", () ->
        trade._txHash = "other-transaction-hash"

        trade._coinifyDelegate.monitorAddress = (address, callback) ->
          callback("transaction-hash", 1000)

        trade._monitorAddress()

        expect(trade._watchAddressResolve).not.toHaveBeenCalled()

        expect(trade.txHash).toEqual("other-transaction-hash")

    describe "_setTransactionHash", ->
      trade = undefined
      delegate = undefined
      tx = {hash: 'tx-hash', confirmations: 0}

      beforeEach ->
        delegate =
          checkAddress: (address) ->
            Promise.resolve(tx)

        trade = {
          receiveAddress: "trade-address"
          _coinifyDelegate: delegate
          state: 'completed'
          debug: true
          _txHash: null
          _setTransactionHash: CoinifyTrade.prototype._setTransactionHash
        }

      describe "for a test trade", ->
        it "should set the hash if trade is completed", ->
          trade.state = 'completed_test'

          trade._setTransactionHash(tx, 1, delegate)
          expect(trade._txHash).toEqual('tx-hash')


        it "should not override the hash if set earlier", ->
          trade.state = 'completed_test'
          trade._txHash = 'tx-hash-before'

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._txHash).toEqual('tx-hash-before')

      describe "for a real trade", ->
        it "should set the hash if trade is completed", ->
          trade.state = 'completed'

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._txHash).toEqual('tx-hash')


        it "should set the hash if trade is processing", ->
          trade.state = 'processing'

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._txHash).toEqual('tx-hash')

        it "should not override the hash if set earlier", ->
          trade.state = 'completed'
          trade._txHash = 'tx-hash-before'

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._txHash).toEqual('tx-hash-before')

        it "should set the number of confirmations", ->
          trade.state = 'completed'

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._confirmations).toEqual(0)

        it "should set _confirmed to true so it gets serialized", ->
          trade.state = 'completed'
          tx.confirmations = 6
          trade.confirmed = true # mock getter, the real one checks trade._confirmations

          trade._setTransactionHash(tx, 1, delegate)

          expect(trade._confirmed).toEqual(true)
