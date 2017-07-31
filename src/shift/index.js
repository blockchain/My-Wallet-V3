/* eslint-disable semi */
const { delay } = require('../helpers')
const Api = require('./api')
const Trade = require('./trade')
const Quote = require('./quote')

const METADATA_TYPE_SHAPE_SHIFT = 6;

class ShapeShift {
  constructor (wallet, metadata) {
    this._wallet = wallet
    this._metadata = metadata
    this._api = new Api();
    this._trades = []
  }

  get trades () {
    return this._trades
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
      payment.updateFeePerKb('priority')
      payment.build()
      payment.sign(secPass)

      return payment.publish().then(() => {
        let trade = Trade.fromQuote(quote)
        this._trades.push(trade)
        return this.sync().then(() => trade)
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
    return this._api.getTradeStatus(trade.depositAddress).then(status => {
      let shouldSync = status.status !== trade.status
      trade.setStatus(status)
      if (shouldSync) this.sync()
      return trade
    })
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

  fetch () {
    return this._metadata.fetch().then(data => {
      if (data) {
        this._trades = data.trades.map(Trade.fromMetadata)
      }
    })
  }

  sync () {
    return this._metadata.update(this)
  }

  toJSON () {
    return {
      trades: this._trades
    }
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_SHAPE_SHIFT);
    return new ShapeShift(wallet, metadata)
  }
}

module.exports = ShapeShift
