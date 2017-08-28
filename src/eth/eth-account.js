const ethUtil = require('ethereumjs-util');
const EthTxBuilder = require('./eth-tx-builder');
const EthWalletTx = require('./eth-wallet-tx');
const API = require('../api');
const { toBigNumber, toWei, fromWei } = require('../helpers');

class EthAccount {
  constructor (obj) {
    this._priv = obj.priv && Buffer.from(obj.priv, 'hex');
    this._addr = ethUtil.toChecksumAddress(obj.priv ? EthAccount.privateKeyToAddress(this._priv) : obj.addr);
    this.label = obj.label;
    this.archived = obj.archived || false;
    this._correct = Boolean(obj.correct);
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

  get isCorrect () {
    return this._correct;
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

  markAsCorrect () {
    this._correct = true;
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
    this._wei = toBigNumber(balance);
    this._balance = fromWei(this.wei, 'ether').toString();
    this._approximateBalance = fromWei(this.wei, 'ether').round(8).toString();
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
      correct: this.isCorrect,
      addr: this.address
    };
  }

  isCorrectPrivateKey (privateKey) {
    return EthAccount.privateKeyToAddress(privateKey) === this.address;
  }

  getAvailableBalance (gasLimit = EthTxBuilder.GAS_LIMIT, gasPrice = EthTxBuilder.GAS_PRICE) {
    return new Promise(resolve => {
      let fee = toBigNumber(gasLimit).mul(toWei(gasPrice, 'gwei'));
      let available = Math.max(parseFloat(this.wei.sub(fee)), 0);
      let amount = parseFloat(fromWei(available, 'ether'));
      resolve({ amount, fee: gasPrice });
    });
  }

  static privateKeyToAddress (privateKey) {
    return ethUtil.toChecksumAddress(ethUtil.privateToAddress(privateKey).toString('hex'));
  }

  static defaultLabel (accountIdx) {
    let label = 'My Ether Wallet';
    return accountIdx > 0 ? `${label} ${accountIdx + 1}` : label;
  }

  static fromWallet (wallet) {
    let addr = EthAccount.privateKeyToAddress(wallet.getPrivateKey());
    let account = new EthAccount({ addr });
    account.setData({ balance: '0', nonce: 0 });
    return account;
  }
}

module.exports = EthAccount;
