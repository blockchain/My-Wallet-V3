/* eslint-disable semi */
const BitcoinCashWallet = require('../../src/bch')
const BchSpendable = require('../../src/bch/bch-spendable')
const BchImported = require('../../src/bch/bch-imported')
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock')

describe('BchImported', () => {
  let bch
  let wallet
  let imported

  beforeEach(() => {
    wallet = new BlockchainWalletMock()
    bch = BitcoinCashWallet.fromBlockchainWallet(wallet)
    imported = new BchImported(bch, wallet)
  })

  it('should have: addresses', () => {
    expect(imported.addresses).toEqual(['1asdf'])
  })

  it('should have: label', () => {
    expect(imported.label).toEqual('Imported Addresses')
  })

  it('should have: coinCode=bch', () => {
    expect(imported.coinCode).toEqual('bch')
  })

  it('should have: balance (null)', () => {
    spyOn(BchSpendable.prototype, 'getAddressBalance').and.returnValue(null)
    expect(imported.balance).toEqual(null)
    expect(BchSpendable.prototype.getAddressBalance).toHaveBeenCalledWith('1asdf')
  })

  it('should have: balance (with value)', () => {
    spyOn(BchSpendable.prototype, 'getAddressBalance').and.returnValue(100)
    expect(imported.balance).toEqual(100)
    expect(BchSpendable.prototype.getAddressBalance).toHaveBeenCalledWith('1asdf')
  })

  it('should be able to get the available balance', () => {
    spyOn(BchSpendable.prototype, 'getAvailableBalance')
    imported.getAvailableBalance(10)
    expect(BchSpendable.prototype.getAvailableBalance).toHaveBeenCalledWith(['1asdf'], 10)
  })

  it('should be able to call createPayment()', () => {
    let from = jasmine.createSpy('from')
    spyOn(BchSpendable.prototype, 'createPayment').and.returnValue({ from })
    imported.createPayment()
    expect(from).toHaveBeenCalledWith(['1asdf'], '1asdf')
    expect(BchSpendable.prototype.createPayment).toHaveBeenCalledWith()
  })
})
