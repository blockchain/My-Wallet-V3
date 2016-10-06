proxyquire = require('proxyquireify')(require)

stubs = {
}

Trade = proxyquire('../../src/exchange/trade', stubs)

describe "Trade", ->

  tradeJSON = undefined
  tradeJSON2 = undefined

  delegate = undefined

  api = undefined

  beforeEach ->
    jasmine.clock().uninstall();
    jasmine.clock().install()

    tradeJSON = {
      id: 1142
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
      }

      it "...", ->
        pending()

    describe "_checkOnce()", ->
      trade = undefined

      beforeEach ->
        trade = {
          id: 1
          receiveAddress: "trade-address"
          _setTransactionHash: () ->
          refresh: () -> Promise.resolve()
        }
        delegate = {
          debug: true
          save: () -> Promise.resolve()
          getReceiveAddress: () ->
          checkAddress: (address) ->
            Promise.resolve({hash: "tx-hash", confirmations: 0}, 1)
        }

        spyOn(trade, "_setTransactionHash").and.callThrough()

      it "should resolve immedidatley if there are no transactions", (done) ->
        filter = () -> true

        promise = Trade._checkOnce([], delegate)

        expect(promise).toBeResolved(done)

      it "should call _setTransactionHash", (done) ->
        checks = () ->
          expect(trade._setTransactionHash).toHaveBeenCalled()
          done()

        promise = Trade._checkOnce([trade], delegate).then(checks)

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
        expect(Trade.filteredTrades(trades)).toEqual(expected)

    describe "_monitorWebSockets", ->
      it "should call _monitorAddress() on each trade", ->
        trades = [{
          _monitorAddress: () ->
        }]
        spyOn(trades[0], "_monitorAddress")
        filter = () -> true
        Trade._monitorWebSockets(trades, filter)
        expect(trades[0]._monitorAddress).toHaveBeenCalled()

    describe "monitorPayments", ->
      delegate = {
        debug: false
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
        spyOn(Trade, "_checkOnce").and.callFake(() ->
          Promise.resolve()
        )

      it "should call _checkOnce with relevant trades", ->
        Trade.monitorPayments(trades, delegate)
        expect(Trade._checkOnce).toHaveBeenCalled()
        expect(Trade._checkOnce.calls.argsFor(0)[0]).toEqual([trade2])

      it "should call _monitorWebSockets with relevant trades", (done) ->
        spyOn(Trade , '_monitorWebSockets').and.callFake(() ->
          # monitorPayments() is not a promise, so this test relies on the fact
          # that Jasmine throws a timeout if this code is never run.
          expect(Trade._monitorWebSockets).toHaveBeenCalled()
          expect(Trade._monitorWebSockets.calls.argsFor(0)[0]).toEqual([trade2])
          done()
        )

        promise = Trade.monitorPayments(trades, delegate)

    describe "_monitorAddress", ->
      it "...", ->
        pending()

  describe "instance", ->
    trade   = undefined
    delegate = undefined

    beforeEach ->
      delegate = {
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
      }
      trade = new Trade(tradeJSON, delegate)

    describe "getters", ->
      it "...", ->
        pending()

    describe "debug", ->
      it "can be set", ->
        trade.debug = true
        expect(trade.debug).toEqual(true)

    describe "process", ->
      beforeEach ->
        spyOn(trade._delegate, "releaseReceiveAddress")

      it "should ask delegate to release addresses for cancelled trades", ->
        trade._state = 'cancelled'
        trade.process()
        expect(trade._delegate.releaseReceiveAddress).toHaveBeenCalled()

      it "should not ask to release addresses for awaiting_transfer_in trades", ->
        trade._state = 'awaiting_transfer_in'
        trade.process()
        expect(trade._delegate.releaseReceiveAddress).not.toHaveBeenCalled()

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

        spyOn(trade._delegate, "save").and.callFake(() ->
          {
            then: (cb) ->
              cb()
          }
        )

      it "should call monitorAddress() on the delegate", ->
        spyOn(trade._delegate, "monitorAddress")
        trade._monitorAddress()
        expect(trade._delegate.monitorAddress).toHaveBeenCalled()

      it "should first refresh if trade is still awaiting_transfer_in", () ->
        trade._state = "awaiting_transfer_in"

        trade._delegate.monitorAddress = (address, callback) ->
          callback("transaction-hash", 1000)

        trade._monitorAddress()

        expect(trade.refresh).toHaveBeenCalled()


      it "should not call tradeWasPaid if state is awaiting_transfer_in after refresh", () ->
        trade._state = "awaiting_transfer_in"
        refreshedState = "awaiting_transfer_in"

        trade._delegate.monitorAddress = (address, callback) ->
          callback("transaction-hash", 1000)

        trade._monitorAddress()

        expect(trade._watchAddressResolve).not.toHaveBeenCalled()

      it "should not call tradeWasPaid if trade already has a hash", () ->
        trade._txHash = "other-transaction-hash"

        trade._delegate.monitorAddress = (address, callback) ->
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
          _delegate: delegate
          state: 'completed'
          debug: true
          _txHash: null
          _setTransactionHash: Trade.prototype._setTransactionHash
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
