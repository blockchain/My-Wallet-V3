const EthHd = require('ethereumjs-wallet/hdkey');

class EthAccount {
  constructor (obj) {
    this._xpub = obj.xpub;
    this._xpriv = obj.xpriv;

    this.label = obj.label;
    this._balance = null;
    this._receiveIndex = null;
    this._changeIndex = null;

    let node = EthHd.fromExtendedKey(this._xpriv);
    this._receiveChain = node.deriveChild(0);
    this._changeChain = node.deriveChild(1);
  }

  get xpub () {
    return this._xpub;
  }

  get balance () {
    return this._balance;
  }

  get receiveAddress () {
    let i = this._receiveIndex;
    return EthAccount.nodeToAddress(this._receiveChain.deriveChild(i));
  }

  setData (data) {
    this._balance = data.balance;
    this._receiveIndex = data.receiveIndex;
    this._changeIndex = data.changeIndex;
  }

  toJSON () {
    return {
      label: this.label,
      xpub: this._xpub,
      xpriv: this._xpriv
    };
  }

  static nodeToAddress (node) {
    return '0x' + node.getWallet().getAddress().toString('hex');
  }

  static fromNode (node) {
    let account = new EthAccount({
      xpub: node.publicExtendedKey(),
      xpriv: node.privateExtendedKey()
    });
    account.setData({
      balance: 0,
      receiveIndex: 0,
      changeIndex: 0
    });
    return account;
  }
}

module.exports = EthAccount;
