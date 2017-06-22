const R = require('ramda');
const H = require('../helpers');
const Web3 = require('web3');
const EthHd = require('ethereumjs-wallet/hdkey');
const Metadata = require('../metadata');
const EthKey = require('./eth-key');
const EthAccount = require('./eth-account');
const METADATA_TYPE_ETH = 4;

const web3 = new Web3();

class EthWallet {
  constructor (seed, metadata) {
    this._wallet = EthHd.fromMasterSeed(seed);
    this._metadata = metadata;
    this._keys = [];
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

  get keys () {
    return this._keys;
  }

  get accounts () {
    return this._accounts;
  }

  get syncing () {
    return this._syncing;
  }

  generateKey () {
    let key = EthKey.generate();
    this._keys.push(key);
    this.sync();
    return key;
  }

  setAccountLabel (index, label) {
    let account = this.accounts[index];
    if (!account) throw new Error(`Account ${index} does not exist`);
    account.label = label;
    this.sync();
  }

  createAccount (label) {
    let path = `m/44'/${this.accounts.length}'`;
    let account = EthAccount.fromNode(this._wallet.derivePath(path));
    if (label) account.label = label;
    this._accounts.push(account);
    this.sync();
  }

  importKey (priv) {
    let key = EthKey.fromPriv(priv);
    if (this.keys.some(k => k.equals(key))) {
      throw new Error('Duplicate key in eth wallet');
    }
    this._keys.push(key);
    this.sync();
    return key;
  }

  deleteKey (key) {
    let index = this.keys.indexOf(key);
    if (index > -1) {
      this.keys.splice(index, 1);
      this.sync();
    }
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      if (data) {
        this._keys = data.keys.map(R.construct(EthKey));
        this._accounts = data.accounts.map(R.construct(EthAccount));
      }
    });
  }

  sync () {
    this._syncing = true;
    return this._metadata.update(this).catch(() => {}).then(() => { this._syncing = false; });
  }

  toJSON () {
    return {
      keys: this._keys,
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

  static construct (wallet) {
    let metadata = Metadata.fromMetadataHDNode(wallet._metadataHDNode, METADATA_TYPE_ETH);
    return new EthWallet(wallet.hdwallet.seedHex, metadata);
  }
}

module.exports = EthWallet;
