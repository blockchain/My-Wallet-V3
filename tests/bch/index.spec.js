/* eslint-disable semi */
const BitcoinCashWallet = require('../../src/bch')
const BchApi = require('../../src/bch/bch-api')
const BchPayment = require('../../src/bch/bch-payment')
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock')

describe('bch', () => {
  let bch
  let wallet

  const bchMetadataEmpty = {
    default_account_idx: 0,
    accounts: []
  }

  beforeEach((done) => {
    wallet = new BlockchainWalletMock();
    bch = BitcoinCashWallet.fromBlockchainWallet(wallet)
    spyOn(bch._metadata, 'fetch').and.returnValue(Promise.resolve(bchMetadataEmpty))
    bch.fetch().then(() => done())
  });

  it('should have balance = null', () => {
    expect(bch.balance).toEqual(null)
  })

  it('should have txs = []', () => {
    expect(bch.txs).toEqual([])
  })

  it('should have importedAddresses if there are imported addresses', () => {
    expect(bch.importedAddresses).not.toEqual(null)
  })

  it('should not have importedAddresses if there are no spendable active addresses', (done) => {
    wallet.spendableActiveAddresses = []
    bch = BitcoinCashWallet.fromBlockchainWallet(wallet)
    spyOn(bch._metadata, 'fetch').and.returnValue(Promise.resolve(bchMetadataEmpty))
    bch.fetch().then(() => {
      expect(bch.importedAddresses).toEqual(null)
      done()
    })
  })

  it('should have accounts matching the number of hd accounts', () => {
    expect(bch.accounts.length).toEqual(wallet.hdwallet.accounts.length)
  })

  describe('getAddressBalance()', () => {
    beforeEach(() => {
      bch._addressInfo = { '1asdf': { final_balance: 100 } }
    })

    it('should get the balance for an address', () => {
      expect(bch.getAddressBalance('1asdf')).toEqual(100)
    })

    it('should return null if the address has no stored balance', () => {
      expect(bch.getAddressBalance('1nope')).toEqual(null)
    })
  })

  describe('getAccountIndexes()', () => {
    beforeEach(() => {
      bch._addressInfo = { 'xpub1': { account_index: 8, change_index: 6 } }
    })

    it('should get receive and change indexes', () => {
      expect(bch.getAccountIndexes('xpub1')).toEqual({ receive: 8, change: 6 })
    })

    it('should return default values of 0', () => {
      expect(bch.getAccountIndexes('xpub2')).toEqual({ receive: 0, change: 0 })
    })
  })

  describe('getHistory()', () => {
    beforeEach(() => {
      let wallet = { final_balance: 100 }
      let addresses = [{ address: '1asdf', final_balance: 100 }]
      let txs = []
      let info = { latest_block: { height: 500000 } }
      let mocked = { wallet, addresses, txs, info }
      spyOn(BchApi, 'multiaddr').and.returnValue(Promise.resolve(mocked))
    })

    it('should call multiaddr with all addresses and xpubs', (done) => {
      bch.getHistory().then(() => {
        expect(BchApi.multiaddr).toHaveBeenCalledWith(['1asdf', 'xpub1', 'xpub2'], 50)
        done()
      })
    })

    it('should set the balance and address info', (done) => {
      bch.getHistory().then(() => {
        expect(bch.balance).toEqual(100)
        expect(bch.getAddressBalance('1asdf')).toEqual(100)
        done()
      })
    })
  })

  describe('createPayment()', () => {
    it('should create a payment', () => {
      let payment = bch.createPayment()
      expect(payment instanceof BchPayment).toEqual(true)
    })
  })
})
