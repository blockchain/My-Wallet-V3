const XlmAccount = require('./xlm-account');

const METADATA_TYPE_XLM = 11;

class StellarLumensWallet {
  constructor(wallet, metadata) {
    this._wallet = wallet;
    this._metadata = metadata;
    this._defaultAccountIdx = 0;
    this._accounts = [];
  }

  get defaultAccountIdx() {
      return this._defaultAccountIdx;
  }

  get defaultAccount() {
      return this._accounts[this._defaultAccountIdx];
  }

  get accounts() {
    return this._accounts;
  }

  saveAccount(publicKey, label, success, error) {
    const xlmAccount = new XlmAccount({
      publicKey,
      label
    });
    let newArray = [...this._accounts];
    newArray.push(xlmAccount);
    this._accounts = newArray;
    this._metadata.update(this).then(success).catch(error);
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      this._defaultAccountIdx = data ? data.default_account_idx : 0;
      let accountsData = data ? data.accounts : [];
      this._accounts = accountsData.map(account => {
        return new XlmAccount(account);
      });
    });
  }

  toJSON () {
    return {
      default_account_idx: this.defaultAccountIdx,
      accounts: this.accounts
    }
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_XLM);
    return new StellarLumensWallet(wallet, metadata);
  }
}

module.exports = StellarLumensWallet;
