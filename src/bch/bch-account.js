/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')
const BchShiftPayment = require('../shift/bch-payment');
const H = require('../helpers')

class BchAccount extends BchSpendable {
  constructor (bchWallet, wallet, btcAccount, accountData) {
    super(bchWallet, wallet)
    this._sync = () => bchWallet.sync()
    this._btcAccount = btcAccount
    this._label = accountData.label || BchAccount.defaultLabel(this.index)
    this._archived = accountData.archived == null ? false : accountData.archived
  }

  get index () {
    return this._btcAccount.index
  }

  get xpub () {
    return this._btcAccount.extendedPublicKey
  }

  get archived () {
    return this._archived
  }

  set archived (value) {
    if (typeof value !== 'boolean') {
      throw new Error('BchAccount.archived must be a boolean')
    }
    if (this === this._bchWallet.defaultAccount) {
      throw new Error('Cannot archive default BCH account');
    }
    this._archived = value
    this._sync()
  }

  get label () {
    return this._label
  }

  set label (value) {
    if (!H.isValidLabel(value)) {
      throw new Error('BchAccount.label must be an alphanumeric string');
    }
    this._label = value
    this._sync()
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

  toJSON () {
    return {
      label: this.label,
      archived: this.archived
    }
  }

  static defaultLabel (accountIdx) {
    let label = 'My Bitcoin Cash Wallet';
    return accountIdx > 0 ? `${label} ${accountIdx + 1}` : label;
  }
}

module.exports = BchAccount
