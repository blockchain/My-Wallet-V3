const EthereumTx = require('ethereumjs-tx');
const util = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3();
const API = require('../api');

const GAS_LIMIT = 21000;

class EthTx {
  constructor (account) {
    this._account = account;
    this._tx = new EthereumTx(null, 1);
    this._tx.nonce = this._account.nonce;
    this._tx.gasLimit = GAS_LIMIT;
  }

  get fee () {
  }

  get amount () {
  }

  get available () {
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
    this.setValue(amount.toNumber());
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
