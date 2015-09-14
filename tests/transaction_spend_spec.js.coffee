Transaction = require('../src/transaction')
MyWallet = require('../src/wallet')

describe "Transaction", ->

  observer              = undefined
  data                  = undefined

  beforeEach ->
    data =
      from: "1DiJVG3oD3yeqW26qcVaghwTjvMaVoeghX"
      privateKey: 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj'
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 50000
      toMultiple: ["1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h","1FfmbHfnpaZjKFvyi1okTjJJusN455paPH"]
      multipleAmounts: [20000,10000]
      fee: 10000
      note: "That is an expensive toy"
      email: "emmy@noether.me"
      mobile: "+34649999999"
      unspentMock: [
          {
            "tx_hash": "594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861"
            "hash": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
            "tx_hash_big_endian": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
            "tx_index": 82222265
            "index": 0
            "tx_output_n": 0
            "script": "76a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac"
            "value": 61746
            "value_hex": "00f132"
            "confirmations": 0
          }
      ]


    observer =
      success: () -> return
      error: () -> return
      listener: () -> return

    spyOn(observer, 'success')
    spyOn(observer, 'error')
    spyOn(observer, 'listener')

    window.BlockchainAPI =
      get_unspent: () ->
      push_tx: () ->

    spyOn(BlockchainAPI, "push_tx")
      .and.callFake((tx, note, success, error) ->
        success())

    spyOn(BlockchainAPI, "get_unspent")
      .and.callFake((xpubList,success,error,conf,nocache) ->
        success(getUnspentMock))

    # spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')

  describe "create new Transaction", ->
    it "should fail without unspent outputs", ->

      # expect(test).toThrowError(AssertionError, 'Missing coins to spend')

      try
        new Transaction(null, data.to, data.amount, data.fee, data.from, null)
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('Missing coins to spend')

    it "should fail without amount lower than dust threshold", ->

      data.amount = 100

      try
        new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toContain('dust threshold')

    it "should initialize with good data", ->

      new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

    it "should shuffle the outptus when asked to", ->

      tx = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
      out0 = tx.transaction.outs[0]
      out1 = tx.transaction.outs[1]

      found_not_switched = false
      found_switched = false
      while !found_not_switched || !found_switched
        tx.randomizeOutputs()
        if tx.transaction.outs[0] == out0 && tx.transaction.outs[1] == out1
          found_not_switched = true
        if tx.transaction.outs[0] == out1 && tx.transaction.outs[1] == out0
          found_switched = true

      expect(found_not_switched && found_switched).toBe(true)

    it "should create multiple outputs", ->

      tx = new Transaction(data.unspentMock, data.toMultiple, data.multipleAmounts, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.pub.compressed = false;
      privateKeys = [key]

      tx.addPrivateKeys(privateKeys)
      tx = tx.sign()

      expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220354fd8f420d1f3ffc802af13d451f853d26f343b10225e92a17d3e831edb81960220074d8dac3c497a0481e2041df4f3cd7a82e32415c11b2054b246187f3ff733a8014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff03204e0000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688ac10270000000000001976a914a0e6ca5444e4d8b7c80f70237f332320387f18c788acf2540000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000'
      expect(tx.toHex()).toEqual(expectedHex)

  describe "provide Transaction with private keys", ->

    it "should want addresses when supplied with unspent outputs", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      expect(transaction.addressesOfNeededPrivateKeys.length).toBe(1)
      expect(transaction.pathsOfNeededPrivateKeys.length).toBe(0)

    it "should accept the right private key", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.pub.compressed = false;
      privateKeys = [key]

      transaction.addPrivateKeys(privateKeys)
      expect(transaction.privateKeys).toEqual(privateKeys)

    it "should not accept the wrong private key", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyWIF = '5JfdACpmDbLk7jmjU6kuCdLNFgedL19RnbjZYENAEG8Ntto9zRc'
      format = MyWallet.detectPrivateKeyFormat(privateKeyWIF)
      key = MyWallet.privateKeyStringToKey(privateKeyWIF, format)
      privateKeys = [key]

      expect( () -> transaction.addPrivateKeys(privateKeys) ).toThrow

    it "should sign and produce the correct signed script", ->

      transaction = new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)

      privateKeyBase58 = data.privateKey
      format = MyWallet.detectPrivateKeyFormat(privateKeyBase58)
      key = MyWallet.privateKeyStringToKey(privateKeyBase58, format)
      key.pub.compressed = false;
      privateKeys = [key]

      transaction.addPrivateKeys(privateKeys)
      tx = transaction.sign()

      expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008a4730440220187d6b567d29fe10bea29aa36158edb3fcd9bed5e835b93b9f30d630aea1c7740220612be05b0d87b0a170f7ead7f9688d7172c704f63deb74705779cf8ac26ec3b9014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff0250c30000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688acd2060000000000001976a9148b71295471e921703a938aa9e01433deb07c1aa588ac00000000'
      expect(tx.toHex()).toEqual(expectedHex)
