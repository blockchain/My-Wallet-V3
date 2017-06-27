const keythereum = require('keythereum');
const EthTx = require('./eth-tx');
const Web3 = require('web3');
const web3 = new Web3();

const GAS_LIMIT = 21000;

class EthAccount {
  constructor (obj) {
    this._priv = Buffer.from(obj.priv, 'hex');
    this.label = obj.label;
    this.archived = obj.archived;
    this._balance = null;
    this._txCount = null;
  }

  get address () {
    return keythereum.privateKeyToAddress(this.privateKey);
  }

  get privateKey () {
    return this._priv;
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

    return EthAccount.pushtx(rawtx);
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

    return EthAccount.pushtx(rawtx);
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
      label: this.label,
      archived: this.archived,
      priv: this.priv.toString('hex')
    };
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

  static fromWallet (wallet) {
    let account = new EthAccount({ priv: wallet.getPrivateKey() });
    account.setData({ balance: 0, txCount: 0 });
    return account;
  }
}

module.exports = EthAccount;
