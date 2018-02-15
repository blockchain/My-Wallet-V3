/* eslint-disable semi */
const BitcoinCashWallet = require('../../src/bch')
const BchSpendable = require('../../src/bch/bch-spendable')
const BchApi = require('../../src/bch/bch-api')
const Coin = require('../../src/coin')
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock')

describe('BchSpendable', () => {
  let bch
  let wallet
  let spendable

  beforeEach(() => {
    wallet = new BlockchainWalletMock()
    bch = BitcoinCashWallet.fromBlockchainWallet(wallet)
    spendable = new BchSpendable(bch, wallet)
  })

  it('should be able to call getAddressBalance()', () => {
    spyOn(bch, 'getAddressBalance')
    spendable.getAddressBalance('1asdf')
    expect(bch.getAddressBalance).toHaveBeenCalledWith('1asdf')
  })

  it('should be able to call createPayment()', () => {
    spyOn(bch, 'createPayment')
    spendable.createPayment()
    expect(bch.createPayment).toHaveBeenCalledWith()
  })

  describe('getAvailableBalance()', () => {
    beforeEach(() => {
      let mocked = [Coin.of(5000), Coin.of(15000)]
      spyOn(BchApi, 'getUnspents').and.returnValue(Promise.resolve(mocked))
    })

    it('should fetch coins for the source', () => {
      spendable.getAvailableBalance(['1asdf'], 5)
      expect(BchApi.getUnspents).toHaveBeenCalledWith(wallet, ['1asdf'])
    })

    it('should compute the correct values', (done) => {
      spendable.getAvailableBalance(['1asdf'], 5).then(values => {
        expect(values.fee).toEqual(5)
        expect(values.sweepFee).toEqual(1690)
        expect(values.amount).toEqual(20000 - 1690)
        done()
      })
    })
  })
})
