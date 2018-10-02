/* eslint-disable semi */
const METADATA_TYPE_LOCKBOX = 9;

class Lockbox {
  constructor (wallet, metadata) {
    this._wallet = wallet
    this._metadata = metadata
    this._devices = []
  }

  get devices () {
    return this._devices
  }

  fetch () {
    return this._metadata.fetch().then((data) => {
      this._devices = data ? data.devices : [];
    });
  }

  static fromBlockchainWallet (wallet) {
    let metadata = wallet.metadata(METADATA_TYPE_LOCKBOX)
    return new Lockbox(wallet, metadata)
  }
}

module.exports = Lockbox
