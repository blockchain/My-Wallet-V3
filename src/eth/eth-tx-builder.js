const EthereumTx = require('ethereumjs-tx');
const util = require('ethereumjs-util');
const API = require('../api');
const { toWei, fromWei, toBigNumber, bnMax, bnToBuffer } = require('../helpers');

const MAINNET = 1;

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
    this._tx.value = bnToBuffer(toWei(toBigNumber(amount), 'ether'));
    this.update();
    return this;
  }

  setGasPrice (gasPrice) {
    this._tx.gasPrice = bnToBuffer(toWei(toBigNumber(gasPrice), 'gwei'));
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
    let amount = bnMax(balance.sub(this._tx.getUpfrontCost()), 0);
    this.setValue(fromWei(amount, 'ether'));
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
    this._fee = parseFloat(fromWei(feeBN, 'ether'));
    this._amount = parseFloat(fromWei(amountBN, 'ether'));
    this._available = parseFloat(fromWei(availableBN, 'ether'));
  }

  static get GAS_PRICE () {
    return 21; // gwei
  }

  static get GAS_LIMIT () {
    return 21000;
  }

  static fetchFees () {
    return fetch(`${API.API_ROOT_URL}eth/fees`).then(r =>
      r.status === 200 ? r.json() : Promise.reject()
    ).catch(() => ({
      gasLimit: EthTxBuilder.GAS_LIMIT,
      regular: EthTxBuilder.GAS_PRICE,
      priority: EthTxBuilder.GAS_PRICE,
      limits: {}
    }));
  }

  static pushTx (rawTx) {
    return fetch(`${API.API_ROOT_URL}eth/pushtx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawTx })
    }).then(r =>
      r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e))
    );
  }
}

module.exports = EthTxBuilder;
