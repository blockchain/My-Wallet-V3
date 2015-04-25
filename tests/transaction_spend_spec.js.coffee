Transaction = require('../src/transaction')
MyWallet = require('../src/wallet')

describe "Transaction", ->

  observer              = undefined
  data                  = undefined

  beforeEach ->
    data =
      from: "17k7jQsewpru3uxMkaUMxahyvACVc7fjjb"
      privateKey: 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj'
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 50000
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

    window.formatBTC = (str) -> str

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

      # expect(test).toThrowError(AssertionError, 'No Free Outputs To Spend')

      try
        new Transaction(null, data.to, data.amount, data.fee, data.from, null)
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('No Free Outputs To Spend')

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
      privateKeys = [key]

      transaction.addPrivateKeys(privateKeys)
      tx = transaction.sign()

      expectedHex = '0100000001594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861000000008b483045022100fbf264a827a86968fc299bc2dd62886c8828ad363faa15bed8b3d8fc6da68c9402203b33724d03066d4c631d0122f53e87b4cc687e6eece557424712debc4d003c31014104a7392f5628776b530aa5fbb41ac10c327ccd2cf64622a81671038ecda25084af786fd54d43689241694d1d65e6bde98756fa01dfd2f5a90d5318ab3fb7bad8c1ffffffff0250c30000000000001976a914078d35591e340799ee96968936e8b2ea8ce504a688acd2060000000000001976a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac00000000'
      expect(tx.toHex()).toEqual(expectedHex)
