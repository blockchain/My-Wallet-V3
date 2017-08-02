/* eslint-disable semi */
const { delay } = require('../helpers')
const Api = require('./api')
const Trade = require('./trade')
const Quote = require('./quote')
const BtcPayment = require('./btc-payment')
const EthPayment = require('./eth-payment')

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

  getApproximateQuote (coinPair, amount) {
    return this._api.getQuote(coinPair, amount)
      .then(Quote.fromApiResponse)
  }

  buildPayment (quote) {
    let payment
    if (quote.depositAddress == null) {
      throw new Error('Quote is missing deposit address')
    }
    if (quote.fromCurrency === 'btc') {
      payment = BtcPayment.fromWallet(this._wallet)
    }
    if (quote.fromCurrency === 'eth') {
      payment = EthPayment.fromWallet(this._wallet)
    }
    if (payment == null) {
      throw new Error(`Tried to build for unsupported currency ${quote.fromCurrency}`)
    }
    return payment.setFromQuote(quote)
  }

  shift (payment, secPass) {
    return payment.publish(secPass).then(() => {
      let trade = Trade.fromQuote(payment.quote)
      this._trades.unshift(trade)
      return this.sync().then(() => trade)
    })
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
