/* eslint-disable semi */
const EthTxBuilder = require('../../src/eth/eth-tx-builder')
const EthAccount = require('../../src/eth/eth-account')
const util = require('ethereumjs-util');

describe('EthTxBuilder', () => {
  const wallet = {
    getPrivateKey () {
      return Buffer.from('6858f113ba3bf55880105726c0d9f0495756321b45f821bc228fca2adacbb87b', 'hex')
    }
  }

  let account
  let payment

  beforeEach(() => {
    account = EthAccount.fromWallet(wallet)
    account.setData({ balance: '100000000000000000', nonce: 3 })
    payment = new EthTxBuilder(account)
    payment.setGasPrice(21)
    payment.setGasLimit(21000)
  })

  describe('constructor', () => {
    it('should set the nonce equal to the account nonce', () => {
      expect(payment._tx.nonce.toString('hex')).toEqual('03')
    })
  })

  describe('instance', () => {
    describe('getters', () => {
      it('should have: fee', () => {
        expect(payment.fee).toEqual(0.000441)
      })

      it('should have: amount', () => {
        expect(payment.amount).toEqual(0)
      })

      it('should have: available', () => {
        expect(payment.available).toEqual(0.099559)
      })
    })

    describe('.setTo()', () => {
      it('should set the to field', () => {
        payment.setTo('0xd70073f72621fb90060ac257f38cf2ff566ea6bb')
        expect(payment._tx.to.toString('hex')).toEqual('d70073f72621fb90060ac257f38cf2ff566ea6bb')
      })

      it('should fail for an invalid address', () => {
        let setTo = () => payment.setTo('xyz')
        expect(setTo).toThrow()
      })
    })

    describe('.setValue()', () => {
      it('should set the value', () => {
        payment.setValue(0.5)
        expect(payment.amount).toEqual(0.5)
      })

      it('should set a value that is more precise than is possible for wei', () => {
        payment.setValue(0.0025460841226194113)
        expect(payment.amount).toEqual(0.002546084122619411)
      })
    })

    describe('.setGasPrice()', () => {
      it('should set the gas price', () => {
        payment.setGasPrice(10)
        expect(payment.fee).toEqual(0.00021)
      })
    })

    describe('.setGasLimit()', () => {
      it('should set the gas limit', () => {
        payment.setGasLimit(20000)
        expect(payment.fee).toEqual(0.00042)
      })
    })

    describe('.setSweep()', () => {
      it('should set a sweep transaction', () => {
        payment.setSweep()
        expect(payment.amount).toEqual(0.099559)
        expect(payment.fee).toEqual(0.000441)
      })

      it('should sweep with a very large value', () => {
        account.setData({ balance: '19991027158563527', nonce: 3 })
        payment.setSweep()
        expect(new util.BN(payment._tx.value).toString()).toEqual('19550027158563527')
        expect(payment.amount).toEqual(0.019550027158563528)
        expect(payment.fee).toEqual(0.000441)
      })
    })

    describe('.sign()', () => {
      it('should sign the transaction', () => {
        let sign = () => payment.sign(wallet.getPrivateKey())
        expect(sign).not.toThrow()
      })

      it('should fail to sign with an incorrect key', () => {
        let incorrect = Buffer.from('6034edd08a4153c66e653829bdfcd2bcb3c49a16f2d10e4023676a9574879647', 'hex')
        let sign = () => payment.sign(incorrect)
        expect(sign).toThrow()
      })
    })

    describe('.publish()', () => {
      beforeEach(() => {
        payment.setTo('0xd70073f72621fb90060ac257f38cf2ff566ea6bb')
        payment.setSweep()
        payment.sign(wallet.getPrivateKey())
        spyOn(EthTxBuilder, 'pushTx').and.returnValue(Promise.resolve())
      })

      it('should call pushtx with the raw tx hex', () => {
        payment.publish()
        expect(EthTxBuilder.pushTx).toHaveBeenCalledWith('0xf86c038504e3b2920082520894d70073f72621fb90060ac257f38cf2ff566ea6bb880161b4620d317000801ba0ae46bd95a2483d464b8a61663928b36f7a310a01e3207301eb1e9ce19dc6188ea0645036efbb4ad2c567e873653a021e7ccd5c4818546f0c3be16ffb1d4b1075fd')
      })
    })

    describe('.toRaw()', () => {
      it('should serialize to tx hex', () => {
        payment.setTo('0xd70073f72621fb90060ac257f38cf2ff566ea6bb')
        payment.setSweep()
        payment.sign(wallet.getPrivateKey())
        expect(payment.toRaw()).toEqual('0xf86c038504e3b2920082520894d70073f72621fb90060ac257f38cf2ff566ea6bb880161b4620d317000801ba0ae46bd95a2483d464b8a61663928b36f7a310a01e3207301eb1e9ce19dc6188ea0645036efbb4ad2c567e873653a021e7ccd5c4818546f0c3be16ffb1d4b1075fd')
      })
    })
  })

  describe('static', () => {
    it('should have a GAS_PRICE constant', () => {
      expect(EthTxBuilder.GAS_PRICE).toEqual(21)
    })

    it('should have a GAS_LIMIT constant', () => {
      expect(EthTxBuilder.GAS_LIMIT).toEqual(21000)
    })
  })
})
