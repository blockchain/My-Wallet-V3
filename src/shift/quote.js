/* eslint-disable semi */
class Quote {
  constructor (obj) {
    this._pair = obj.pair
    this._deposit = obj.deposit
    this._depositAmount = obj.depositAmount
    this._withdrawal = obj.withdrawal
    this._withdrawalAmount = obj.withdrawalAmount
    this._expiration = new Date(obj.expiration)
    this._quotedRate = obj.quotedRate
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

  get fromCurrency () {
    return this.pair.split('_')[0]
  }

  get toCurrency () {
    return this.pair.split('_')[1]
  }

  static fromApiResponse (response) {
    return new Quote(response)
  }
}

module.exorts = Quote
