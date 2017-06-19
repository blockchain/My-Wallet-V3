const keythereum = require('keythereum');
const util = require('ethereumjs-util');
const EthTx = require('./eth-tx');
const Web3 = require('web3');
const web3 = new Web3();

const GAS_LIMIT = 21000;

class EthKey {
  constructor (obj) {
    this._privateKey = Buffer.from(obj.privateKey, 'hex');
    this._iv = obj.iv ? Buffer.from(obj.iv, 'hex') : null;
    this._salt = obj.salt ? Buffer.from(obj.salt, 'hex') : null;
    this._balance = null;
    this._txCount = null;
  }

  get address () {
    return keythereum.privateKeyToAddress(this._privateKey);
  }

  get privateKey () {
    return this._privateKey;
  }

  get wei () {
    return this._balance;
  }

  get balance () {
    return web3.fromWei(this.wei, 'ether');
  }

  get txCount () {
    return this._txCount;
  }

  spend (to, amount, fee) {
    let rawtx = new EthTx()
      .setTo(to)
      .setGasLimit(GAS_LIMIT)
      .setGasPrice(parseInt(web3.toWei(fee, 'gwei')))
      .setValue(parseInt(web3.toWei(amount, 'ether')))
      .setNonce(this.txCount)
      .setData(null)
      .sign(this)
      .toRaw();

    return EthKey.pushtx(rawtx);
  }

  sweep (to, fee) {
    let rawtx = new EthTx()
      .setTo(to)
      .setGasLimit(GAS_LIMIT)
      .setGasPrice(parseInt(web3.toWei(fee, 'gwei')))
      .sweep(this)
      .setNonce(this.txCount)
      .setData(null)
      .sign(this)
      .toRaw();

    return EthKey.pushtx(rawtx);
  }

  equals (key) {
    return this.privateKey.compare(key.privateKey) === 0;
  }

  fetchBalance () {
    let address = this.address;
    return fetch(`/eth/address/${address}`)
      .then(res => res.json())
      .then((data) => this.setData(data));
  }

  setData (data) {
    this._balance = data.balance;
    this._txCount = data.txCount;
  }

  toJSON () {
    return {
      privateKey: this._privateKey.toString('hex'),
      iv: this._iv ? this._iv.toString('hex') : null,
      salt: this._salt ? this._salt.toString('hex') : null
    };
  }

  static generate () {
    let dk = keythereum.create();
    let key = new EthKey(dk);
    key.setData({ balance: 0, txCount: 0 });
    return key;
  }

  static fromPriv (priv) {
    let privateKey = Buffer.from(priv, 'hex');
    if (!util.isValidPrivate(privateKey)) {
      throw new Error('Invalid ethereum private key');
    }
    return new EthKey({ privateKey });
  }

  static pushtx (rawtx) {
    return fetch('/eth/pushtx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawtx })
    }).then(r =>
      r.status === 200 ? r.json() : r.json().then((err) => Promise.reject(err))
    );
  }
}

module.exports = EthKey;
