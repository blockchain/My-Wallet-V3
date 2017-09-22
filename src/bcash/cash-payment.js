/* eslint-disable semi */
const Bitcoin = require('bitcoincashjs-lib');
const { compose, map, reduce, add } = require('ramda')
const Api = require('../api')
const Coin = require('./coin')
const { isBitcoinAddress, isPositiveInteger } = require('../helpers')
const { selectAll, descentDraw } = require('./coin-selection')
const { signSelection } = require('./signer')

const sumCoinValues = compose(reduce(add, 0), map(c => c.value))

class CashPayment {
  constructor (wallet, availableCoins) {
    this._wallet = wallet
    this._coins = availableCoins
    this._to = null
    this._amount = null
    this._feePerByte = null
    this._selection = null
    this._rawTx = null
  }

  get fee () {
    return this._selection && this._selection.fee
  }

  get sweepFee () {
    return this.getSweepSelection().fee
  }

  get maxAvailable () {
    return sumCoinValues(this.getSweepSelection().outputs)
  }

  setTo (to) {
    if (!isBitcoinAddress(to)) {
      throw new Error('must provide a valid destination address')
    }
    this._to = to
    return this.clean()
  }

  setAmount (amount) {
    if (!isPositiveInteger(amount)) {
      throw new Error('must provide a valid amount')
    }
    this._amount = amount
    return this.clean()
  }

  setFeePerByte (feePerByte) {
    if (!isPositiveInteger(feePerByte)) {
      throw new Error('must provide a valid fee-per-byte value')
    }
    this._feePerByte = feePerByte
    return this.clean()
  }

  clean () {
    this._selection = null
    this._rawTx = null
    return this
  }

  build () {
    if (this._to == null) {
      throw new Error('must set a destination address')
    }
    if (this._amount == null) {
      throw new Error('must set a amount')
    }
    if (this._feePerByte == null) {
      throw new Error('must set a fee-per-byte value')
    }
    let targets = [new Coin({ address: this._to, value: this._amount })]
    this._selection = descentDraw(targets, this._feePerByte, this._coins, null /* change */)
    return this
  }

  buildSweep () {
    if (this._to == null) {
      throw new Error('must set a destination address')
    }
    this._selection = this.getSweepSelection()
    return this
  }

  getSweepSelection () {
    if (this._feePerByte == null) {
      throw new Error('must set a fee-per-byte value')
    }
    return selectAll(this._feePerByte, this._coins, this._to)
  }

  sign (secPass) {
    if (this._selection == null) {
      throw new Error('cannot sign an unbuilt transaction')
    }
    let network = Bitcoin.networks.bitcoin
    this._rawTx = signSelection(network, secPass, this._wallet, this._selection)
    return this
  }

  publish () {
    if (this._rawTx == null) {
      throw new Error('cannot publish an unsigned transaction')
    }
    return Api.pushTx(this._rawTx)
  }
}

module.exports = CashPayment
