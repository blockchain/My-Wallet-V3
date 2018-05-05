/* eslint-disable semi */
const BitcoinCashWallet = require('../../src/bch')
const BchSpendable = require('../../src/bch/bch-spendable')
const BchAccount = require('../../src/bch/bch-account')
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock')

describe('BchAccount', () => {
  let bch
  let wallet
  let btcAcc
  let account

  const bchMetadataEmpty = {
    default_account_idx: 0,
    accounts: []
  }

  beforeEach((done) => {
    wallet = new BlockchainWalletMock()
    bch = BitcoinCashWallet.fromBlockchainWallet(wallet)
    btcAcc = wallet.hdwallet.accounts[0]
    account = new BchAccount(bch, wallet, btcAcc, {})
    spyOn(bch._metadata, 'fetch').and.returnValue(Promise.resolve(bchMetadataEmpty))
    bch.fetch().then(() => done())
  })

  it('should have: index', () => {
    expect(account.index).toEqual(0)
  })

  it('should have: xpub', () => {
    expect(account.xpub).toEqual('xpub1')
  })

  it('should have: label', () => {
    expect(account.label).toEqual('My Bitcoin Cash Wallet')
  })

  it('should have: coinCode=bch', () => {
    expect(account.coinCode).toEqual('bch')
  })

  it('should have: balance', () => {
    spyOn(BchSpendable.prototype, 'getAddressBalance').and.callThrough()
    expect(account.balance).toEqual(null)
    expect(BchSpendable.prototype.getAddressBalance).toHaveBeenCalledWith(account.xpub)
  })

  it('should have: receiveAddress', () => {
    spyOn(bch, 'getAccountIndexes').and.returnValue({ receive: 10 })
    spyOn(btcAcc, 'receiveAddressAtIndex').and.returnValue('1asdf')
    expect(account.receiveAddress).toEqual('1asdf')
    expect(bch.getAccountIndexes).toHaveBeenCalledWith('xpub1')
    expect(btcAcc.receiveAddressAtIndex).toHaveBeenCalledWith(10)
  })

  it('should have: changeAddress', () => {
    spyOn(bch, 'getAccountIndexes').and.returnValue({ change: 10 })
    spyOn(btcAcc, 'changeAddressAtIndex').and.returnValue('1asdf')
    expect(account.changeAddress).toEqual('1asdf')
    expect(bch.getAccountIndexes).toHaveBeenCalledWith('xpub1')
    expect(btcAcc.changeAddressAtIndex).toHaveBeenCalledWith(10)
  })

  it('should be able to get the available balance', () => {
    spyOn(BchSpendable.prototype, 'getAvailableBalance')
    account.getAvailableBalance(10)
    expect(BchSpendable.prototype.getAvailableBalance).toHaveBeenCalledWith(0, 10)
  })

  it('should be able to call createPayment()', () => {
    let from = jasmine.createSpy('from')
    spyOn(btcAcc, 'changeAddressAtIndex').and.returnValue('1asdf')
    spyOn(BchSpendable.prototype, 'createPayment').and.returnValue({ from })
    account.createPayment()
    expect(from).toHaveBeenCalledWith(0, '1asdf')
    expect(BchSpendable.prototype.createPayment).toHaveBeenCalledWith()
  })
})
