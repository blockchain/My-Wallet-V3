const EthHd = require('ethereumjs-wallet/hdkey');
const { construct } = require('ramda');
const { isPositiveNumber, asyncOnce } = require('../helpers');
const API = require('../api');
const EthTxBuilder = require('./eth-tx-builder');
const EthAccount = require('./eth-account');
const EthSocket = require('./eth-socket');

const METADATA_TYPE_ETH = 5;
const DERIVATION_PATH = "m/44'/60'/0'/0";

class EthWallet {
  constructor (wallet, metadata) {
    this._wallet = wallet;
    this._metadata = metadata;
    this._hasSeen = false;
    this._defaultAccountIdx = 0;
    this._accounts = [];
    this._txNotes = {};
    this._latestBlock = null;
    this._lastTx = null;
    this.sync = asyncOnce(this.sync.bind(this), 250);
  }

  get wei () {
    return this.defaultAccount ? this.defaultAccount.wei : null;
  }

  get balance () {
    return this.defaultAccount ? this.defaultAccount.balance : null;
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

  get activeAccounts () {
    return this.accounts.filter(a => !a.archived);
  }

  get latestBlock () {
    return this._latestBlock;
  }

  get lastTx () {
    return this._lastTx;
  }

  get defaults () {
    return {
      GAS_PRICE: EthTxBuilder.GAS_PRICE,
      GAS_LIMIT: EthTxBuilder.GAS_LIMIT
    };
  }

  getApproximateBalance () {
    return this.defaultAccount ? this.defaultAccount.getApproximateBalance() : null;
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

  setLastTx (tx) {
    this._lastTx = tx;
    this.sync();
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
        this._accounts = ethereum.accounts.map(constructAccount);
        this._txNotes = ethereum.tx_notes || {};
        this._lastTx = ethereum.last_tx;
        this.activeAccounts.forEach(a => this._socket.subscribeToAccount(a));
        if (ethereum.legacy_account) {
          this._legacyAccount = constructAccount(ethereum.legacy_account);
        }
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
      last_tx: this._lastTx
    };
  }

  fetchHistory () {
    return Promise.all(this.activeAccounts.map(a => a.fetchHistory()))
      .then(() => this.updateTxs())
      .then(() => this.getLatestBlock());
  }

  fetchBalance () {
    return Promise.all(this.activeAccounts.map(a => a.fetchBalance()));
  }

  fetchTransactions () {
    return Promise.all(this.activeAccounts.map(a => a.fetchTransactions()))
      .then(() => this.updateTxs());
  }

  fetchFees () {
    return EthTxBuilder.fetchFees();
  }

  isContractAddress (address) {
    return fetch(`${API.API_ROOT_URL}eth/account/${address}/isContract`)
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(({ contract }) => contract);
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

  connect (wsUrl) {
    if (this._socket) return;
    this._socket = new EthSocket(wsUrl);
    this._socket.subscribeToBlocks(this);

    this._socket.on('close', () => {
      this._socket.subscribeToBlocks(this);
      this.activeAccounts.forEach(a => this._socket.subscribeToAccount(a));
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

  getPrivateKeyForLegacyAccount (secPass) {
    let account = this._legacyAccount;
    if (!account) {
      throw new Error('Wallet does not contain a beta account');
    }
    let wallet = this.deriveChildLegacy(0, secPass).getWallet();
    let privateKey = wallet.getPrivateKey();
    if (!account.isCorrectPrivateKey(privateKey)) {
      throw new Error('Failed to derive correct private key');
    }
    return privateKey;
  }

  deriveChildLegacy (index, secPass) {
    let w = this._wallet;
    if (w.isDoubleEncrypted && !secPass) {
      throw new Error('Second password required to derive ethereum wallet');
    }
    let getSeedHex = w.isDoubleEncrypted ? w.createCipher(secPass, 'dec') : x => x;
    let seed = getSeedHex(w.hdwallet.seedHex);
    return EthHd.fromMasterSeed(seed).derivePath(DERIVATION_PATH).deriveChild(index);
  }

  transitionFromLegacy (secPass) {
    this._legacyAccount = this.getAccount(0);
    this._accounts = [];
    this.createAccount(void 0, secPass);
  }

  /* end legacy */

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_ETH);
    return new EthWallet(wallet, metadata);
  }
}

module.exports = EthWallet;
