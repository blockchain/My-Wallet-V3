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

  getApproximateQuote (coinPair, amount) {
    return this._api.getQuote(coinPair, amount)
      .then(Quote.fromApiResponse)
  }

  shift (quote, secPass) {
    let success = () => {
      let trade = Trade.fromQuote(quote)
      this._trades.unshift(trade)
      return this.sync().then(() => trade)
    }

    if (quote.depositAddress == null) {
      return Promise.reject(new Error('Quote is missing deposit address'))
    }

    if (quote.fromCurrency === 'btc') {
      let payment = this._wallet.createPayment()

      payment.from(this._wallet.hdwallet.defaultAccountIndex)
      payment.to(quote.depositAddress)
      payment.amount(Math.round(parseFloat(quote.depositAmount) * 1e8))
      payment.updateFeePerKb('priority')
      payment.build()
      payment.sign(secPass)

      return payment.publish().then(success)
    }

    if (quote.fromCurrency === 'eth') {
      let eth = this._wallet.eth
      let payment = eth.defaultAccount.createPayment()
      let privateKey = eth.getPrivateKeyForAccount(eth.defaultAccount, secPass)

      payment.setTo(quote.depositAddress)
      payment.setValue(quote.depositAmount)
      payment.setGasPrice(eth.defaults.GAS_PRICE)
      payment.setGasLimit(eth.defaults.GAS_LIMIT)
      payment.sign(privateKey)

      return payment.publish().then(success)
    }

    return Promise.reject(new Error(`Tried to shift unsupported currency '${quote.fromCurrency}'`))
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
