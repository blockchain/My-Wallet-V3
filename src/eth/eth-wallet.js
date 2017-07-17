const R = require('ramda');
const H = require('../helpers');
const Web3 = require('web3');
const EthHd = require('ethereumjs-wallet/hdkey');
const EthTx = require('./eth-tx');
const EthAccount = require('./eth-account');
const API = require('../api');

const METADATA_TYPE_ETH = 5;
const DERIVATION_PATH = "m/44'/60'/0'/0";
const web3 = new Web3();

class EthWallet {
  constructor (seed, metadata) {
    this._hdWallet = EthHd.fromMasterSeed(seed).derivePath(DERIVATION_PATH);
    this._metadata = metadata;
    this._defaultAccountIdx = 0;
    this._accounts = [];
    this._txNotes = {};
    this._syncing = false;
  }

  get wei () {
    return this.accounts.map(k => k.wei).filter(H.isNonNull).reduce(H.add, 0);
  }

  get balance () {
    return web3.fromWei(this.wei, 'ether');
  }

  get defaultAccountIdx () {
    return this._defaultAccountIdx;
  }

  get defaultAccount () {
    return this.accounts[this.defaultAccountIdx];
  }

  get accounts () {
    return this._accounts;
  }

  get activeAccounts () {
    return this.accounts.filter(a => !a.archived);
  }

  get latestBlock () {
    return this._latestBlock;
  }

  get syncing () {
    return this._syncing;
  }

  get defaults () {
    return {
      GAS_PRICE: EthTx.GAS_PRICE,
      GAS_LIMIT: EthTx.GAS_LIMIT
    };
  }

  getAccount (index) {
    let account = this.accounts[index];
    if (!account) throw new Error(`Account ${index} does not exist`);
    return account;
  }

  setAccountLabel (index, label) {
    this.getAccount(index).label = label;
    this.sync();
  }

  archiveAccount (account) {
    if (account === this.defaultAccount) {
      throw new Error('Cannot archive default account');
    }
    account.archived = true;
    this.sync();
  }

  unarchiveAccount (account) {
    account.archived = false;
    this.sync();
  }

  createAccount (label) {
    let accountNode = this._hdWallet.deriveChild(this.accounts.length);
    let account = EthAccount.fromWallet(accountNode.getWallet());
    account.label = label || EthAccount.defaultLabel(this.accounts.length);
    this._accounts.push(account);
    this.sync();
  }

  getTxNote (ethTx) {
    if (!R.is(EthTx)) throw new Error('setTxNote must be passed an EthTx');
    return this._txNotes[ethTx.hash] || null;
  }

  setTxNote (ethTx, note) {
    if (!R.is(EthTx) || typeof note !== 'string') {
      throw new Error('setTxNote must be passed an EthTx and a string');
    }
    this._txNotes[ethTx.hash] = note;
    ethTx.update(this);
    this.sync();
  }

  setDefaultAccountIndex (i) {
    if (!H.isPositiveNumber(i)) {
      throw new Error('Account index must be a number >= 0');
    } else if (i < this.accounts.length - 1) {
      throw new Error('Account index out of bounds');
    } else {
      this._defaultAccountIdx = i;
      this.sync();
    }
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      if (data) {
        let { ethereum } = data;
        this._defaultAccountIdx = ethereum.default_account_idx;
        this._accounts = ethereum.accounts.map(R.construct(EthAccount));
        this._txNotes = ethereum.tx_notes || {};
      }
    });
  }

  sync () {
    this._syncing = true;
    let data = { ethereum: this };
    return this._metadata.update(data).catch(() => {}).then(() => { this._syncing = false; });
  }

  toJSON () {
    return {
      default_account_idx: this._defaultAccountIdx,
      accounts: this._accounts,
      tx_notes: this._txNotes
    };
  }

  fetchHistory () {
    return Promise.all([
      this.getLatestBlock(),
      ...this.activeAccounts.map(a => a.fetchHistory())
    ]).then((result) => {
      this.activeAccounts.forEach(a => a.updateTxs(this));
      return result;
    });
  }

  fetchBalance () {
    return Promise.all(this.activeAccounts.map(a => a.fetchBalance()));
  }

  fetchTransactions () {
    return Promise.all(this.activeAccounts.map(a => a.fetchTransactions()));
  }

  isAddress (address) {
    return web3.isAddress(address);
  }

  isContractAddress (address) {
    return fetch(`${API.API_ROOT_URL}eth/account/${address}/isContract`)
      .then(res => res.json())
      .then(({ contract }) => contract);
  }

  getLatestBlock () {
    return fetch(`${API.API_ROOT_URL}eth/latestblock`)
      .then(res => res.json())
      .then(block => { this._latestBlock = block.number; });
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_ETH);
    return new EthWallet(wallet.hdwallet.seedHex, metadata);
  }
}

module.exports = EthWallet;
