const keythereum = require('keythereum');
const EthTx = require('./eth-tx');
const EthWalletTx = require('./eth-wallet-tx');
const Web3 = require('web3');
const web3 = new Web3();

const GAS_LIMIT = 21000;

class EthAccount {
  constructor (obj) {
    this._priv = Buffer.from(obj.priv, 'hex');
    this.label = obj.label;
    this.archived = obj.archived || false;
    this._balance = null;
    this._nonce = null;
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

  get txs () {
    return this._txs;
  }

  get nonce () {
    return this._nonce;
  }

  spend (to, amount, fee) {
    let rawtx = new EthTx()
      .setTo(to)
      .setGasLimit(GAS_LIMIT)
      .setGasPrice(parseInt(web3.toWei(fee, 'gwei')))
      .setValue(parseInt(web3.toWei(amount, 'ether')))
      .setNonce(this.nonce)
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
      .setNonce(this.nonce)
      .setData(null)
      .sign(this)
      .toRaw();

    return EthAccount.pushtx(rawtx);
  }

  sweepFrom (privateKey, fee) {
    let account = EthAccount.fromPriv(privateKey);
    return account.fetchBalance().sweep(this.address, fee);
  }

  fetchBalance () {
    return fetch(`/eth/account/${this.address}`)
      .then(res => res.json())
      .then((data) => this.setData(
        data.account === this.address ? data : { balance: 0, nonce: 0 }
      ));
  }

  setData ({ balance, nonce, txns = [] } = {}) {
    this._balance = balance;
    this._nonce = nonce;
    this._txs = txns.map(EthWalletTx.fromJSON);
  }

  toJSON () {
    return {
      label: this.label,
      archived: this.archived,
      priv: this.privateKey.toString('hex')
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

  static defaultLabel (accountIdx) {
    let label = 'My Ethereum Wallet';
    return accountIdx > 0 ? `${label} ${accountIdx + 1}` : label;
  }

  static fromPriv (privateKey) {
    return new EthAccount({ priv: Buffer.from(privateKey, 'hex') });
  }

  static fromWallet (wallet) {
    let account = new EthAccount({ priv: wallet.getPrivateKey() });
    account.setData({ balance: 0, nonce: 0 });
    return account;
  }
}

module.exports = EthAccount;
