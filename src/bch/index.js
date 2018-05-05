/* eslint-disable semi */
const { map, fromPairs, pipe } = require('ramda')
const WebSocket = require('ws');
const BchApi = require('./bch-api')
const BchPayment = require('./bch-payment')
const Tx = require('../wallet-transaction')
const BchAccount = require('./bch-account')
const BchImported = require('./bch-imported')
const Helpers = require('../helpers');
const BlockchainSocket = require('../blockchain-socket');

const BCH_FORK_HEIGHT = 478558
const METADATA_TYPE_BCH = 7;

class BitcoinCashWallet {
  constructor (wallet, metadata) {
    this._wallet = wallet
    this._metadata = metadata
    this._balance = null
    this._addressInfo = {}
    this._hasSeen = false
    this._txs = []
  }

  get balance () {
    return this._balance
  }

  get importedAddresses () {
    return this._importedAddresses
  }

  get accounts () {
    return this._accounts
  }

  get txs () {
    return this._txs
  }

  get defaultAccountIdx () {
    return this._defaultAccountIdx
  }

  set defaultAccountIdx (val) {
    if (this.isValidAccountIndex(val)) {
      this._defaultAccountIdx = val;
      this.sync();
    } else {
      throw new Error('invalid default index account');
    }
  }

  get defaultAccount () {
    return this.accounts[this.defaultAccountIdx]
  }

  get activeAccounts () {
    return this.accounts.filter(a => !a.archived)
  }

  get hasSeen () {
    return this._hasSeen;
  }

  setHasSeen (hasSeen) {
    this._hasSeen = hasSeen;
    this.sync();
  }

  isValidAccountIndex (index) {
    return Helpers.isPositiveInteger(index) && index < this._accounts.length;
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
    let xpubs = this.activeAccounts.map(a => a.xpub)
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

  connect (wsUrl) {
    if (this._socket) return;
    this._socket = new BlockchainSocket(wsUrl, WebSocket);
    this._socket.on('open', () => {
      this._socket.subscribeToAddresses(this.importedAddresses == null ? [] : this.importedAddresses.addresses)
      this._socket.subscribeToXpubs(this.activeAccounts.map(a => a.xpub))
    });
    this._socket.on('message', pipe(JSON.parse, (data) => {
      if (data.op === 'utx') this.getHistory()
    }))
    this._socket.connect();
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      let accountsData = data ? data.accounts : [];
      this._defaultAccountIdx = data ? data.default_account_idx : 0;

      let imported = new BchImported(this, this._wallet)
      this._importedAddresses = imported.addresses.length > 0 ? imported : null

      this._accounts = this._wallet.hdwallet.accounts.map((account, i) => {
        let accountData = accountsData[i] || {}
        return new BchAccount(this, this._wallet, account, accountData);
      })

      this._hasSeen = data && data.has_seen;
    });
  }

  sync () {
    return this._metadata.update(this);
  }

  toJSON () {
    return {
      default_account_idx: this.defaultAccountIdx,
      accounts: this.accounts,
      has_seen: this.hasSeen
    }
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_BCH)
    return new BitcoinCashWallet(wallet, metadata)
  }
}

module.exports = BitcoinCashWallet
