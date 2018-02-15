/* eslint-disable semi */
const { delay, asyncOnce, trace } = require('../helpers')
const Api = require('./api')
const Trade = require('./trade')
const Quote = require('./quote')

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

  getQuote (from, to, amount) {
    trace('getting quote')

    let returnAddress = from.receiveAddress;
    let withdrawalAddress = to.receiveAddress;
    let coinPair = from.coinCode + '_' + to.coinCode;

    return this._api.getQuote(coinPair, amount, withdrawalAddress, returnAddress)
      .then(Quote.fromApiResponse)
  }

  getApproximateQuote (from, to, amount) {
    trace('getting approximate quote')

    let coinPair = from.coinCode + '_' + to.coinCode;

    return this._api.getQuote(coinPair, amount)
      .then(Quote.fromApiResponse)
  }

  buildPayment (quote, fee, fromAccount) {
    trace('building payment')
    if (quote.depositAddress == null) {
      throw new Error('Quote is missing deposit address')
    }
    if (fromAccount.coinCode !== quote.fromCurrency) {
      throw new Error('Sending account currency does not match quote deposit currency')
    }
    let payment = fromAccount.createShiftPayment(this._wallet)
    return payment.setFromQuote(quote, fee)
  }

  shift (payment, secPass) {
    trace('starting shift')
    return payment.publish(secPass).then(({ hash }) => {
      trace('finished shift')
      if (payment.quote.toCurrency === 'btc') {
        this.saveBtcWithdrawalLabel(payment.quote)
      }
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

  saveBtcWithdrawalLabel (quote) {
    let label = `ShapeShift order #${quote.orderId}`
    let account = this._wallet.hdwallet.defaultAccount
    account.setLabel(account.receiveIndex, label)
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
