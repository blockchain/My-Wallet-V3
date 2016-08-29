proxyquire = require('proxyquireify')(require)

acc0 = {
  receivingAddressesLabels: []
}

MyWallet = {
  wallet: {
    hdwallet: {
      accounts: [
        acc0
      ]
      defaultAccount: acc0
    }
  }
}

API =
  getBalances: () ->
  getHistory: () ->

WalletStore = {}

stubs = {
  '../wallet': MyWallet,
  '../api': API,
  '../wallet-store': WalletStore
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
        expect(t._inAmount).toBe(tradeJSON.inAmount)
        expect(t._medium).toBe(tradeJSON.transferIn.medium)
        expect(t._outAmountExpected).toBe(tradeJSON.outAmountExpected)
        expect(t._receiveAddress).toBe(tradeJSON.transferOut.details.account)
        expect(t._state).toBe(tradeJSON.state)
        expect(t._iSignThisID).toBe(tradeJSON.transferIn.details.paymentId)
        expect(t._receiptUrl).toBe(tradeJSON.receiptUrl)
        expect(t._bitcoinReceived).toBe(null)

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

      coinify = {
        _save: () -> Promise.resolve()
        save: () -> Promise.resolve()
        _trades: []
        GET: (method) -> {
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
        POST: () -> Promise.resolve('something')
        login: () -> {
          then: (cb) ->
            cb({access_token: 'my-token', expires_in: 1000})
            {
              catch: () ->
            }
        }
      }
      spyOn(coinify, "GET").and.callThrough()
      spyOn(coinify, "POST").and.callThrough()
      spyOn(coinify, "login").and.callThrough()
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

    describe "removeLabeledAddress()", ->
       it "set new object and does not change id or date", ->
         pending()

    describe "cancel()", ->
      beforeEach ->
        spyOn(trade, "removeLabeledAddress").and.callFake(() ->)

      it "should cancel a trade and update its state", ->
        coinify.PATCH = () ->
                  then: (cb) ->
                    cb({state: "cancelled"})
        spyOn(coinify, "PATCH").and.callThrough()
        trade.cancel()
        expect(coinify.PATCH).toHaveBeenCalledWith('trades/' + trade._id + '/cancel')
        expect(trade._state).toBe('cancelled')

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
      it "should fail if gap limit", (done) ->
        MyWallet.wallet.hdwallet.accounts[0].receiveIndex = 20
        MyWallet.wallet.hdwallet.accounts[0].lastUsedReceiveIndex = 0
        expect(CoinifyTrade.buy({})).toBeRejectedWith('gap_limit', done)

    describe "buy()", ->
      it "should POST the quote and add the received trade to the list", (done) ->
        quote = { id: 101 }
        acc = MyWallet.wallet.hdwallet.defaultAccount
        acc.receiveIndex = 20
        acc.lastUsedReceiveIndex = 19
        acc.receiveAddressAtIndex = () -> '19g1YFsoR5duHgTFcs4HKnjKHH7PgNqBJM'
        acc.setLabelForReceivingAddress = () -> 'do stuff'
        coinify.POST = () -> Promise.resolve(tradeJSON)
        spyOn(coinify, "POST").and.callThrough()

        testTrade = (t) ->
          expect(coinify.POST).toHaveBeenCalled()
          expect(coinify._trades.length).toBe(1)

        CoinifyTrade.buy(quote, undefined, coinify)
          .then(testTrade)
          .catch(console.log)
          .then(done)

    describe "fetchAll()", ->
      it "should fetch all the trades", (done) ->
        myCoinify = {
          GET: () ->
            then: (cb) ->
              cb([tradeJSON,tradeJSON2])
          _trades: []
          isLoggedIn: true
          save: () -> Promise.resolve()
        }
        check = () ->
          expect(myCoinify._trades.length).toBe(2)

        spyOn(myCoinify, "GET").and.callThrough()
        promise = CoinifyTrade.fetchAll(myCoinify).then(check)
        expect(promise).toBeResolved(done)

      it "should update existing trades", (done) ->
        tradeJSON.state = "completed_test"
        myCoinify = {
          GET: () ->
            then: (cb) ->
              cb([tradeJSON,tradeJSON2])
          _trades: []
          isLoggedIn: true
          save: () -> Promise.resolve()
        }
        check = () ->
          expect(myCoinify._trades.length).toBe(2)
          expect(myCoinify._trades[0].state).toEqual('completed_test')

        spyOn(myCoinify, "GET").and.callThrough()
        promise = CoinifyTrade.fetchAll(myCoinify).then(check)
        expect(promise).toBeResolved(done)

    describe "refresh()", ->
      it "should GET the trade and update the trade object", ->
        trade.set = () -> trade
        spyOn(trade, "set").and.callThrough()
        trade.refresh()
        expect(coinify.GET).toHaveBeenCalledWith('trades/' + trade._id)
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
