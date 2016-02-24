
proxyquire = require('proxyquireify')(require)

MyWallet =
  wallet:
    getNote: (hash) -> null
    containsLegacyAddress: (addr) -> addr == "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    hdwallet:
      account: () -> { index: 0, label: "Savings" }

    key: () -> { label: "Genesis", isWatchOnly: true }
    latestBlock: { height: 399680 }

transactions = require('./data/transactions')

Tx = proxyquire('../src/wallet-transaction', {
  './wallet': MyWallet
})

describe 'Transaction', ->

  describe "new", ->
    it "should create an empty transaction given no argument", ->
      tx = new Tx()
      expect(tx.inputs.length).toEqual(0)
      expect(tx.out.length).toEqual(0)
      expect(tx.confirmations).toEqual(0)

  describe "default", ->
    it "should be recognized", ->
      tx = Tx.factory(transactions["default"])
      expect(tx.processedInputs.length).toBe(2)
      expect(tx.processedOutputs.length).toBe(1)
      expect(tx.processedInputs[0].address).toBe("1AaFJUs2XY1sGGg7p7ucJSZEJF3zB6r4Eh")
      expect(tx.fromWatchOnly).toBeTruthy()
      expect(tx.toWatchOnly).toBeFalsy()
      expect(tx.txType).toEqual("sent")
      expect(tx.amount).toEqual(-30000)


    it "should have a fee equal to the difference between inputs and outputs value", ->
      tx = Tx.factory(transactions["default"])

      expect(tx.fee).toEqual(10000)

    it "should have a correct number of confirmations", ->
      tx = Tx.factory(transactions["default"])

      expect(tx.confirmations).toEqual(3)

    it "should have correctly tagged outputs", ->
      tx = Tx.factory(transactions["default"])
      expect(tx.processedOutputs[0].coinType).toEqual("external")

    it "should have correctly tagged inputs", ->
      tx = Tx.factory(transactions["default"])
      expect(tx.processedInputs[0].coinType).toEqual("0/1/15")
      expect(tx.processedInputs[1].coinType).toEqual("legacy")
      expect(tx.belongsTo("imported")).toEqual(true)

  describe "coinbase", ->
    it "should be recognized", ->
      tx = Tx.factory(transactions["coinbase"])
      expect(tx.processedInputs.length).toBe(1)
      expect(tx.processedOutputs.length).toBe(1)
      expect(tx.processedInputs[0].address).toBe("Coinbase")
      expect(tx.processedInputs[0].amount).toBe(100000)
      expect(tx.txType).toEqual("received")
      expect(tx.amount).toEqual(100000)

    it "should have a fee equal to 0", ->
      tx = Tx.factory(transactions["coinbase"])

      expect(tx.fee).toEqual(0)


  describe "internal", ->
    it "should be recognized", ->
      tx = Tx.factory(transactions["internal"])
      expect(tx.processedInputs.length).toBe(1)
      expect(tx.processedOutputs.length).toBe(2)
      expect(tx.fromWatchOnly).toBeFalsy()
      expect(tx.toWatchOnly).toBeFalsy()

    it "should have a fee equal to 10000", ->
      tx = Tx.factory(transactions["internal"])
      expect(tx.fee).toEqual(10000)

    it "should be categorized as a transfer", ->
      tx = Tx.factory(transactions["internal"])
      expect(tx.txType).toEqual("transfer")
      expect(tx.changeAmount).toEqual(10000)
      expect(tx.amount).toEqual(80000)


  describe "factory", ->
    it "should not touch already existing objects", ->
      tx = Tx.factory(transactions["coinbase"])
      fromFactory = Tx.factory(tx)
      expect(tx).toEqual(fromFactory)

  describe "IOSfactory", ->
    it "should create valid iOS objects", ->
      tx = Tx.factory(transactions["default"])
      ios = Tx.IOSfactory(tx)
      expect(ios.time).toEqual(tx.time)
      expect(ios.result).toEqual(tx.result)
      expect(ios.confirmations).toEqual(tx.confirmations)
      expect(ios.txType).toEqual(tx.txType)
      expect(ios.block_height).toEqual(tx.block_height)
      expect(ios.myHash).toEqual(tx.hash)
