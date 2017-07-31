/* eslint-disable semi */
class Trade {
  constructor (obj) {
    this._pair = obj.pair
    this._deposit = obj.deposit
    this._withdrawal = obj.withdrawal
    this._status = null
    this._error = null
  }

  get pair () {
    return this._pair
  }

  get fromCurrency () {
    return this.pair.split('_')[0]
  }

  get toCurrency () {
    return this.pair.split('_')[1]
  }

  get depositAddress () {
    return this._deposit
  }

  get withdrawalAddress () {
    return this._withdrawal
  }

  get status () {
    return this._status
  }

  get isWaitingForDeposit () {
    return this._status === Trade.NO_DEPOSITS
  }

  get isProcessing () {
    return this._status === Trade.RECEIVED
  }

  get isComplete () {
    return this._status === Trade.COMPLETE
  }

  get isFailed () {
    return this._status === Trade.FAILED
  }

  get failedReason () {
    return this._error
  }

  setStatus (status) {
    this._status = status.status
    if (this.isCompleted) {
    }
    if (this.isFailed) {
      this._error = status.error
    }
    return this
  }

  static get NO_DEPOSITS () {
    return 'no_deposits'
  }

  static get RECEIVED () {
    return 'received'
  }

  static get COMPLETE () {
    return 'complete'
  }

  static get FAILED () {
    return 'failed'
  }

  static fromQuote (quote) {
    let trade = new Trade({
      pair: quote.pair,
      deposit: quote.depositAddress,
      withdrawal: quote.withdrawalAddress
    })
    trade.setStatus({ status: Trade.NO_DEPOSITS })
    return trade
  }
}

module.exports = Trade
