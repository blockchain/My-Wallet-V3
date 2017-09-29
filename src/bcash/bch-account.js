/* eslint-disable semi */
const Api = require('./api')
const { selectAll } = require('./coin-selection')

class BchAccount {
  constructor (bchWallet, wallet, btcAccount) {
    this._bchWallet = bchWallet
    this._wallet = wallet
    this._btcAccount = btcAccount
    this.balance = null
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
    return this._bchWallet.getAddressBalance(this.xpub)
  }

  getAvailableBalance (feePerByte) {
    return Api.getUnspents(this._wallet, this.index).then(coins => {
      let { fee, outputs } = selectAll(feePerByte, coins, null)
      return { fee, amount: outputs[0].value }
    });
  }
}

module.exports = BchAccount
