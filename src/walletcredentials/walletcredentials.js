class WalletCredentials {
  constructor (guid, password, sharedKey) {
    if(!guid || !password || !sharedKey) {
      throw new Error('No credentials in metadata')
    }
    this._guid = guid
    this._password = password
    this._sharedKey = sharedKey
  }

  get guid () {
    return this._guid;
  }

  get password () {
    return this._password;
  }

  get sharedKey () {
    return this._sharedKey;
  }

  toJSON () {
    return {
      guid: this.guid,
      password: this.password,
      sharedKey: this.sharedKey
    }
  }
}

module.exports = WalletCredentials;
