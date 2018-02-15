/* eslint-disable semi */
class ShiftPayment {
  get quote () {
    return this._quote
  }

  setFromQuote (quote, _fee) {
    this._quote = quote
  }

  static fromWallet (wallet, account) {
    return new this(wallet, account)
  }
}

module.exports = ShiftPayment
