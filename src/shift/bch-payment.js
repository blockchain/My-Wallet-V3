/* eslint-disable semi */
const ShiftPayment = require('./shift-payment')

class BchPayment extends ShiftPayment {
  constructor (wallet) {
    super()
    this._payment = wallet.bch.createPayment(wallet.hdwallet.defaultAccountIndex)
  }

  setFromQuote (quote, fee = 'priority') {
    super.setFromQuote(quote)
    this._payment = this._payment.then(payment => {
      payment.setTo(quote.depositAddress)
      payment.setAmount(Math.round(parseFloat(quote.depositAmount) * 1e8))
      payment.setFeePerByte(fee)
      return payment.build()
    })
    return this
  }

  getFee () {
    return this._payment.then(payment => {
      return payment.fee
    })
  }

  publish (secPass) {
    return this._payment.then(payment => {
      payment.sign(secPass)
      return payment.publish()
    })
  }
}

module.exports = BchPayment
