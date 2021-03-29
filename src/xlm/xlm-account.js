const H = require('../helpers')

class XlmAccount {
  constructor (accountData, xlmWallet) {
    this._sync = () => xlmWallet.sync()
    this._publicKey = accountData.publicKey;
    this._label = accountData.label;
    this._archived = accountData.archived === undefined ? false : accountData.archived;
  }


  get publicKey () {
    return this._publicKey;
  }

  get label () {
    return this._label;
  }

  set label (value) {
    if (!H.isValidLabel(value)) {
      throw new Error('XlmAccount.label must be an alphanumeric string');
    }
    this._label = value
    this._sync()
  }

  get archived () {
    return this._archived;
  }

  toJSON () {
    return {
      publicKey: this.publicKey,
      label: this.label,
      archived: this.archived
    }
  }
}

module.exports = XlmAccount;
