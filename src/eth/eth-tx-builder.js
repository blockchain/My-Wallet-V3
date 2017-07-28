const EthereumTx = require('ethereumjs-tx');
const util = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3();
const API = require('../api');

const MAINNET = 1;

window.web3 = web3;
window.util = util;

class EthTxBuilder {
  constructor (account) {
    this._account = account;
    this._tx = new EthereumTx(null, MAINNET);
    this._tx.nonce = this._account.nonce;
    this.update();
  }

  get fee () {
    return this._fee;
  }

  get amount () {
    return this._amount;
  }

  get available () {
    return this._available;
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
    this.update();
    return this;
  }

  setGasPrice (gasPrice) {
    this._tx.gasPrice = parseInt(web3.toWei(gasPrice, 'gwei'));
    this.update();
    return this;
  }

  setGasLimit (gasLimit) {
    this._tx.gasLimit = gasLimit;
    this.update();
    return this;
  }

  setSweep () {
    this.setValue(0);
    let balance = this._account.wei;
    let amount = Math.max(balance.sub(this._tx.getUpfrontCost()), 0);
    this.setValue(web3.fromWei(amount, 'ether'));
    return this;
  }

  sign (privateKey) {
    if (this._account.isCorrectPrivateKey(privateKey)) {
      this._tx.sign(privateKey);
      return this;
    } else {
      throw new Error('Incorrect private key');
    }
  }

  publish () {
    return EthTxBuilder.pushTx(this.toRaw());
  }

  toRaw () {
    return '0x' + this._tx.serialize().toString('hex');
  }

  update () {
    let feeBN = new util.BN(this._tx.gas).mul(new util.BN(this._tx.gasPrice));
    let amountBN = new util.BN(this._tx.value);
    let availableBN = Math.max(parseFloat(this._account.wei.sub(feeBN)), 0);
    this._fee = parseFloat(web3.fromWei(feeBN, 'ether'));
    this._amount = parseFloat(web3.fromWei(amountBN, 'ether'));
    this._available = parseFloat(web3.fromWei(availableBN, 'ether'));
  }

  static get GAS_PRICE () {
    return 21; // gwei
  }

  static get GAS_LIMIT () {
    return 21000;
  }

  static pushTx (rawTx) {
    return fetch(`${API.API_ROOT_URL}eth/pushtx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawTx })
    }).then(r =>
      r.status === 200 ? r.json() : r.json().then((err) => Promise.reject(err))
    );
  }
}

module.exports = EthTxBuilder;
