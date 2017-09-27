/* eslint-disable semi */
const { map, reduce, add, values, compose } = require('ramda')
const Api = require('../api')
const CashApi = require('./api')
const CashPayment = require('./cash-payment')

class BitcoinCashWallet {
  constructor (wallet) {
    this._wallet = wallet
    this.balance = null
    this.accountBalances = []
  }

  getBalances () {
    let xpubs = this._wallet.hdwallet.accounts.map(a => a.extendedPublicKey)
    let calcTotal = compose(reduce(add, 0), map(x => x.final_balance), values)
    return Api.getBalances(xpubs).then(result => {
      this.balance = calcTotal(result)
      this.accountBalances = map(xpub => result[xpub].final_balance, xpubs)
    })
  }

  createPayment (source) {
    return CashApi.getUnspents(this._wallet, source)
      .then(coins => new CashPayment(this._wallet, coins))
  }

  static fromBlockchainWallet (wallet) {
    return new BitcoinCashWallet(wallet)
  }
}

module.exports = BitcoinCashWallet
