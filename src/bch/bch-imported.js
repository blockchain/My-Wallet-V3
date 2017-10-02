/* eslint-disable semi */
const BchSpendable = require('./bch-spendable')
const { compose, reduce, filter, add } = require('ramda')

const sumNonNull = compose(reduce(add, 0), filter(x => x != null))

class BchImported extends BchSpendable {
  get addresses () {
    return this._wallet.addresses
  }

  get label () {
    return 'Imported Addresses'
  }

  get balance () {
    let balances = this.addresses.map(a => super.getAddressBalance(a))
    return sumNonNull(balances)
  }

  getAvailableBalance (feePerByte) {
    return super.getAvailableBalance(this.addresses, feePerByte)
  }

  createPayment () {
    return super.createPayment().from(this.addresses)
  }
}

module.exports = BchImported
