
/* eslint-disable semi */
const METADATA_TYPE_RETAIL_CORE = 10;

class RetailCore {
  constructor (wallet, metadata) {
    this._wallet = wallet
    this._metadata = metadata
    this._userId = null
    this._token = null
  }

  get userId () {
    return this._userId
  }

  get token () {
    return this._token
  }

  updateUserCredentials (credentials) {
    this._userId = credentials.userId;
    this._token = credentials.token;
    this.sync()
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      this._userId = data ? data.user_id : null;
      this._token = data ? data.token : null;
    });
  }

  sync () {
    return this._metadata.update(this);
  }

  toJSON () {
    return {
      userId: this.userId,
      token: this.token
    }
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_RETAIL_CORE)
    return new RetailCore(wallet, metadata)
  }
}

module.exports = RetailCore

