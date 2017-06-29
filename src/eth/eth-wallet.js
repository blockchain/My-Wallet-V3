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
    return Promise.all(
      this.accounts.filter(a => !a.archived).map(a => a.fetchBalance())
    );
  }

  static fromBlockchainWallet (wallet) {
    let metadata = Metadata.fromMetadataHDNode(wallet._metadataHDNode, METADATA_TYPE_ETH);
    return new EthWallet(wallet.hdwallet.seedHex, metadata);
  }
}

module.exports = EthWallet;
