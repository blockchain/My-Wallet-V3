proxyquire = require('proxyquireify')(require)

WalletStore = {}
WalletCrypto = {}
Bitcoin = {}
BlockchainAPI = {}

stubs = {
          './wallet-crypto'  : WalletCrypto
        , './wallet-store'   : WalletStore
        , 'bitcoinjs-lib'    : Bitcoin
        , './blockchain-api' : BlockchainAPI
      }

# spenderStubs = {
#           './wallet-crypto'  : WalletCrypto
#         , './wallet-store'   : WalletStore
#         , 'bitcoinjs-lib'    : Bitcoin
#         , './blockchain-api' : BlockchainAPI
#       }

MyWallet = proxyquire('../src/wallet', stubs)
Spender = proxyquire('../src/wallet-spender', stubs)
# Spender = require('../src/wallet-spender');
# WalletStore = require('../src/wallet-store');

BigInteger = require('bigi')

################################################################################
################################################################################
describe "Spender", ->

  observer   = undefined
  hdAccounts = undefined
  legacyData = undefined
  getPass    = undefined

  beforeEach ->
    # window.formatBTC = (str) -> str
    # legacyData =
    #   from: "17k7jQsewpru3uxMkaUMxahyvACVc7fjjb"
    #   to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
    #   amount: 50000
    #   fee: 10000
    #   note: "That is an expensive toy"
    #   email: "emmy@noether.me"
    #   mobile: "+34649999999"

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

    getPass = (tryPassword) -> () -> tryPassword(
      '1234'
      , -> console.log 'Correct password'
      , -> console.log 'Wrong password'
    )

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

    # spyOn(WalletStore, "getPrivateKey").and.callFake((address) -> 'AWrnMsqe2AJYmrzKsN8qRosHRiCSKag3fcmvUA9wdJDj')


    # spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)


  describe "Constructor", ->

    it "should create all (from) methods", ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)

      prepare = new Spender(null, observer.success, observer.error, null, null)

      expect(typeof(prepare.fromAccount)).toEqual("function")
      expect(typeof(prepare.fromAddress)).toEqual("function")
      expect(typeof(prepare.addressSweep)).toEqual("function")

    it "should create all (to) methods", ->

      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(false)

      fromAddress = new Spender(null, observer.success, observer.error, null, null)
                          .fromAddress("mi address", 10, 10)

      expect(typeof(fromAddress.toAddress)).toEqual("function")
      expect(typeof(fromAddress.toAccount)).toEqual("function")
      expect(typeof(fromAddress.toMobile)).toEqual("function")
      expect(typeof(fromAddress.toEmail)).toEqual("function")

  describe "fromAddress", ->

    it "should ...", ->
      console.log("TEST QUE FEM----------------------------------");
      spyOn(WalletStore, "getDoubleEncryption").and.returnValue(true)
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)

      Spender("my note", observer.success, observer.error, observer.listener, getPass)
        .fromAddress("1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX", 30000, 10000)
          .toAddress("1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF")

      expect(2).toEqual 2
