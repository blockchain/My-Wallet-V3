/* eslint-disable semi */
const { map, fromPairs } = require('ramda')
const BchApi = require('./bch-api')
const BchPayment = require('./bch-payment')
const Tx = require('../wallet-transaction')
const BchAccount = require('./bch-account')
const BchImported = require('./bch-imported')

const BCH_FORK_HEIGHT = 478558

class BitcoinCashWallet {
  constructor (wallet) {
    this._wallet = wallet
    this._balance = null
    this._addressInfo = {}
    this._txs = []

    this.importedAddresses = this._wallet.keys.filter(k => !k.isWatchOnly).length > 0
      ? new BchImported(this, this._wallet)
      : null

    this.accounts = wallet.hdwallet.accounts.map(account =>
      new BchAccount(this, this._wallet, account)
    )
  }

  get balance () {
    return this._balance
  }

  get txs () {
    return this._txs
  }

  get defaultAccount () {
    return this.accounts[this._wallet.hdwallet.defaultAccountIndex]
  }

  getAddressBalance (xpubOrAddress) {
    let info = this._addressInfo[xpubOrAddress]
    let balance = info && info.final_balance
    return balance == null ? null : balance
  }

  getAccountIndexes (xpub) {
    let defaults = { account_index: 0, change_index: 0 }
    let info = this._addressInfo[xpub] || defaults
    return { receive: info.account_index, change: info.change_index }
  }

  getHistory () {
    let addrs = this.importedAddresses == null ? [] : this.importedAddresses.addresses
    let xpubs = this.accounts.map(a => a.xpub)
    return BchApi.multiaddr(addrs.concat(xpubs), 50).then(result => {
      let { wallet, addresses, txs, info } = result

      this._balance = wallet.final_balance
      this._addressInfo = fromPairs(map(a => [a.address, a], addresses))

      this._txs = txs
        .filter(tx => !tx.block_height || tx.block_height >= BCH_FORK_HEIGHT)
        .map(tx => Tx.factory(tx, 'bch'))

      this._txs.forEach(tx => {
        tx.confirmations = Tx.setConfirmations(tx.block_height, info.latest_block)
      })
    })
  }

  createPayment () {
    return new BchPayment(this._wallet)
  }

  static fromBlockchainWallet (wallet) {
    return new BitcoinCashWallet(wallet)
  }
}

module.exports = BitcoinCashWallet
