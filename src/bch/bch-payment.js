/* eslint-disable semi */
const { compose, clone, assoc, is } = require('ramda')
const Coin = require('./coin')
const CashApi = require('./api')
const { isBitcoinAddress, isPositiveInteger } = require('../helpers')
const { selectAll, descentDraw } = require('./coin-selection')
const { sign } = require('./signer')

class PaymentError extends Error {
  constructor (message, state) {
    super(message)
    this._state = state
  }

  recover () {
    return Promise.resolve(this._state)
  }
}

class BchPayment {
  constructor (wallet) {
    this._wallet = wallet
    this._payment = Promise.resolve(BchPayment.defaultState())
  }

  then (f) {
    this._payment = this._payment.then(f)
    return this
  }

  catch (f) {
    // this needs to be thought through more
    this._payment.catch(paymentError => {
      this._payment = is(Function, paymentError.recover)
        ? paymentError.recover()
        : Promise.resolve(BchPayment.defaultState())
      f(paymentError)
    })
    return this
  }

  sideEffect (f) {
    this._payment.then(clone).then(f)
    return this
  }

  from (from) {
    return this.then(payment =>
      Promise.all([
        CashApi.getUnspents(this._wallet, from),
        CashApi.getChangeOutput(this._wallet, from)
      ]).then(([coins, change]) => compose(
        assoc('coins', coins),
        assoc('change', change)
      )(payment))
    )
  }

  to (to) {
    if (!isBitcoinAddress(to)) {
      throw new Error('must provide a valid destination address')
    }
    return this.clean().then(assoc('to', to))
  }

  amount (amount) {
    if (!isPositiveInteger(amount)) {
      throw new Error('must provide a valid amount')
    }
    return this.clean().then(assoc('amount', amount))
  }

  feePerByte (feePerByte) {
    if (!isPositiveInteger(feePerByte)) {
      throw new Error('must provide a valid fee-per-byte value')
    }
    return this.clean().then(assoc('feePerByte', feePerByte))
  }

  clean () {
    return this.then(compose(
      assoc('selection', null),
      assoc('rawTx', null)
    ))
  }

  build () {
    return this.then(payment => {
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
    return this.then(payment => {
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
    return this.then(payment => {
      if (payment.selection == null) {
        throw new PaymentError('cannot sign an unbuilt transaction', payment)
      }
      let rawTx = sign(secPass, this._wallet, payment.selection)
      return assoc('rawTx', rawTx, payment)
    })
  }

  publish () {
    /* return Promise, not BchPayment instance */
    return this._payment.then(payment => {
      if (payment.rawTx == null) {
        throw new PaymentError('cannot publish an unsigned transaction', payment)
      }
      return CashApi.pushTx(payment.rawTx)
    })
  }

  static defaultState () {
    return {
      coins: [],
      to: null,
      amount: null,
      feePerByte: null,
      selection: null,
      rawTx: null
    }
  }
}

module.exports = BchPayment
