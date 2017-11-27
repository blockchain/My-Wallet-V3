/* eslint-disable semi */
const { add, reduce, map, compose } = require('ramda')
const BchApi = require('../../src/bch/bch-api')
const BchPayment = require('../../src/bch/bch-payment')
const Coin = require('../../src/coin')
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock')

const addr = '19kqHHBoYbyY2bAr1SN2GuGcdSZ6fM2Qqz'

const sumCoins = compose(reduce(add, 0), map(c => c.value))

describe('BchPayment', () => {
  let wallet
  let payment

  beforeEach(() => {
    wallet = new BlockchainWalletMock()
    payment = new BchPayment(wallet)

    let mocked = [Coin.of(10000), Coin.of(15000), Coin.of(20000)]
    spyOn(BchApi, 'getUnspents').and.returnValue(Promise.resolve(mocked))
  })

  describe('handleError()', () => {
    it('should allow handling errors with automatic recovery', (done) => {
      let handle = jasmine.createSpy('handleError')
      payment
        .from(0, addr).to(addr).amount(10000)
        .build() // forgot feePerByte()
        .handleError(handle)
        .feePerByte(10)
        .build() // succeeds
        .handleError(handle)
        .sideEffect(p => {
          expect(p.selection).not.toEqual(null)
          expect(handle).toHaveBeenCalledTimes(1)
          done()
        })
    })
  })

  describe('from()', () => {
    it('should throw for an invalid destination', () => {
      let f = () => payment.from(addr, addr)
      expect(f).toThrow()
    })

    it('should throw for an invalid change address', () => {
      let f = () => payment.from([addr], '1asdf')
      expect(f).toThrow()
    })

    it('should fetch unspents after setting from', (done) => {
      payment
        .from(0, addr)
        .sideEffect(p => {
          expect(p.coins.length).toEqual(3)
          done()
        })
    })
  })

  describe('to()', () => {
    it('should throw for an invalid source', () => {
      let f = () => payment.to('1asdf')
      expect(f).toThrow()
    })

    it('should set the to property', (done) => {
      payment
        .to(addr)
        .sideEffect(p => {
          expect(p.to).toEqual(addr)
          done()
        })
    })
  })

  describe('amount()', () => {
    it('should throw for an invalid amount', () => {
      let f = () => payment.amount('asdf')
      expect(f).toThrow()
    })

    it('should set the amount property', (done) => {
      payment
        .amount(10000)
        .sideEffect(p => {
          expect(p.amount).toEqual(10000)
          done()
        })
    })
  })

  describe('feePerByte()', () => {
    it('should throw for an invalid feePerByte', () => {
      let f = () => payment.feePerByte('asdf')
      expect(f).toThrow()
    })

    it('should set the feePerByte property', (done) => {
      payment
        .feePerByte(10)
        .sideEffect(p => {
          expect(p.feePerByte).toEqual(10)
          done()
        })
    })
  })

  describe('clean()', () => {
    it('should clean the proper fields', () => {
      payment
        .map(p => {
          p.rawTx = 'rawTx'
          p.hash = 'hash'
          p.selection = 'selection'
          return p
        })
        .clean()
        .sideEffect(p => {
          expect(p.rawTx).toEqual(null)
          expect(p.hash).toEqual(null)
          expect(p.selection).toEqual(null)
        })
    })
  })

  describe('build()', () => {
    it('should build a transaction', (done) => {
      payment
        .from(0, addr).to(addr).feePerByte(10).amount(10000)
        .build()
        .sideEffect(p => {
          expect(p.selection.fee).toEqual(1910)
          expect(sumCoins(p.selection.inputs)).toEqual(20000)
          expect(sumCoins(p.selection.outputs)).toEqual(20000 - 1910)
          done()
        })
    })
  })

  describe('buildSweep()', () => {
    it('should build a sweep transaction', (done) => {
      payment
        .from(0, addr).to(addr).feePerByte(10)
        .buildSweep()
        .sideEffect(p => {
          expect(p.selection.fee).toEqual(4850)
          expect(sumCoins(p.selection.inputs)).toEqual(45000)
          expect(sumCoins(p.selection.outputs)).toEqual(45000 - 4850)
          done()
        })
    })
  })
})
