const R = require('ramda');
const H = require('../helpers');
const Web3 = require('web3');
const EthHd = require('ethereumjs-wallet/hdkey');
const EthTxBuilder = require('./eth-tx-builder');
const EthAccount = require('./eth-account');
const API = require('../api');
const EthSocket = require('./eth-socket');

const METADATA_TYPE_ETH = 5;
const DERIVATION_PATH = "m/44'/60'/0'/0";
const web3 = new Web3();

class EthWallet {
  constructor (wallet, metadata) {
    this._wallet = wallet;
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
      GAS_PRICE: EthTxBuilder.GAS_PRICE,
      GAS_LIMIT: EthTxBuilder.GAS_LIMIT
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
    this._socket.subscribeToAccount(account);
    this.sync();
  }

  createAccount (label, secPass) {
    let accountNode = this.deriveChild(this.accounts.length, secPass);
    let account = EthAccount.fromWallet(accountNode.getWallet());
    account.label = label || EthAccount.defaultLabel(this.accounts.length);
    this._accounts.push(account);
    this._socket.subscribeToAccount(account);
    this.sync();
    return account;
  }

  getTxNote (hash) {
    return this._txNotes[hash] || null;
  }

  setTxNote (hash, note) {
    if (note === null || note === '') {
      delete this._txNotes[hash];
    } else if (typeof note !== 'string') {
      throw new Error('setTxNote note must be a string or null');
    } else {
      this._txNotes[hash] = note;
    }
    this.updateTxs();
    this.sync();
  }

  setDefaultAccountIndex (i) {
    if (!H.isPositiveNumber(i)) {
      throw new Error('Account index must be a number >= 0');
    } else if (i >= this.accounts.length) {
      throw new Error('Account index out of bounds');
    } else if (this._defaultAccountIdx === i) {
      return;
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
        this.activeAccounts.forEach(a => this._socket.subscribeToAccount(a));
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
      this.updateTxs();
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

  connect () {
    if (this._socket) return;
    this._socket = new EthSocket();
    this._socket.on('message', () => {
      this.getLatestBlock().then(() => { this.updateTxs(); });
    });
  }

  updateTxs () {
    this.activeAccounts.forEach(a => a.updateTxs(this));
  }

  getPrivateKeyForAccount (account, secPass) {
    let index = this.accounts.indexOf(account);
    let wallet = this.deriveChild(index, secPass).getWallet();
    let privateKey = wallet.getPrivateKey();
    if (!account.isCorrectPrivateKey(privateKey)) {
      throw new Error('Failed to derive correct private key');
    }
    return privateKey;
  }

  deriveChild (index, secPass) {
    let w = this._wallet;
    if (w.isDoubleEncrypted && !secPass) {
      throw new Error('Second password required to derive ethereum wallet');
    }
    let getSeedHex = w.isDoubleEncrypted ? w.createCipher(secPass, 'dec') : x => x;
    let seed = getSeedHex(w.hdwallet.seedHex);
    return EthHd.fromMasterSeed(seed).derivePath(DERIVATION_PATH).deriveChild(index);
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_ETH);
    return new EthWallet(wallet, metadata);
  }
}

module.exports = EthWallet;
