/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')
const BchShiftPayment = require('../shift/bch-payment');

const ACCOUNT_LABEL_PREFIX = 'Bitcoin Cash - '

class BchAccount extends BchSpendable {
  constructor (bchWallet, wallet, btcAccount) {
    super(bchWallet, wallet)
    this._btcAccount = btcAccount
  }

  get index () {
    return this._btcAccount.index
  }

  get xpub () {
    return this._btcAccount.extendedPublicKey
  }

  get archived () {
    return this._btcAccount.archived
  }

  get label () {
    return ACCOUNT_LABEL_PREFIX + this._btcAccount.label
  }

  get balance () {
    return super.getAddressBalance(this.xpub)
  }

  get receiveAddress () {
    let { receive } = this._bchWallet.getAccountIndexes(this.xpub)
    return this._btcAccount.receiveAddressAtIndex(receive)
  }

  get changeAddress () {
    let { change } = this._bchWallet.getAccountIndexes(this.xpub)
    return this._btcAccount.changeAddressAtIndex(change)
  }

  get coinCode () {
    return 'bch'
  }

  getAvailableBalance (feePerByte) {
    return super.getAvailableBalance(this.index, feePerByte)
  }

  createPayment () {
    return super.createPayment().from(this.index, this.changeAddress)
  }

  createShiftPayment (wallet) {
    return BchShiftPayment.fromWallet(wallet, this)
  }
}

module.exports = BchAccount
