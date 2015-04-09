Transaction = require('../src/transaction.js')

describe "Transaction", ->

  observer              = undefined
  data                  = undefined

  beforeEach ->
    data =
      from: "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 600000
      fee: 10000
      note: "That is an expensive toy"
      email: "emmy@noether.me"
      mobile: "+34649999999"
      unspentMock: { 'unspent_outputs': [  
          {  
            "tx_hash": "594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861"
            "tx_hash_big_endian": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
            "tx_index": 82222265
            "tx_output_n": 0
            "script": "76a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac"
            "value": 61746
            "value_hex": "00f132"
            "confirmations": 0
          }
      ]}


    observer = 
      success: () -> return 
      error: () -> return
      listener: () -> return
    
    spyOn(observer, 'success')
    spyOn(observer, 'error')
    spyOn(observer, 'listener')

  describe "Legacy Address Unit", ->

    beforeEach ->
      data.from = '17k7jQsewpru3uxMkaUMxahyvACVc7fjjb'
      data.amount = 50000

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

      spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')

      spyOn(window, "Transaction")

    describe "sendFromLegacyAddressToAddress()", ->
      it "should get to send without errors", ->
        data.fee = null

        # test = () -> new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)
        # expect(test).toThrowError(AssertionError, 'No Free Outputs To Spend')

        expect(new Transaction(data.unspentMock, data.to, data.amount, data.fee, data.from, null)).toThrowError(AssertionError, 'No Free Outputs To Spend')
