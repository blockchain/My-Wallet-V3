/* eslint-disable semi */
const Quote = require('./quote')
const { trace } = require('../helpers')

class Trade {
  constructor (obj) {
    this._status = obj.status
    this._error = obj.error
    this._hashIn = obj.hashIn
    this._hashOut = obj.hashOut
    this._quote = obj.quote

    /* prefer `timestamp` if exists */
    if (obj.timestamp) {
      this._time = new Date(obj.timestamp)
    } else if (obj.time) {
      this._time = new Date(obj.time)
    }
  }

  get quote () {
    return this._quote
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

  get error () {
    return this._error
  }

  get status () {
    return this._status
  }

  get isPending () {
    return this.isWaitingForDeposit || this.isProcessing
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

  get isResolved () {
    return this._status === Trade.RESOLVED
  }

  get failedReason () {
    return this._error
  }

  get depositHash () {
    return this._hashIn
  }

  get withdrawalHash () {
    return this._hashOut
  }

  get time () {
    return this._time
  }

  setStatus (status) {
    trace('setting trade status', this, status)
    this._status = status.status
    if (this.isComplete) {
      this._hashOut = status.transaction
    }
    if (this.isFailed || this.isResolved) {
      this._error = status.error
    }
    this.quote.setFieldsFromTxStat(status)
    return this
  }

  setDepositHash (hash) {
    trace('setting deposit hash', this, hash)
    this._hashIn = hash
    return this
  }

  toJSON () {
    return {
      status: this._status,
      hashIn: this._hashIn,
      hashOut: this._hashOut,
      time: this._time && this._time.toString(),
      // save `timestamp` as UNIX timestamp integer
      timestamp: this._time && this._time.getTime(),
      quote: this.isComplete ? this._quote.toPartialJSON() : this._quote.toJSON()
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

  static get RESOLVED () {
    return 'resolved'
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
