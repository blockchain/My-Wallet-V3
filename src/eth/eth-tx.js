const EthereumTx = require('ethereumjs-tx');
const util = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3();

class EthTx {
  constructor () {
    this._tx = new EthereumTx(null, 1);
  }

  setNonce (nonce) {
    this._tx.nonce = nonce;
    return this;
  }

  setGasPrice (gasPrice) {
    this._tx.gasPrice = gasPrice;
    return this;
  }

  setGasLimit (gasLimit) {
    this._tx.gasLimit = gasLimit;
    return this;
  }

  setTo (to) {
    if (!util.isValidAddress(to)) {
      throw new Error('Invalid address');
    }
    this._tx.to = to;
    return this;
  }

  setValue (value) {
    this._tx.value = value;
    return this;
  }

  setData (data) {
    this._tx.data = data;
    return this;
  }

  sweep (key) {
    this.setValue(0);
    let balance = web3.toBigNumber(key.wei);
    let amount = balance.sub(this._tx.getUpfrontCost());
    this.setValue(amount.toNumber());
    return this;
  }

  sign (key) {
    this._tx.sign(key.privateKey);
    return this;
  }

  serialize () {
    return this._tx.serialize();
  }

  toRaw () {
    return '0x' + this.serialize().toString('hex');
  }
}

module.exports = EthTx;
