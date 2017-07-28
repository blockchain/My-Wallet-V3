const keythereum = require('keythereum');
const EthTxBuilder = require('./eth-tx-builder');
const EthWalletTx = require('./eth-wallet-tx');
const Web3 = require('web3');
const web3 = new Web3();
const API = require('../api');

class EthAccount {
  constructor (obj) {
    this._priv = obj.priv && Buffer.from(obj.priv, 'hex');
    this._addr = obj.priv ? keythereum.privateKeyToAddress(this._priv) : obj.addr;
    this.label = obj.label;
    this.archived = obj.archived || false;
    this._wei = null;
    this._balance = null;
    this._approximateBalance = null;
    this._nonce = null;
    this._txs = [];
  }

  get address () {
    return this._addr;
  }

  get privateKey () {
    return this._priv;
  }

  get wei () {
    return this._wei;
  }

  get balance () {
    return this._balance;
  }

  get txs () {
    return this._txs;
  }

  get nonce () {
    return this._nonce;
  }

  getApproximateBalance () {
    return this._approximateBalance;
  }

  createPayment () {
    return new EthTxBuilder(this);
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
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(data => this.setData(data));
  }

  fetchTransactions () {
    return fetch(`${API.API_ROOT_URL}eth/account/${this.address}`)
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(data => this.setTransactions(data));
  }

  fetchTransaction (hash) {
    return fetch(`${API.API_ROOT_URL}eth/tx/${hash}`)
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(EthWalletTx.fromJSON)
      .then(tx => {
        let txExists = this._txs.find(({ hash }) => hash === tx.hash) != null;
        if (!txExists) this._txs.unshift(tx);
      });
  }

  setData ({ balance, nonce } = {}) {
    this._wei = web3.toBigNumber(balance);
    this._balance = web3.fromWei(this.wei, 'ether').toString();
    this._approximateBalance = web3.fromWei(this.wei).round(8).toString();
    this._nonce = nonce;
    return { balance, nonce };
  }

  setTransactions ({ txns = [] }) {
    this._txs = txns.map(EthWalletTx.fromJSON).sort(EthWalletTx.txTimeSort);
    return txns;
  }

  updateTxs (ethWallet) {
    this.txs.forEach(tx => tx.update(ethWallet));
  }

  toJSON () {
    return {
      label: this.label,
      archived: this.archived,
      addr: this.address
    };
  }

  isCorrectPrivateKey (privateKey) {
    return keythereum.privateKeyToAddress(privateKey) === this.address;
  }

  static defaultLabel (accountIdx) {
    let label = 'My Ether Wallet';
    return accountIdx > 0 ? `${label} ${accountIdx + 1}` : label;
  }

  static fromWallet (wallet) {
    let addr = keythereum.privateKeyToAddress(wallet.getPrivateKey());
    let account = new EthAccount({ addr });
    account.setData({ balance: '0', nonce: 0 });
    return account;
  }
}

module.exports = EthAccount;
