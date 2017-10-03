/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')

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

  get label () {
    let walletIndex = this.index > 0 ? ' ' + (this.index + 1) : ''
    return 'My Bitcoin Cash Wallet' + walletIndex
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

  getAvailableBalance (feePerByte) {
    return super.getAvailableBalance(this.index, feePerByte)
  }

  createPayment () {
    return super.createPayment().from(this.index, this.changeAddress)
  }
}

module.exports = BchAccount
