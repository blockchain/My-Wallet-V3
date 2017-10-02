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
    this._imported = new BchImported(this, this._wallet)
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

  get importedAddresses () {
    return this._imported
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
    let addrs = this._wallet.addresses
    let xpubs = this._wallet.hdwallet.xpubs
    return BchApi.multiaddr(addrs.concat(xpubs), 50).then(result => {
      let { wallet, addresses, txs, info } = result
      this._balance = wallet.final_balance
      this._addressInfo = fromPairs(map(a => [a.address, a], addresses))
      this._txs = txs.filter(tx => tx.block_height >= BCH_FORK_HEIGHT).map(Tx.factory)
      this._txs.forEach(tx => {
        tx.confirmations = Tx.setConfirmations(tx.block_height, info.latest_block.height)
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
