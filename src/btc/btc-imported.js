/* eslint-disable semi */
const BtcSpendable = require('./btc-spendable')
// const BtcShiftPayment = require('../shift/bch-payment')
const { compose, reduce, filter, add } = require('ramda')

const sumNonNull = compose(reduce(add, 0), filter(x => x != null))

class BtcImported extends BtcSpendable {
  get addresses () {
    return this._wallet.spendableActiveAddresses
  }

  get label () {
    return 'Imported Addresses'
  }

  get balance () {
    let balances = this.addresses.map(a => super.getAddressBalance(a))
    return balances.every(x => x == null) ? null : sumNonNull(balances)
  }

  get coinCode () {
    return 'bch'
  }

  getAvailableBalance (feePerByte) {
    return super.getAvailableBalance(this.addresses, feePerByte)
  }

  createPayment () {
    return super.createPayment().from(this.addresses, this.addresses[0])
  }

  // createShiftPayment (wallet) {
  //   return BtcShiftPayment.fromWallet(wallet, this)
  // }
}

module.exports = BtcImported
