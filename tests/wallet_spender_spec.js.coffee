proxyquire = require('proxyquireify')(require)

WalletStore = {}
WalletCrypto = {}
Bitcoin = {}
BlockchainAPI = {}

stubs = {'./wallet-store': WalletStore, './wallet-crypto': WalletCrypto, 'bitcoinjs-lib': Bitcoin, './blockchain-api': BlockchainAPI}

MyWallet = proxyquire('../src/wallet', stubs)
Spender = require('../src/wallet-spender');
BigInteger = require('bigi')

################################################################################
################################################################################
describe "walletSpender", ->

  observer   = undefined
  hdAccounts = undefined
  legacyData = undefined

  beforeEach ->
    window.formatBTC = (str) -> str
    legacyData =
      from: "17k7jQsewpru3uxMkaUMxahyvACVc7fjjb"
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 50000
      fee: 10000
      note: "That is an expensive toy"
      email: "emmy@noether.me"
      mobile: "+34649999999"

    # general vars for every test
    observer =
      success: () -> return
      error: () -> return
      listener: () -> return
      correct_password: () -> return
      wrong_password: () -> return
      getPassword: (callback) -> callback
      toSpenderSpy: (x) -> return

    spyOn(observer, "correct_password")
    spyOn(observer, "wrong_password")
    spyOn(observer, 'success')
    spyOn(observer, 'error')
    spyOn(observer, 'listener')
    spyOn(observer, 'getPassword').and.callThrough()

    hdAccounts = [
      {
        extendedPublicKey:
          "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp\
           9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
        extendedPrivateKey:
          "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVt\
           irpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g"
        archived: false
        getReceivingAddress: () -> "1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"
        getAccountExtendedKey : (p) -> if p then this.extendedPrivateKey else this.extendedPublicKey
        setUnspentOutputs: (utxo) -> return
      }
    ]
    spyOn(MyWallet, "getAccounts").and.returnValue(hdAccounts)
    spyOn(WalletStore, "getHDWallet").and.returnValue({
      getAccounts: () -> hdAccounts
      getAccount: (idx) ->  hdAccounts[idx]
    })

    spyOn(BlockchainAPI, "push_tx")
      .and.callFake((tx, note, success, error) ->
        console.log "Jaume: push_tx mock called."
        success(tx.hash))

    getUnspentMock = 'unspent_outputs': [
        {
          "tx_hash": "594c66729d5068b7d816760fc304accd760629ee75a371529049a94cffa50861"
          "tx_hash_big_endian": "6108a5ff4ca949905271a375ee290676cdac04c30f7616d8b768509d72664c59"
          "tx_index": 82222265
          "tx_output_n": 0
          "script": "76a91449f842901a0c81fb9c0c0f8c61027d2b085a2a9088ac"
          "value": 617460
          "value_hex": "00f132"
          "confirmations": 0
        }
    ]

    spyOn(BlockchainAPI, "get_unspent")
      .and.callFake((xpubList,success,error,conf,nocache) ->
        console.log("Jaume: get_unspent mock called")
        success(getUnspentMock))

    spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')
    spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
  # describe "Spender (from) Constructor", ->
  #   it "should create a non empty prepare form", ->
  #     # we should check the note logic once it is implemented
  #     form = new Spender( null, observer.success, observer.error,
  #                         null, observer.getPassword)

  #     # check creation of the spender with three (from) methods
  #     expect(typeof(form.prepareFromAddress)).toEqual("function")
  #     expect(typeof(form.prepareAddressSweep)).toEqual("function")
  #     expect(typeof(form.prepareFromAccount)).toEqual("function")

  # describe "Spender (to) Constructor", ->
  #   it "should create a non empty spend form", ->
  #     spyOn(observer, 'toSpenderSpy')
  #     new Spender( null, observer.success, observer.error,
  #                         null, observer.getPassword)
  #             .prepareFromAddress legacyData.from,
  #                                 legacyData.amount,
  #                                 legacyData.fee,
  #                                 observer.toSpenderSpy
  #                                 # (from) -> from.toAddress(legacyData.to); return
  #                                 # (from) -> console.log from; return
  #     # check creation of the spender with four (to) methods
  #     expect(observer.toSpenderSpy).toHaveBeenCalled();
  #     form = observer.toSpenderSpy.calls.argsFor(0)[0]
  #     expect(typeof(form.toAddress)).toEqual("function")
  #     expect(typeof(form.toAccount)).toEqual("function")
  #     expect(typeof(form.toEmail)).toEqual("function")
  #     expect(typeof(form.toMobile)).toEqual("function")

  # describe "prepareFromAddress - toAddress", ->
  #   it "should ...", ->
  #     console.log "#########################################"
  #     new Spender( null, observer.success, observer.error,
  #                         null, observer.getPassword)
  #             .prepareFromAddress legacyData.from,
  #                                 legacyData.amount,
  #                                 legacyData.fee,
  #                                 (from) -> from.toAddress(legacyData.to); return
  #     # check creation of the spender with four (to) methods
  #     tx = BlockchainAPI.push_tx.calls.argsFor(0)[0]
  #     console.log tx

  describe "Spender (from) Constructor", ->
    it "should create a non empty prepare form", ->
      # we should check the note logic once it is implemented
      # getPass2 = (callback) ->

      #   s = ->
      #     console.log 'exit'
      #     return

      #   e = ->
      #     console.log 'fail'
      #     return

      #   setTimeout (->
      #     callback '1234', s, e
      #     return
      #   ), 3000
      #   return


      # getPass = (tryPassword) ->
      #   setTimeout(
      #     () -> tryPassword('1234', -> console.log 'Correct password'); return,
      #     2000
      #   )
      #   return

      # test = () ->
      #   setTimeout ->
      #     console.log "hola"
      #     return
      #   return

      # # new Spenderr( null, test, observer.error, null, getPass2)

      # # console.log("jaume 0");
      # # new Spender( null, observer.success, observer.error, null, observer.getPassword)
      # #         .prepareFromAddress legacyData.from,
      # #                             legacyData.amount,
      # #                             legacyData.fee,
      # #                             (from) -> from.toAddress(legacyData.to); return

      # new Spenderr(null, null, null, null, null)
      #   .prepareFromAddress(null, null, null)
      #     .toAddress(null, null);

      expect(3).toEqual(3)
