/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')

class BchAccount extends BchSpendable {
  constructor (bchWallet, wallet, btcAccount) {
    super(bchWallet, wallet)
    this._btcAccount = btcAccount
    this.balance = null
    this.receiveIndex = 0
    this.changeIndex = 0
  }

  get index () {
    return this._btcAccount.index
  }

  get xpub () {
    return this._btcAccount.extendedPublicKey
  }

  get label () {
    let walletIndex = this.index > 0 ? ' ' + (this.index + 1) : ''
    return 'My Bitcoin Cash Wallet' + walletIndex
  }

  get balance () {
    return super.getAddressBalance(this.xpub)
  }

  get receiveAddress () {
    return this._btcAccount.receiveAddressAtIndex(this.receiveIndex)
  }

  get changeAddress () {
    return this._btcAccount.changeAddressAtIndex(this.changeIndex)
  }

  getAvailableBalance (feePerByte) {
    return super.getAvailableBalance(this.index, feePerByte)
  }

  createPayment () {
    return super.createPayment().from(this.index)
  }

  setInfo (info = {}) {
    this.receiveIndex = info.account_index || 0
    this.changeIndex = info.change_index || 0
  }
}

module.exports = BchAccount
