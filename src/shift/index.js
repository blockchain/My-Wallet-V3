/* eslint-disable semi */
const { delay, asyncOnce, trace } = require('../helpers')
const Api = require('./api')
const Trade = require('./trade')
const Quote = require('./quote')
const BtcPayment = require('./btc-payment')
const EthPayment = require('./eth-payment')
const BchPayment = require('./bch-payment')

const METADATA_TYPE_SHAPE_SHIFT = 6;

class ShapeShift {
  constructor (wallet, metadata, apiKey) {
    this._wallet = wallet
    this._metadata = metadata
    this._api = new Api(apiKey)
    this._trades = []
    this.sync = asyncOnce(this.sync.bind(this), 500)
  }

  get trades () {
    return this._trades
  }

  get USAState () {
    return this._USAState
  }

  getRate (coinPair) {
    trace('getting rate')
    return this._api.getRate(coinPair)
  }

  getQuote (coinPair, amount) {
    trace('getting quote')
    let [from, to] = coinPair.split('_')

    let withdrawalAddress = this.nextAddressForCurrency(to)
    let returnAddress = this.nextAddressForCurrency(from)

    return this._api.getQuote(coinPair, amount, withdrawalAddress, returnAddress)
      .then(Quote.fromApiResponse)
  }

  getApproximateQuote (coinPair, amount) {
    trace('getting approximate quote')
    return this._api.getQuote(coinPair, amount)
      .then(Quote.fromApiResponse)
  }

  buildPayment (quote, fee, fromAccount) {
    trace('building payment')
    let payment
    if (quote.depositAddress == null) {
      throw new Error('Quote is missing deposit address')
    }
    if (quote.fromCurrency === 'btc') {
      let account = fromAccount || this._wallet.hdwallet.defaultAccount
      payment = BtcPayment.fromWallet(this._wallet, account)
    }
    if (quote.fromCurrency === 'eth') {
      let account = fromAccount || this._wallet.eth.defaultAccount
      payment = EthPayment.fromWallet(this._wallet, account)
    }
    if (quote.fromCurrency === 'bch') {
      payment = BchPayment.fromWallet(this._wallet)
    }
    if (payment == null) {
      throw new Error(`Tried to build for unsupported currency ${quote.fromCurrency}`)
    }
    return payment.setFromQuote(quote, fee)
  }

  shift (payment, secPass) {
    trace('starting shift')
    return payment.publish(secPass).then(({ hash }) => {
      trace('finished shift')
      payment.saveWithdrawalLabel()
      let trade = Trade.fromQuote(payment.quote)
      trade.setDepositHash(hash)
      this._trades.unshift(trade)
      this.sync()
      return trade
    })
  }

  checkForCompletedTrades (onCompleted, { pollTime = 1000 } = {}) {
    trace('checking for completed');
    let watchers = this.trades.filter(t => t.isPending).map(t =>
      this.watchTradeForCompletion(t, pollTime).then(onCompleted))
    return Promise.all(watchers).then(() => this.trades)
  }

  watchTradeForCompletion (trade, { pollTime = 1000 } = {}) {
    trace('watching trade for completion', trade)
    return this.updateTradeDetails(trade).then(() => {
      return trade.isPending
        ? delay(pollTime).then(() => this.watchTradeForCompletion(trade))
        : Promise.resolve(trade)
    })
  }

  updateTradeDetails (trade) {
    return this._api.getTradeStatus(trade.depositAddress).then(status => {
      let shouldSync = status.status !== trade.status
      trade.setStatus(status)
      if (shouldSync) this.sync()
      return trade
    })
  }

  fetchFullTrades () {
    trace('fetching full trades')
    let requests = this.trades.map(t => this.updateTradeDetails(t))
    return Promise.all(requests);
  }

  nextAddressForCurrency (currency) {
    if (currency === 'btc') {
      return this._wallet.hdwallet.defaultAccount.receiveAddress
    }
    if (currency === 'eth') {
      return this._wallet.eth.defaultAccount.address
    }
    if (currency === 'bch') {
      return this._wallet.bch.defaultAccount.receiveAddress
    }
    throw new Error(`Currency '${currency}' is not supported`)
  }

  setUSAState (state) {
    this._USAState = state
    this.sync()
  }

  isDepositTx (hash) {
    return this.trades.some(t => t.depositHash === hash)
  }

  isWithdrawalTx (hash) {
    return this.trades.filter(t => t.isComplete).some(t => t.withdrawalHash === hash)
  }

  fetch () {
    return this._metadata.fetch().then(data => {
      if (data) {
        this._USAState = data.USAState;
        this._trades = data.trades.map(Trade.fromMetadata)
      }
    })
  }

  sync () {
    trace('syncing')
    return this._metadata.update(this)
  }

  toJSON () {
    return {
      trades: this._trades,
      USAState: this._USAState
    }
  }

  static fromBlockchainWallet (wallet, apiKey) {
    let metadata = wallet.metadata(METADATA_TYPE_SHAPE_SHIFT);
    return new ShapeShift(wallet, metadata, apiKey)
  }
}

module.exports = ShapeShift
