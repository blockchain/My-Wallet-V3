const { toBigNumber, fromWei } = require('../helpers');

class EthWalletTx {
  constructor (obj) {
    this._blockNumber = obj.blockNumber;
    this._timeStamp = obj.timeStamp || (Date.now() / 1000);
    this._hash = obj.hash;
    this._from = obj.from;
    this._to = obj.to;
    this._value = obj.value;
    this._gas = obj.gas;
    this._gasPrice = obj.gasPrice;
    this._gasUsed = obj.gasUsed;
    this._confirmations = 0;
    this._note = null;

    this._amount = null;
    if (this._value) {
      this._amount = fromWei(this._value, 'ether');
    }

    this._fee = null;
    if (this._gasPrice && (this._gasUsed || this._gas)) {
      let feeWei = toBigNumber(this._gasPrice).mul(this._gasUsed || this._gas);
      this._fee = fromWei(feeWei, 'ether').toString();
    }
  }

  get amount () {
    return this._amount;
  }

  get fee () {
    return this._fee;
  }

  get to () {
    return this._to;
  }

  get from () {
    return this._from;
  }

  get hash () {
    return this._hash;
  }

  get time () {
    return this._timeStamp;
  }

  get confirmations () {
    return this._confirmations;
  }

  get note () {
    return this._note;
  }

  getTxType (account) {
    if (this.isToAccount(account)) {
      return 'received';
    } else if (this.isFromAccount(account)) {
      return 'sent';
    }
    return null;
  }

  isToAccount (account) {
    return this._to === account.address;
  }

  isFromAccount (account) {
    return this._from === account.address;
  }

  update (ethWallet) {
    this._confirmations = Math.max(ethWallet.latestBlock - this._blockNumber + 1, 0);
    this._note = ethWallet.getTxNote(this.hash);
  }

  static txTimeSort (txA, txB) {
    return txB.time - txA.time;
  }

  static fromJSON (json) {
    return new EthWalletTx(json);
  }
}

module.exports = EthWalletTx;
