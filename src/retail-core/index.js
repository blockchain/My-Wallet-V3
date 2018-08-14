
/* eslint-disable semi */
const METADATA_TYPE_RETAIL_CORE = 10;

class RetailCore {
  constructor (wallet, metadata) {
    this._wallet = wallet
    this._metadata = metadata
    this._userId = null
    this._lifetimeToken = null
  }

  get userId () {
    return this._userId
  }

  get lifetimeToken () {
    return this._lifetimeToken
  }

  updateUserCredentials (credentials) {
    this._userId = credentials.userId;
    this._lifetimeToken = credentials.lifetimeToken;
    this.sync()
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      this._userId = data ? data.user_id : null;
      this._lifetimeToken = data ? data.lifetime_token : null;
    });
  }

  sync () {
    return this._metadata.update(this);
  }

  toJSON () {
    return {
      user_id: this.userId,
      lifetime_token: this.lifetimeToken
    }
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_RETAIL_CORE)
    return new RetailCore(wallet, metadata)
  }
}

module.exports = RetailCore

