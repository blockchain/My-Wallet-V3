/* eslint-disable semi */
const BtcApi = require('./btc-api')
const { selectAll } = require('../coin-selection')

class BtcSpendable {
  constructor (btcWallet, wallet) {
    this._btcWallet = btcWallet
    this._wallet = wallet
  }

  getAddressBalance (source) {
    return this._btcWallet.getAddressBalance(source)
  }

  getAvailableBalance (source, feePerByte) {
    return BtcApi.getUnspents(this._wallet, source).then(coins => {
      let { fee, outputs } = selectAll(feePerByte, coins, null)
      return { fee: feePerByte, sweepFee: Math.ceil(fee), amount: Math.floor(outputs[0].value) }
    });
  }

  createPayment () {
    return this._btcWallet.createPayment()
  }
}

module.exports = BtcSpendable
