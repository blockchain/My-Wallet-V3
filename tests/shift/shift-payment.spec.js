/* eslint-disable semi */
const ShiftPayment = require('../../src/shift/shift-payment')

describe('ShapeShift.ShiftPayment', () => {
  describe('.setFromQuote', () => {
    it('should set the quote', () => {
      let mockQuote = {}
      let payment = new ShiftPayment()
      payment.setFromQuote(mockQuote)
      expect(payment.quote).toEqual(mockQuote)
    })
  })

  describe('.fromWallet', () => {
    it('should construct a quote with a wallet', () => {
      let payment = ShiftPayment.fromWallet({})
      expect(payment.constructor).toEqual(ShiftPayment)
    })
  })
})
