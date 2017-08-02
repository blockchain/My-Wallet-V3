/* eslint-disable semi */
const ShiftPayment = require('./shift-payment')

class EthPayment extends ShiftPayment {
  constructor (wallet) {
    super()
    this._eth = wallet.eth
    this._payment = this._eth.defaultAccount.createPayment()
  }

  setFromQuote (quote) {
    super.setFromQuote(quote)
    this._payment.setTo(quote.depositAddress)
    this._payment.setValue(quote.depositAmount)
    this._payment.setGasPrice(this._eth.defaults.GAS_PRICE)
    this._payment.setGasLimit(this._eth.defaults.GAS_LIMIT)
    return this
  }

  getFee () {
    return new Promise(resolve => {
      resolve(parseFloat(this._payment.fee))
    })
  }

  publish (secPass) {
    let privateKey = this._eth.getPrivateKeyForAccount(this._eth.defaultAccount, secPass)
    this._payment.sign(privateKey)
    return this._payment.publish()
  }
}

module.exports = EthPayment
