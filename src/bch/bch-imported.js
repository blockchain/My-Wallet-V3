/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')
const BchShiftPayment = require('../shift/bch-payment')
const { compose, reduce, filter, add } = require('ramda')

const sumNonNull = compose(reduce(add, 0), filter(x => x != null))

class BchImported extends BchSpendable {
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

  createShiftPayment (wallet) {
    return BchShiftPayment.fromWallet(wallet, this)
  }
}

module.exports = BchImported
