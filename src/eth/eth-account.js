const ethUtil = require('ethereumjs-util');
const EthWalletTx = require('./eth-wallet-tx');
const API = require('../api');
const { isValidLabel, toBigNumber, toWei, fromWei } = require('../helpers');

class EthAccount {
  constructor (obj, ethWallet) {
    this._priv = obj.priv && Buffer.from(obj.priv, 'hex');
    this._addr = ethUtil.toChecksumAddress(obj.priv ? EthAccount.privateKeyToAddress(this._priv) : obj.addr);
    this._label = obj.label;
    this.archived = obj.archived || false;
    this._correct = Boolean(obj.correct);
    this._txs = [];
    this._sync = () => ethWallet.sync()
  }

  get label () {
    return this._label;
  }

  set label (value) {
    if (!isValidLabel(value)) {
      throw new Error('EthAccount.label must be an alphanumeric string');
    }
    this._label = value
    this._sync()
  }

  get address () {
    return this._addr;
  }

  get receiveAddress () {
    return this.address;
  }

  get privateKey () {
    return this._priv;
  }

  get isCorrect () {
    return this._correct;
  }

  get txs () {
    return this._txs;
  }

  get coinCode () {
    return 'eth';
  }

  markAsCorrect () {
    this._correct = true;
  }

  fetchTransaction (hash) {
    return fetch(`${API.API_ROOT_URL}eth/tx/${hash}`)
      .then(r => r.status === 200 ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(tx => this.appendTransaction(tx));
  }

  appendTransaction (txJson) {
    let tx = EthWalletTx.fromJSON(txJson);
    let txExists = this._txs.find(({ hash }) => hash === tx.hash) != null;
    if (!txExists) this._txs.unshift(tx);
    return tx;
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

  isCorrectAddress (address) {
    return address.toLowerCase() === this.address.toLowerCase();
  }

  isCorrectPrivateKey (privateKey) {
    return EthAccount.privateKeyToAddress(privateKey) === this.address;
  }

  static privateKeyToAddress (privateKey) {
    return ethUtil.toChecksumAddress(ethUtil.privateToAddress(privateKey).toString('hex'));
  }

  static defaultLabel (accountIdx) {
    let label = 'Private Key Wallet';
    return accountIdx > 0 ? `${label} ${accountIdx + 1}` : label;
  }

  static fromWallet (wallet, ethWallet) {
    let addr = EthAccount.privateKeyToAddress(wallet.getPrivateKey());
    let account = new EthAccount({ addr }, ethWallet);
    return account;
  }
}

module.exports = EthAccount;
