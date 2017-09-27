/* eslint-disable semi */
const { map, fromPairs } = require('ramda')
const Api = require('../api')
const CashApi = require('./api')
const CashPayment = require('./cash-payment')
const Tx = require('../wallet-transaction')

class BitcoinCashWallet {
  constructor (wallet) {
    this._wallet = wallet
    this._finalBalance = null
    this._addressBalances = {}
    this._txs = []
  }

  get balance () {
    return this._finalBalance
  }

  get txs () {
    return this._txs
  }

  getAddressBalance (xpubOrAddress) {
    return this._addressBalances[xpubOrAddress] || null
  }

  getHistory () {
    let addrs = this._wallet.addresses
    let xpubs = this._wallet.hdwallet.xpubs
    return Api.getHistory(addrs.concat(xpubs)).then(result => {
      let { wallet, addresses, txs, info } = result
      this._finalBalance = wallet.final_balance
      this._addressBalances = fromPairs(map(a => [a.address, a.final_balance], addresses))
      this._txs = txs.map(Tx.factory)
      this._txs.forEach(tx => {
        tx.confirmations = Tx.setConfirmations(tx.block_height, info.latest_block.height)
      })
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
