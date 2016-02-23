
proxyquire = require('proxyquireify')(require)

MyWallet =
  wallet:
    getNote: (hash) -> null
    containsLegacyAddress: () -> null
    hdwallet:
      account: (path) -> {

      }

transactions = require('./data/transactions')

Tx = proxyquire('../src/wallet-transaction', {
  './wallet'  : MyWallet
})

describe 'Transaction', ->
  describe "coinbase", ->
    it "should be recognized", ->
      tx = Tx.factory(transactions["coinbase"])
      expect(tx.processedInputs.length).toBe(1)
      expect(tx.processedInputs[0].address).toBe("Coinbase")
      expect(tx.processedInputs[0].amount).toBe(2537283063)
