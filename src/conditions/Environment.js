/* eslint-disable semi */
const { is, assoc } = require('ramda')

class Environment {
  constructor (value) {
    this._env = value
  }

  set (key, getter) {
    if (!is(Function, getter)) {
      throw new Error('Environment getter must be a function')
    }
    let value = assoc(key, getter, this._env)
    return new Environment(value)
  }

  has (key) {
    return this._env[key] != null
  }

  get (key) {
    if (!this.has(key)) {
      throw new Error(`Environment does not contain key '${key}'`)
    }
    return this._env[key]()
  }

  static empty () {
    return new Environment({})
  }

  static get GUID () {
    return 'guid'
  }

  static get WALLET_OPTIONS () {
    return 'wallet-options'
  }

  static get ACCOUNT_INFO () {
    return 'account-info'
  }
}

module.exports = Environment
