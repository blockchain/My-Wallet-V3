/* eslint-disable semi */
class ShiftPayment {
  get quote () {
    return this._quote
  }

  setFromQuote (quote, _fee) {
    this._quote = quote
  }

  saveWithdrawalLabel () {
  }

  static fromWallet (wallet) {
    return new this(wallet)
  }
}

module.exports = ShiftPayment
