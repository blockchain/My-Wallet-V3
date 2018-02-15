/* eslint-disable semi */
const { compose, clone, assoc, is, all } = require('ramda')
const Coin = require('../coin')
const BchApi = require('./bch-api')
const { isBitcoinAddress, isPositiveInteger } = require('../helpers')
const { selectAll, descentDraw } = require('../coin-selection')
const signer = require('../signer')

const isValidFrom = (from) => (
  is(Number, from) ||
  (is(Array, from) && all(isBitcoinAddress, from))
)

class PaymentError extends Error {
  constructor (message, state) {
    super(message)
    this.recover = () => Promise.resolve(state)
  }
}

class BchPayment {
  constructor (wallet) {
    this._wallet = wallet
    this._payment = BchPayment.defaultStateP()
  }

  map (f) {
    this._payment = this._payment.then(f)
    return this
  }

  handleError (f) {
    this._payment = this._payment.catch(paymentError => {
      f(paymentError)
      return is(Function, paymentError.recover)
        ? paymentError.recover()
        : BchPayment.defaultStateP()
    })
    return this
  }

  sideEffect (f) {
    this._payment.then(clone).then(f)
    return this
  }

  from (from, change) {
    if (!isValidFrom(from)) {
      throw new Error('must provide a valid payment source')
    }
    if (!isBitcoinAddress(change)) {
      throw new Error('must provide a valid change address')
    }
    return this.map(payment =>
      BchApi.getUnspents(this._wallet, from).then(coins => {
        let setData = compose(assoc('coins', coins), assoc('change', change))
        return setData(payment)
      })
    )
  }

  to (to) {
    if (!isBitcoinAddress(to)) {
      throw new Error('must provide a valid destination address')
    }
    return this.clean().map(assoc('to', to))
  }

  amount (amount) {
    if (!isPositiveInteger(amount)) {
      throw new Error('must provide a valid amount')
    }
    return this.clean().map(assoc('amount', amount))
  }

  feePerByte (feePerByte) {
    if (!isPositiveInteger(feePerByte)) {
      throw new Error('must provide a valid fee-per-byte value')
    }
    return this.clean().map(assoc('feePerByte', feePerByte))
  }

  clean () {
    return this.map(compose(
      assoc('selection', null),
      assoc('hash', null),
      assoc('rawTx', null)
    ))
  }

  build () {
    return this.map(payment => {
      if (payment.to == null) {
        throw new PaymentError('must set a destination address', payment)
      }
      if (payment.amount == null) {
        throw new PaymentError('must set an amount', payment)
      }
      if (payment.feePerByte == null) {
        throw new PaymentError('must set a fee-per-byte value', payment)
      }
      let targets = [new Coin({ address: payment.to, value: payment.amount })]
      let selection = descentDraw(targets, payment.feePerByte, payment.coins, payment.change)
      return assoc('selection', selection, payment)
    })
  }

  buildSweep () {
    return this.map(payment => {
      if (payment.to == null) {
        throw new PaymentError('must set a destination address', payment)
      }
      if (payment.feePerByte == null) {
        throw new PaymentError('must set a fee-per-byte value', payment)
      }
      let selection = selectAll(payment.feePerByte, payment.coins, payment.to)
      return assoc('selection', selection, payment)
    })
  }

  sign (secPass) {
    return this.map(payment => {
      if (payment.selection == null) {
        throw new PaymentError('cannot sign an unbuilt transaction', payment)
      }
      let tx = signer.signBitcoinCash(secPass, this._wallet, payment.selection)
      let setData = compose(assoc('hash', tx.getId()), assoc('rawTx', tx.toHex()))
      return setData(payment)
    })
  }

  publish () {
    /* return Promise, not BchPayment instance */
    return this._payment.then(payment => {
      if (payment.rawTx == null) {
        throw new PaymentError('cannot publish an unsigned transaction', payment)
      }
      return BchApi.pushTx(payment.rawTx)
        .then(() => ({ hash: payment.hash }))
    })
  }

  static defaultStateP () {
    return Promise.resolve(BchPayment.defaultState())
  }

  static defaultState () {
    return {
      coins: [],
      to: null,
      amount: null,
      feePerByte: null,
      selection: null,
      hash: null,
      rawTx: null
    }
  }
}

module.exports = BchPayment
