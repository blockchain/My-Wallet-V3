const R = require('ramda');
const H = require('../helpers');
const Web3 = require('web3');
const Metadata = require('../metadata');
const EthKey = require('./eth-key');
const METADATA_TYPE_ETH = 4;

const web3 = new Web3();

class EthWallet {
  constructor (metadata) {
    this._metadata = metadata;
    this._keys = [];
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

  get syncing () {
    return this._syncing;
  }

  generateKey () {
    let key = EthKey.generate();
    this._keys.push(key);
    this.sync();
    return key;
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
      if (data) this._keys = data.map(R.construct(EthKey));
    });
  }

  sync () {
    this._syncing = true;
    return this._metadata.update(this).catch(() => {}).then(() => { this._syncing = false; });
  }

  toJSON () {
    return this._keys;
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
    return new EthWallet(metadata);
  }
}

module.exports = EthWallet;
