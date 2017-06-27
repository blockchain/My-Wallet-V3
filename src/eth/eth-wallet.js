const R = require('ramda');
const H = require('../helpers');
const Web3 = require('web3');
const EthHd = require('ethereumjs-wallet/hdkey');
const Metadata = require('../metadata');
const EthAccount = require('./eth-account');
const METADATA_TYPE_ETH = 4;

const web3 = new Web3();

const DERIVATION_PATH = "m/44'/60'/0'/0";

class EthWallet {
  constructor (seed, metadata) {
    this._hdWallet = EthHd.fromMasterSeed(seed).derivePath(DERIVATION_PATH);
    this._metadata = metadata;
    this._defaultAccountIdx = 0;
    this._accounts = [];
    this._syncing = false;
  }

  get wei () {
    return this.keys.map(k => k.wei).filter(H.isNonNull).reduce(H.add, 0);
  }

  get balance () {
    return web3.fromWei(this.wei, 'ether');
  }

  get txCount () {
    return this.keys.map(k => k.txCount).filter(H.isNonNull).reduce(H.add, 0);
  }

  get accounts () {
    return this._accounts;
  }

  get syncing () {
    return this._syncing;
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

  archiveAccount (index) {
    this.getAccount(index).archived = true;
    this.sync();
  }

  unarchiveAccount (index) {
    this.getAccount(index).archived = false;
    this.sync();
  }

  createAccount (label) {
    let accountNode = this._wallet.deriveChild(this.accounts.length);
    let account = EthAccount.fromWallet(accountNode.getWallet());
    account.label = label || `${EthWallet.defaultLabel} ${this.accounts.length}`;
    this._accounts.push(account);
    this.sync();
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      if (data) {
        let { ethereum } = data;
        this._defaultAccountIdx = ethereum.default_account_idx;
        this._accounts = ethereum.accounts.map(R.construct(EthAccount));
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
      accounts: this._accounts
    };
  }

  fetchBalances () {
    let keys = this.keys;
    let addresses = keys.map(k => k.address);
    return fetch('/eth/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses })
    }).then(res => res.json()).then((balances) => {
      balances.forEach((data, i) => { keys[i].setData(data); });
    });
  }

  static get defaultLabel () {
    return 'My Ethereum Wallet';
  }

  static construct (wallet) {
    let metadata = Metadata.fromMetadataHDNode(wallet._metadataHDNode, METADATA_TYPE_ETH);
    return new EthWallet(wallet.hdwallet.seedHex, metadata);
  }
}

module.exports = EthWallet;
