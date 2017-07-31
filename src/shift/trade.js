/* eslint-disable semi */
const Quote = require('./quote')

class Trade {
  constructor (obj) {
    this._status = obj.status
    this._error = obj.error
    this._hash = obj.hash
    this._time = obj.time ? new Date(obj.time) : void 0
    this._quote = obj.quote
  }

  get pair () {
    return this._quote.pair
  }

  get rate () {
    return this._quote.rate
  }

  get fromCurrency () {
    return this._quote.fromCurrency
  }

  get toCurrency () {
    return this._quote.toCurrency
  }

  get depositAddress () {
    return this._quote.depositAddress
  }

  get depositAmount () {
    return this._quote.depositAmount
  }

  get withdrawalAddress () {
    return this._quote.withdrawalAddress
  }

  get withdrawalAmount () {
    return this._quote.withdrawalAmount
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

  get hash () {
    return this._hash
  }

  get time () {
    return this._time
  }

  setStatus (status) {
    this._status = status.status
    if (this.isComplete) {
      this._hash = status.transaction
    }
    if (this.isFailed) {
      this._error = status.error
    }
    return this
  }

  toJSON () {
    return {
      status: this._status,
      error: this._error,
      hash: this._hash,
      time: this._time && this._time.toString(),
      quote: this._quote
    }
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

  static fromMetadata (data) {
    data = Object.assign({}, data, { quote: new Quote(data.quote) })
    return new Trade(data)
  }

  static fromQuote (quote) {
    return new Trade({ status: Trade.NO_DEPOSITS, time: Date.now(), quote })
  }
}

module.exports = Trade
