const EthereumTx = require('ethereumjs-tx');
const util = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3();
const API = require('../api');

const MAINNET = 1;
const GAS_LIMIT = 21000;

window.web3 = web3;
window.util = util;

class EthTx {
  constructor (account) {
    this._account = account;
    this._tx = new EthereumTx(null, MAINNET);
    this._tx.nonce = this._account.nonce;
    this._tx.gasLimit = GAS_LIMIT;
  }

  get fee () {
    return parseFloat(web3.fromWei(this.feeBN, 'ether'));
  }

  get feeBN () {
    let gas = new util.BN(this._tx.gas);
    let gasPrice = new util.BN(this._tx.gasPrice);
    return gas.mul(gasPrice);
  }

  get amount () {
    return parseFloat(web3.fromWei(this.amountBN, 'ether'));
  }

  get amountBN () {
    return new util.BN(this._tx.value);
  }

  get available () {
    return parseFloat(web3.fromWei(this.availableBN, 'ether'));
  }

  get availableBN () {
    let balance = web3.toBigNumber(this._account.wei);
    return balance.sub(this.feeBN);
  }

  setTo (to) {
    if (!util.isValidAddress(to)) {
      throw new Error('Invalid address');
    }
    this._tx.to = to;
    return this;
  }

  setValue (amount) {
    this._tx.value = parseInt(web3.toWei(amount, 'ether'));
    return this;
  }

  setGasPrice (gasPrice) {
    this._tx.gasPrice = parseInt(web3.toWei(gasPrice, 'gwei'));
    return this;
  }

  setSweep () {
    this.setValue(0);
    let balance = web3.toBigNumber(this._account.wei);
    let amount = balance.sub(this._tx.getUpfrontCost());
    this.setValue(web3.fromWei(amount, 'ether'));
    return this;
  }

  sign () {
    this._tx.sign(this._account.privateKey);
    return this;
  }

  publish () {
    return EthTx.pushTx(this.toRaw());
  }

  toRaw () {
    return '0x' + this._tx.serialize().toString('hex');
  }

  static pushTx (rawtx) {
    return fetch(`${API.API_ROOT_URL}eth/pushtx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawtx })
    }).then(r =>
      r.status === 200 ? r.json() : r.json().then((err) => Promise.reject(err))
    );
  }
}

module.exports = EthTx;
