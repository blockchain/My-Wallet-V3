/* eslint-disable semi */
const { delay } = require('../helpers')
const Api = require('./api')
const Trade = require('./trade')
const Quote = require('./quote')

class ShapeShift {
  constructor (wallet) {
    this._wallet = wallet
    this._api = new Api();
  }

  getRate (coinPair) {
    return this._api.getRate(coinPair)
  }

  getQuote (coinPair, amount) {
    let [from, to] = coinPair.split('_')

    let withdrawalAddress = this.nextAddressForCurrency(to)
    let returnAddress = this.nextAddressForCurrency(from)

    return this._api.getQuote(coinPair, amount, withdrawalAddress, returnAddress)
      .then(Quote.fromApiResponse)
  }

  shift (quote, secPass) {
    if (quote.fromCurrency === 'btc') {
      let payment = this._wallet.createPayment()

      payment.from(this._wallet.hdwallet.defaultAccountIndex)
      payment.to(quote.depositAddress)
      payment.amount(Math.round(parseFloat(quote.depositAmount) * 1e8))
      payment.build()
      payment.sign(secPass)

      return payment.publish().then(() => {
        return Trade.fromQuote(quote)
      })
    } else {
      throw new Error('ETH not implemented')
    }
  }

  watchTradeForCompletion (trade, { pollTime = 1000 } = {}) {
    return this.updateTradeStatus(trade).then(() => {
      return trade.isWaitingForDeposit || trade.isProcessing
        ? delay(pollTime).then(() => this.watchTradeForCompletion(trade))
        : Promise.resolve(trade)
    })
  }

  updateTradeStatus (trade) {
    return this._api.getTradeStatus(trade.depositAddress)
      .then(status => trade.setStatus(status))
  }

  nextAddressForCurrency (currency) {
    if (currency === 'btc') {
      return this._wallet.hdwallet.defaultAccount.receiveAddress
    }
    if (currency === 'eth') {
      return this._wallet.eth.defaultAccount.address
    }
    throw new Error(`Currency '${currency}' is not supported`)
  }

  static fromBlockchainWallet (wallet) {
    return new ShapeShift(wallet)
  }
}

module.exports = ShapeShift
