const EthHd = require('ethereumjs-wallet/hdkey');
const { construct } = require('ramda');
const { isPositiveNumber, asyncOnce, dedup } = require('../helpers');
const API = require('../api');
const EthAccount = require('./eth-account');
const EthWalletTx = require('./eth-wallet-tx');

const METADATA_TYPE_ETH = 5;

class EthWallet {
  constructor (wallet, metadata) {
    this._wallet = wallet;
    this._metadata = metadata;
    this._hasSeen = false;
    this._defaultAccountIdx = 0;
    this._accounts = [];
    this._txNotes = {};
    this._txMeta = {};
    this._latestBlock = null;
    this._lastTx = null;
    this._lastTxTimestamp = null;
    this._erc20 = {};
    this.sync = asyncOnce(this.sync.bind(this), 250);
  }

  get hasSeen () {
    return this._hasSeen;
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

  get legacyAccount () {
    return this._legacyAccount;
  }

  get activeAccounts () {
    return this.accounts.filter(a => !a.archived);
  }

  get activeAccountsWithLegacy () {
    return this.legacyAccount
      ? this.activeAccounts.concat(this.legacyAccount)
      : this.activeAccounts;
  }

  get latestBlock () {
    return this._latestBlock;
  }

  get lastTx () {
    return this._lastTx;
  }

  get lastTxTimestamp () {
    return this._lastTxTimestamp;
  }

  get erc20 () {
    return this._erc20;
  }

  get txs () {
    let accounts = this.activeAccountsWithLegacy;
    return dedup(accounts.map(a => a.txs), 'hash').sort(EthWalletTx.txTimeSort);
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

  createAccount (label, secPass) {
    let accountNode = this.deriveChild(this.accounts.length, secPass);
    let account = EthAccount.fromWallet(accountNode.getWallet(), this);
    account.label = label || EthAccount.defaultLabel(this.accounts.length);
    account.markAsCorrect();
    this._accounts.push(account);
    return this.sync();
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

  getTxMeta (hash) {
    return this._txMeta[hash] || null;
  }

  setTxMeta (hash, meta) {
    if (meta === null || meta === {}) {
      delete this._txMeta[hash];
    } else if (typeof meta !== 'object') {
      throw new Error('setTxMeta meta must be a meta object or null');
    } else {
      this._txMeta[hash] = meta;
    }
    this.updateTxs();
    return this.sync();
  }

  setLastTx (tx) {
    this._lastTx = tx;
    this._lastTxTimestamp = new Date().getTime();
    this.sync();
  }

  setLastTxAndSync (tx) {
    this._lastTx = tx;
    this._lastTxTimestamp = new Date().getTime();
    return this.sync();
  }

  getERC20TxNotes (contractAddress) {
    return this._erc20[contractAddress] || null;
  }
  
  getERC20Tokens () {
    return this._erc20;
  }

  setERC20Tokens (erc20Tokens) {
    this._erc20 = erc20Tokens;
    return this.sync();
  }

  setHasSeen (hasSeen) {
    this._hasSeen = hasSeen;
    this.sync();
  }

  setDefaultAccountIndex (i) {
    if (!isPositiveNumber(i)) {
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
        let constructAccount = construct(EthAccount);
        let { ethereum } = data;
        this._hasSeen = ethereum.has_seen;
        this._defaultAccountIdx = ethereum.default_account_idx;
        this._accounts = ethereum.accounts.map(it => constructAccount(it)(this));
        this._txNotes = ethereum.tx_notes || {};
        this._txMeta = ethereum.tx_meta || {};
        this._lastTx = ethereum.last_tx;
        this._lastTxTimestamp = ethereum.last_tx_timestamp;
        if (ethereum.legacy_account) {
          this._legacyAccount = constructAccount(ethereum.legacy_account)(this);
        };
        this._erc20 = ethereum.erc20 || {};
      }
    });
  }

  sync () {
    let data = { ethereum: this };
    return this._metadata.update(data);
  }

  toJSON () {
    return {
      has_seen: this._hasSeen,
      default_account_idx: this._defaultAccountIdx,
      accounts: this._accounts,
      legacy_account: this._legacyAccount,
      tx_notes: this._txNotes,
      tx_meta: this._txMeta,
      last_tx: this._lastTx,
      last_tx_timestamp: this._lastTxTimestamp,
      erc20: this._erc20
    };
  }

  getLatestBlock () {
    return fetch(`${API.API_ROOT_URL}eth/latestblock`)
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(block => this.setLatestBlock(block.number));
  }

  setLatestBlock (blockNumber) {
    this._latestBlock = blockNumber;
    this.updateTxs();
  }

  updateTxs () {
    this.activeAccountsWithLegacy.forEach(a => a.updateTxs(this));
  }

  deriveChild (index, secPass) {
    let w = this._wallet;
    let cipher;
    if (w.isDoubleEncrypted) {
      if (!secPass) throw new Error('Second password required to derive ethereum wallet');
      else cipher = w.createCipher(secPass);
    }
    let masterHdNode = w.hdwallet.getMasterHDNode(cipher);
    let accountNode = masterHdNode
      .deriveHardened(44)
      .deriveHardened(60)
      .deriveHardened(0)
      .derive(0)
      .derive(index);
    return EthHd.fromExtendedKey(accountNode.toBase58());
  }

  /* start legacy */

  transitionFromLegacy () {
    if (this.defaultAccount && !this.defaultAccount.isCorrect) {
      this._legacyAccount = this.getAccount(0);
      this._accounts = [];
      return this.sync();
    } else {
      return Promise.resolve();
    }
  }

  /* end legacy */

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_ETH);
    return new EthWallet(wallet, metadata);
  }
}

module.exports = EthWallet;
