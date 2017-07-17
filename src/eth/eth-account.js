const keythereum = require('keythereum');
const EthTx = require('./eth-tx');
const EthWalletTx = require('./eth-wallet-tx');
const Web3 = require('web3');
const web3 = new Web3();
const API = require('../api');

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

  createPayment () {
    return new EthTx(this);
  }

  spend (to, amount, fee) {
    return this.createPayment()
      .setTo(to)
      .setValue(amount)
      .setGasPrice(fee)
      .setGasLimit(EthTx.GAS_LIMIT)
      .sign()
      .publish();
  }

  sweep (to, fee) {
    return this.createPayment()
      .setTo(to)
      .setGasPrice(fee)
      .setGasLimit(EthTx.GAS_LIMIT)
      .setSweep()
      .sign()
      .publish();
  }

  sweepFrom (privateKey, fee) {
    let account = EthAccount.fromPriv(privateKey);
    return account.fetchBalance().sweep(this.address, fee);
  }

  fetchHistory () {
    return Promise.all([
      this.fetchBalance(),
      this.fetchTransactions()
    ]).then(([data, txs]) => (
      Object.assign(data, { txs })
    ));
  }

  fetchBalance () {
    return fetch(`${API.API_ROOT_URL}eth/account/${this.address}/balance`)
      .then(res => res.json())
      .then(data => this.setData(data));
  }

  fetchTransactions () {
    return fetch(`${API.API_ROOT_URL}eth/account/${this.address}`)
      .then(res => res.json())
      .then(data => this.setTransactions(data));
  }

  setData ({ balance, nonce } = {}) {
    this._balance = balance;
    this._nonce = nonce;
    return { balance, nonce };
  }

  setTransactions ({ txns = [] }) {
    this._txs = txns.map(EthWalletTx.fromJSON).sort(EthWalletTx.txTimeSort);
    return txns;
  }

  updateConfirmations (latestBlock) {
    this.txs.forEach(tx => tx.updateConfirmations(latestBlock));
  }

  toJSON () {
    return {
      label: this.label,
      archived: this.archived,
      priv: this.privateKey.toString('hex')
    };
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
