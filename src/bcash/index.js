/* eslint-disable semi */
const { map, fromPairs } = require('ramda')
const CashApi = require('./api')
const CashPayment = require('./cash-payment')
const Tx = require('../wallet-transaction')
const BchAccount = require('./bch-account')

const BCH_FORK_HEIGHT = 478558

class BitcoinCashWallet {
  constructor (wallet) {
    this._wallet = wallet
    this._balance = null
    this._addressInfo = {}
    this._txs = []
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

  getHistory () {
    let addrs = this._wallet.addresses
    let xpubs = this._wallet.hdwallet.xpubs
    return CashApi.multiaddr(addrs.concat(xpubs), 50).then(result => {
      let { wallet, addresses, txs, info } = result
      this._balance = wallet.final_balance
      this._addressInfo = fromPairs(map(a => [a.address, a], addresses))
      this._txs = txs.filter(tx => tx.block_height >= BCH_FORK_HEIGHT).map(Tx.factory)
      this._txs.forEach(tx => {
        tx.confirmations = Tx.setConfirmations(tx.block_height, info.latest_block.height)
      })
      this.accounts.forEach(account => {
        account.setInfo(this._addressInfo[account.xpub])
      })
    })
  }

  createPayment () {
    return new CashPayment(this._wallet)
  }

  static fromBlockchainWallet (wallet) {
    return new BitcoinCashWallet(wallet)
  }
}

module.exports = BitcoinCashWallet
