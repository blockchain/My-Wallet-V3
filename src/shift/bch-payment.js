/* eslint-disable semi */
const ShiftPayment = require('./shift-payment')

class BchPayment extends ShiftPayment {
  constructor (wallet, account) {
    super()
    this._wallet = wallet
    this._payment = account.createPayment()
  }

  setFromQuote (quote, feePerByte) {
    super.setFromQuote(quote)
    this._payment.to(quote.depositAddress)
    this._payment.amount(Math.round(parseFloat(quote.depositAmount) * 1e8))
    this._payment.feePerByte(feePerByte)
    this._payment.build()
    return this
  }

  getFee () {
    return new Promise(resolve => {
      this._payment.sideEffect(payment => resolve(payment.selection.fee))
    })
  }

  publish (secPass) {
    this._payment.sign(secPass)
    return this._payment.publish()
  }
}

module.exports = BchPayment
