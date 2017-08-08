/* eslint-disable semi */
class Quote {
  constructor (obj) {
    this._orderId = obj.orderId
    this._pair = obj.pair
    this._deposit = obj.deposit
    this._depositAmount = obj.depositAmount
    this._withdrawal = obj.withdrawal
    this._withdrawalAmount = obj.withdrawalAmount
    this._minerFee = obj.minerFee
    this._expiration = new Date(obj.expiration)
    this._quotedRate = obj.quotedRate
  }

  get orderId () {
    return this._orderId
  }

  get pair () {
    return this._pair
  }

  get rate () {
    return this._quotedRate
  }

  get expires () {
    return this._expiration
  }

  get depositAddress () {
    return this._deposit
  }

  get depositAmount () {
    return this._depositAmount
  }

  get withdrawalAddress () {
    return this._withdrawal
  }

  get withdrawalAmount () {
    return this._withdrawalAmount
  }

  get minerFee () {
    return this._minerFee
  }

  get fromCurrency () {
    return this.pair.split('_')[0]
  }

  get toCurrency () {
    return this.pair.split('_')[1]
  }

  setFieldsFromTxStat (response) {
    this._pair = this._pair || [response.incomingType, response.outgoingType].join('_')
    this._depositAmount = this._depositAmount || response.incomingCoin
    this._withdrawal = this._withdrawal || response.withdraw
    this._withdrawalAmount = this._withdrawalAmount || response.outgoingCoin
    return this
  }

  toJSON () {
    return Object.assign(this.toPartialJSON(), {
      pair: this._pair,
      depositAmount: this._depositAmount,
      withdrawal: this._withdrawal,
      withdrawalAmount: this._withdrawalAmount
    })
  }

  toPartialJSON () {
    return {
      orderId: this._orderId,
      quotedRate: this._quotedRate,
      deposit: this._deposit,
      minerFee: this._minerFee
    }
  }

  static fromApiResponse (response) {
    return new Quote(response)
  }
}

module.exports = Quote
