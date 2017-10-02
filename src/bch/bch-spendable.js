/* eslint-disable semi */
const Api = require('./api')
const { selectAll } = require('./coin-selection')

class BchSpendable {
  constructor (bchWallet, wallet, btcAccount) {
    this._bchWallet = bchWallet
    this._wallet = wallet
  }

  getAddressBalance (source) {
    return this._bchWallet.getAddressBalance(source)
  }

  getAvailableBalance (source, feePerByte) {
    return Api.getUnspents(this._wallet, source).then(coins => {
      let { fee, outputs } = selectAll(feePerByte, coins, null)
      return { fee, amount: outputs[0].value }
    });
  }

  createPayment () {
    return this._bchWallet.createPayment()
  }
}

module.exports = BchSpendable
