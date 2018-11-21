class XlmAccount {
  constructor (accountData) {
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
