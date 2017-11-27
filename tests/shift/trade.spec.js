/* eslint-disable semi */
const Trade = require('../../src/shift/trade')
const Quote = require('../../src/shift/quote')

describe('ShapeShift.Trade', () => {
  const quoteData = {
    'orderId': '18408bc9-a592-4d15-9409-fe0b8f56c408',
    'pair': 'btc_eth',
    'withdrawal': '0x632a4f72b7dd73f60194e09a073ca494ccba5a9c',
    'withdrawalAmount': '1.13500523',
    'deposit': '1L2mnCoD8hzTukbGBvkwyoGBeAfgzqhcx3',
    'depositAmount': '0.1',
    'expiration': 1502292508112,
    'quotedRate': '11.40005229',
    'maxLimit': 1.51084099,
    'returnAddress': '1EhvfATiZukipzSxhHw5cJ5F5N56HawExu',
    'apiPubKey': 'shapeshift',
    'minerFee': '0.005'
  }

  const tradeData = {
    'status': 'complete',
    'hashIn': '2eeda12829d025d4672a4653e6ca9c93321727bf54d01f8ebfb18c6abd2c7925',
    'hashOut': '0xc1341e8ec046dff48f524cd87fe812c6fd86a41c868ff5843f04619906882123',
    'time': 'Mon Oct 09 2017 10:57:50 GMT+0100 (BST)',
    'quote': {
      'orderId': '2b92f15c-1bc9-50d3-73d1-8cd9f332ba94',
      'quotedRate': '5.15',
      'deposit': '1FcBaMUHXMZRsbwUUwAYWdsaxoyvYFxRbW',
      'minerFee': '0.001'
    }
  }

  describe('static', () => {
    describe('trade states', () => {
      it('should have NO_DEPOSITS', () => {
        expect(Trade.NO_DEPOSITS).toEqual('no_deposits')
      })

      it('should have RECEIVED', () => {
        expect(Trade.RECEIVED).toEqual('received')
      })

      it('should have COMPLETE', () => {
        expect(Trade.COMPLETE).toEqual('complete')
      })

      it('should have FAILED', () => {
        expect(Trade.FAILED).toEqual('failed')
      })

      it('should have RESOLVED', () => {
        expect(Trade.RESOLVED).toEqual('resolved')
      })
    })

    describe('.fromMetadata', () => {
      it('should create a trade from the metadata service format', () => {
        let trade = Trade.fromMetadata(tradeData)
        expect(trade.constructor).toEqual(Trade)
      })
    })

    describe('.fromQuote', () => {
      it('should create a trade from api response json', () => {
        let quote = Quote.fromApiResponse(quoteData)
        let trade = Trade.fromQuote(quote)
        expect(trade.constructor).toEqual(Trade)
      })
    })
  })

  describe('instance', () => {
    let trade
    let now = new Date()

    beforeEach(() => {
      spyOn(Date, 'now').and.returnValue(now.getTime())
      let quote = Quote.fromApiResponse(quoteData)
      trade = Trade.fromQuote(quote)
    })

    describe('getters', () => {
      it('should get: quote', () => {
        expect(trade.quote.constructor).toEqual(Quote)
      })

      it('should get: pair', () => {
        expect(trade.pair).toEqual(quoteData.pair)
      })

      it('should get: rate', () => {
        expect(trade.rate).toEqual(quoteData.quotedRate)
      })

      it('should get: fromCurrency', () => {
        expect(trade.fromCurrency).toEqual('btc')
      })

      it('should get: toCurrency', () => {
        expect(trade.toCurrency).toEqual('eth')
      })

      it('should get: depositAddress', () => {
        expect(trade.depositAddress).toEqual(quoteData.deposit)
      })

      it('should get: depositAmount', () => {
        expect(trade.depositAmount).toEqual(quoteData.depositAmount)
      })

      it('should get: withdrawalAddress', () => {
        expect(trade.withdrawalAddress).toEqual(quoteData.withdrawal)
      })

      it('should get: withdrawalAmount', () => {
        expect(trade.withdrawalAmount).toEqual(quoteData.withdrawalAmount)
      })

      it('should get: error', () => {
        trade._error = 'some error'
        expect(trade.error).toEqual('some error')
      })

      it('should get: status', () => {
        trade._status = 'some status'
        expect(trade.status).toEqual('some status')
      })

      it('should get: isPending', () => {
        trade._status = null
        expect(trade.isPending).toEqual(false)
        trade._status = Trade.NO_DEPOSITS
        expect(trade.isPending).toEqual(true)
        trade._status = Trade.RECEIVED
        expect(trade.isPending).toEqual(true)
      })

      it('should get: isWaitingForDeposit', () => {
        trade._status = null
        expect(trade.isWaitingForDeposit).toEqual(false)
        trade._status = Trade.NO_DEPOSITS
        expect(trade.isWaitingForDeposit).toEqual(true)
      })

      it('should get: isProcessing', () => {
        trade._status = null
        expect(trade.isProcessing).toEqual(false)
        trade._status = Trade.RECEIVED
        expect(trade.isProcessing).toEqual(true)
      })

      it('should get: isComplete', () => {
        trade._status = null
        expect(trade.isComplete).toEqual(false)
        trade._status = Trade.COMPLETE
        expect(trade.isComplete).toEqual(true)
      })

      it('should get: isFailed', () => {
        trade._status = null
        expect(trade.isFailed).toEqual(false)
        trade._status = Trade.FAILED
        expect(trade.isFailed).toEqual(true)
      })

      it('should get: isResolved', () => {
        trade._status = null
        expect(trade.isResolved).toEqual(false)
        trade._status = Trade.RESOLVED
        expect(trade.isResolved).toEqual(true)
      })

      it('should get: failedReason', () => {
        trade._error = 'reason'
        expect(trade.failedReason).toEqual('reason')
      })

      it('should get: depositHash', () => {
        trade._hashIn = 'hash_in'
        expect(trade.depositHash).toEqual('hash_in')
      })

      it('should get: withdrawalHash', () => {
        trade._hashOut = 'hash_out'
        expect(trade.withdrawalHash).toEqual('hash_out')
      })

      it('should get: time', () => {
        expect(trade.time.constructor).toEqual(Date)
      })

      it('should use .timestamp over .time', () => {
        let time = new Date('Thu Oct 12 2017 16:56:12 GMT-0400 (EDT)')
        let timestamp = new Date(1507841784426)
        trade = new Trade({ time, timestamp })
        expect(trade.time.getTime()).toEqual(timestamp.getTime())
      })
    })

    describe('.setStatus', () => {
      it('should set from a completed status', () => {
        let statusObj = { status: 'complete', transaction: 'tx_hash_out' }
        trade.setStatus(statusObj)
        expect(trade.isComplete).toEqual(true)
        expect(trade.withdrawalHash).toEqual('tx_hash_out')
      })

      it('should should not override existing fields', () => {
        let statusObj = { status: 'failed', error: 'some_error' }
        trade.setStatus(statusObj)
        expect(trade.isFailed).toEqual(true)
        expect(trade.failedReason).toEqual('some_error')
      })
    })

    describe('.setDepositHash', () => {
      it('should set the proper fields', () => {
        trade.setDepositHash('deposit_hash')
        expect(trade.depositHash).toEqual('deposit_hash')
      })
    })

    describe('.toJSON', () => {
      it('should return the full json', () => {
        let json = JSON.stringify({
          'status': 'no_deposits',
          'time': now.toString(),
          'timestamp': now.getTime(),
          'quote': {
            'orderId': '18408bc9-a592-4d15-9409-fe0b8f56c408',
            'quotedRate': '11.40005229',
            'deposit': '1L2mnCoD8hzTukbGBvkwyoGBeAfgzqhcx3',
            'minerFee': '0.005',
            'pair': 'btc_eth',
            'depositAmount': '0.1',
            'withdrawal': '0x632a4f72b7dd73f60194e09a073ca494ccba5a9c',
            'withdrawalAmount': '1.13500523'
          }
        })
        expect(JSON.stringify(trade)).toEqual(json)
      })
    })
  })
})
