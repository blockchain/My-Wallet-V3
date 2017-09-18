/* eslint-disable semi */
const mockTxStatResponse = require('../__mocks__/tx-stat-response.mock')
const Quote = require('../../src/shift/quote')

describe('ShapeShift.Quote', () => {
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

  describe('static', () => {
    describe('.fromApiResponse', () => {
      it('should create a quote from api response json', () => {
        let quote = Quote.fromApiResponse(quoteData)
        expect(quote.constructor).toEqual(Quote)
      })
    })
  })

  describe('instance', () => {
    let quote

    beforeEach(() => {
      quote = Quote.fromApiResponse(quoteData)
    })

    describe('getters', () => {
      it('should get: orderId', () => {
        expect(quote.orderId).toEqual(quoteData.orderId)
      })

      it('should get: pair', () => {
        expect(quote.pair).toEqual(quoteData.pair)
      })

      it('should get: rate', () => {
        expect(quote.rate).toEqual(quoteData.quotedRate)
      })

      it('should get: expires', () => {
        expect(+quote.expires).toEqual(quoteData.expiration)
      })

      it('should get: depositAddress', () => {
        expect(quote.depositAddress).toEqual(quoteData.deposit)
      })

      it('should get: depositAmount', () => {
        expect(quote.depositAmount).toEqual(quoteData.depositAmount)
      })

      it('should get: withdrawalAddress', () => {
        expect(quote.withdrawalAddress).toEqual(quoteData.withdrawal)
      })

      it('should get: withdrawalAmount', () => {
        expect(quote.withdrawalAmount).toEqual(quoteData.withdrawalAmount)
      })

      it('should get: minerFee', () => {
        expect(quote.minerFee).toEqual(quoteData.minerFee)
      })

      it('should get: fromCurrency', () => {
        expect(quote.fromCurrency).toEqual('btc')
      })

      it('should get: toCurrency', () => {
        expect(quote.toCurrency).toEqual('eth')
      })
    })

    describe('.setFieldsFromTxStat', () => {
      it('should set the proper fields', () => {
        quote = new Quote({});
        let response = mockTxStatResponse('success')
        quote.setFieldsFromTxStat(response)
        expect(quote.pair).toEqual('ETH_BTC')
        expect(quote.depositAmount).toEqual(response.incomingCoin)
        expect(quote.withdrawalAddress).toEqual(response.withdraw)
        expect(quote.withdrawalAmount).toEqual(response.outgoingCoin)
      })

      it('should should not override existing fields', () => {
        let response = mockTxStatResponse('success')
        quote.setFieldsFromTxStat(response)
        expect(quote.pair).toEqual(quote.pair)
        expect(quote.depositAmount).toEqual(quote.depositAmount)
        expect(quote.withdrawalAddress).toEqual(quote.withdrawalAddress)
        expect(quote.withdrawalAmount).toEqual(quote.withdrawalAmount)
      })
    })

    describe('.toJSON', () => {
      it('should return the full json', () => {
        let json = JSON.stringify({
          'orderId': '18408bc9-a592-4d15-9409-fe0b8f56c408',
          'quotedRate': '11.40005229',
          'deposit': '1L2mnCoD8hzTukbGBvkwyoGBeAfgzqhcx3',
          'minerFee': '0.005',
          'pair': 'btc_eth',
          'depositAmount': '0.1',
          'withdrawal': '0x632a4f72b7dd73f60194e09a073ca494ccba5a9c',
          'withdrawalAmount': '1.13500523'
        })
        expect(JSON.stringify(quote)).toEqual(json)
      })
    })

    describe('.toPartialJSON', () => {
      it('should return the minimal json', () => {
        let json = JSON.stringify({
          'orderId': '18408bc9-a592-4d15-9409-fe0b8f56c408',
          'quotedRate': '11.40005229',
          'deposit': '1L2mnCoD8hzTukbGBvkwyoGBeAfgzqhcx3',
          'minerFee': '0.005'
        })
        expect(JSON.stringify(quote.toPartialJSON())).toEqual(json)
      })
    })
  })
})
