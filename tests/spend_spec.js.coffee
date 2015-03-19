# Spending from a legacy address is tested in legacy_addresses_spec

# sendToAccount
# sendBitcoinsForAccount
  # Make sure a new change address is generated (e.g. not the case 
  # in b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba)

# sendToEmail (pending, because not supported yet)
################################################################################
describe "Spend", ->

  mockedObj             = undefined
  observer              = undefined
  data                  = undefined
  hdAccounts            = undefined
  activeLegacyAddresses = undefined

  beforeEach ->
    mockedObj =
      to_addresses: []
      fee: BigInteger.ZERO
      base_fee: BigInteger.valueOf(10000)
      ready_to_send_header: 'Transaction Ready to Send.'
      listeners : []
      addListener: (listener) ->
        this.listeners.push(listener);
      start: (pass) -> this.listeners[0].on_success()

    data =
      from: "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
      to: "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount: 600000
      fee: 10000
      note: "That is an expensive toy"

    observer = 
      success: () -> return 
      error: () -> return
      listener: () -> return
      correct_password: () -> return
      wrong_password: () -> return 
      getPassword: (callback) -> callback
    
    spyOn(observer, "correct_password")
    spyOn(observer, "wrong_password")
    spyOn(observer, 'success')
    spyOn(observer, 'error')
    spyOn(observer, 'listener')
    spyOn(observer, 'getPassword').and.callThrough()
    spyOn(mockedObj, 'addListener').and.callThrough()
    spyOn(mockedObj, 'start').and.callThrough()
    spyOn(Signer, "initNewTx").and.callFake(()-> return mockedObj)

    # activeLegacyAddresses = [
    #   "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
    #   "14msrp3yc4JRZEu49u7zYeAkKer4ETH6ag"
    #   "1CCMvFa5Ric3CcnRWJzSaZYXmCtZzzDLiX"
    #   "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
    # ]

    # spyOn(MyWallet, "isActiveLegacyAddress").and.callFake((address)->
    #   activeLegacyAddresses.indexOf(address) > -1
    # )

    hdAccounts = [
      {
        extendedPublicKey: 
          "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp\
           9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
        extendedPrivateKey: 
          "xprv9zJ1cTHnqzgBP2boCwpP47LBzjGLKXkwYqXoYnV4yrBmstmw6SVt\
           irpvm4GESg9YLn9R386qpmnsrcC5rvrpEJAXSrfqQR3qGtjGv5ddV9g"
        isArchived: () -> false
        getReceivingAddress: () -> "1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"
        getAccountExtendedKey : (p) -> if p then this.extendedPrivateKey else this.extendedPublicKey 
        setUnspentOutputs: (utxo) -> console.log("setUnspentOutputCalled")        
      }
    ]

    spyOn(MyWallet, "getAccounts").and.returnValue(hdAccounts)
    spyOn(MyWallet, "getHDWallet").and.returnValue({
      getAccounts: () -> hdAccounts
      getAccount: (idx) ->  hdAccounts[idx]
    })
      
  ##############################################################################
  ## LEGACY ADDRESS TESTS
  describe "Legacy Address", ->
    beforeEach ->
    ############################################################################
    ############# LEGACY ADDR TO ACC
    describe "sendFromLegacyAddressToAccount()", ->
      it "should use default fee=10000", ->

        data.to = 0 #iDX
        data.fee = null
        MyWallet.setDoubleEncryption(false)
        MyWallet.sendFromLegacyAddressToAccount  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        expect(BigInteger.valueOf(10000).equals(mockedObj.fee)).toBe(true)

      it "should contruct the expected transaction object", ->

        data.to = 0 #iDX
        data.fee = 15000
        MyWallet.setDoubleEncryption(false)
        expected_to_addr = "1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"
        MyWallet.sendFromLegacyAddressToAccount  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        expect(Signer.initNewTx).toHaveBeenCalled()
        expect(BigInteger.valueOf(data.fee).equals(mockedObj.fee)).toBe(true)
        expect(mockedObj.from_addresses).toEqual([data.from])
        expect(BigInteger.valueOf(data.amount)
          .equals(mockedObj.to_addresses[0].value)).toBe(true)
        expect(mockedObj.to_addresses[0].address.toString())
          .toBe(expected_to_addr)
        expect(mockedObj.note).toBe(data.note)
        expect(mockedObj.ready_to_send_header).toBe('Bitcoins Ready to Send.')
        expect(mockedObj.start).toHaveBeenCalledWith(null)
        expect(observer.success).toHaveBeenCalled()

      it "should call wrong_password when second_password active", ->

        data.to = 0
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> false)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendFromLegacyAddressToAccount  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        modalFuncValidatePass = observer.getPassword.calls.argsFor(0)[0]
        modalFuncValidatePass  "ThisIsAWrongPass"
                             , observer.correct_password
                             , observer.wrong_password

        expect(observer.getPassword).toHaveBeenCalled()
        expect(MyWallet.validateSecondPassword).toHaveBeenCalled()
        expect(observer.wrong_password).toHaveBeenCalled()
        expect(observer.correct_password).not.toHaveBeenCalled()

      it "should call correct_password when second_password active", ->

        data.to = 0
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> true)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendFromLegacyAddressToAccount  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        modalFuncValidatePass = observer.getPassword.calls.argsFor(0)[0]
        modalFuncValidatePass  "ThisIsACorrectPass"
                             , observer.correct_password
                             , observer.wrong_password

        expect(observer.getPassword).toHaveBeenCalled()
        expect(MyWallet.validateSecondPassword).toHaveBeenCalled()
        expect(observer.wrong_password).not.toHaveBeenCalled()
        expect(observer.correct_password).toHaveBeenCalled()
        expect(mockedObj.start).toHaveBeenCalledWith("ThisIsACorrectPass")
        expect(observer.success).toHaveBeenCalled()

    ############################################################################
    ############# LEGACY ADDR TO LEGACY ADDR
    describe "sendFromLegacyAddressToAddress()", ->

      it "should use default fee=10000", ->

        data.fee = null
        MyWallet.setDoubleEncryption(false)
        MyWallet.sendFromLegacyAddressToAddress  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        expect(BigInteger.valueOf(10000).equals(mockedObj.fee)).toBe(true)

      it "should contruct the expected transaction object", ->

        data.fee = 15000
        MyWallet.setDoubleEncryption(false)
        MyWallet.sendFromLegacyAddressToAddress  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        expect(Signer.initNewTx).toHaveBeenCalled()
        expect(BigInteger.valueOf(data.fee).equals(mockedObj.fee)).toBe(true)
        expect(mockedObj.from_addresses).toEqual([data.from])
        expect(BigInteger.valueOf(data.amount)
          .equals(mockedObj.to_addresses[0].value)).toBe(true)
        expect(mockedObj.to_addresses[0].address.toString()).toBe(data.to)
        expect(mockedObj.note).toBe(data.note)
        expect(mockedObj.ready_to_send_header).toBe('Bitcoins Ready to Send.')
        # expect(mockedObj.addListener).toHaveBeenCalled()
        expect(mockedObj.start).toHaveBeenCalledWith(null)
        expect(observer.success).toHaveBeenCalled()

      it "should call wrong_password when second_password active", ->

        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> false)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendFromLegacyAddressToAddress  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        modalFuncValidatePass = observer.getPassword.calls.argsFor(0)[0]
        modalFuncValidatePass  "ThisIsAWrongPass"
                             , observer.correct_password
                             , observer.wrong_password

        expect(observer.getPassword).toHaveBeenCalled()
        expect(MyWallet.validateSecondPassword).toHaveBeenCalled()
        expect(observer.wrong_password).toHaveBeenCalled()
        expect(observer.correct_password).not.toHaveBeenCalled()

      it "should call correct_password when second_password active", ->

        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> true)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendFromLegacyAddressToAddress  data.from
                                               , data.to
                                               , data.amount
                                               , data.fee
                                               , data.note
                                               , observer.success
                                               , observer.error
                                               , observer.listener
                                               , observer.getPassword

        modalFuncValidatePass = observer.getPassword.calls.argsFor(0)[0]
        modalFuncValidatePass  "ThisIsACorrectPass"
                             , observer.correct_password
                             , observer.wrong_password

        expect(observer.getPassword).toHaveBeenCalled()
        expect(MyWallet.validateSecondPassword).toHaveBeenCalled()
        expect(observer.wrong_password).not.toHaveBeenCalled()
        expect(observer.correct_password).toHaveBeenCalled()
        expect(mockedObj.start).toHaveBeenCalledWith("ThisIsACorrectPass")
        expect(observer.success).toHaveBeenCalled()

    ############################################################################
    ############# SWEEP LEGACY ADDR

    describe "sweepLegacyAddressToAccount()", ->
      it "should move the funds from a legacy address to account", ->

        data.to = 0
        spyOn(MyWallet, "getLegacyAddressBalance")
          .and.callFake((fromAddr)-> 1000000)
        spyOn(MyWallet, "sendFromLegacyAddressToAccount")
        expectedAmount = 1000000 - 10000
        MyWallet.setDoubleEncryption(false)

        MyWallet.sweepLegacyAddressToAccount  data.from
                                            , data.to
                                            , observer.success
                                            , observer.error
                                            , observer.listener
                                            , observer.getPassword

        expect(MyWallet.sendFromLegacyAddressToAccount)
          .toHaveBeenCalledWith  data.from
                               , data.to
                               , expectedAmount
                               , data.fee
                               , null
                               , observer.success
                               , observer.error
                               , observer.listener
                               , observer.getPassword
  ##############################################################################
  ## END LEGACY ADDRESS TESTS

  describe "sendBitcoinsForAccount()", ->
    it "TEST NOT FINISHED", ->

      getUnspendMock = 'unspent_outputs': [
        {
          'tx_hash': '100be2539cd2088ceeb4e306a567438bda6735ac5dd6fd162a18d1741bb06f7f'
          'tx_hash_big_endian': '7f6fb01b74d1182a16fdd65dac3567da8b4367a506e3b4ee8c08d29c53e20b10'
          'tx_index': 81047728
          'tx_output_n': 1
          'script': '76a91418fc20c88ee4201e1fc31dfe25a5f5881614aa2188ac'
          'xpub':
            'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
            'path': 'M/1/2'
          'value': 10000
          'value_hex': '2710'
          'confirmations': 5
        }
        {
          'tx_hash': '1d1e3fe810e7b4b7c337b4e13435fadc5336e0e54bb8e146f2daa8f8d5430ff4'
          'tx_hash_big_endian': 'f40f43d5f8a8daf246e1b84be5e03653dcfa3534e1b437c3b7b4e710e83f1e1d'
          'tx_index': 81049372
          'tx_output_n': 1
          'script': '76a914024e6d12c55008a2b6383fc86131bb72d74cfc3c88ac'
          'xpub':
            'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
            'path': 'M/1/5'
          'value': 860000
          'value_hex': '0d1f60'
          'confirmations': 0
        }
      ]

      tx = {"version":1,"locktime":0,"ins":[{"hash":{"type":"Buffer","data":[29,30,63,232,16,231,180,183,195,55,180,225,52,53,250,220,83,54,224,229,75,184,225,70,242,218,168,248,213,67,15,244]},"index":1,"script":{"buffer":{"type":"Buffer","data":[72,48,69,2,33,0,194,221,147,243,70,20,184,69,104,161,205,158,199,39,200,88,103,104,22,242,68,247,172,188,106,106,24,203,163,204,73,58,2,32,105,176,17,205,102,140,112,234,196,228,202,26,230,244,128,11,111,25,62,168,195,32,124,246,176,66,122,90,235,148,105,178,1,33,3,158,196,165,25,251,213,203,67,247,41,156,114,4,27,26,194,122,116,243,186,194,224,167,235,233,40,231,129,179,228,171,156]},"chunks":[{"type":"Buffer","data":[48,69,2,33,0,194,221,147,243,70,20,184,69,104,161,205,158,199,39,200,88,103,104,22,242,68,247,172,188,106,106,24,203,163,204,73,58,2,32,105,176,17,205,102,140,112,234,196,228,202,26,230,244,128,11,111,25,62,168,195,32,124,246,176,66,122,90,235,148,105,178,1]},{"type":"Buffer","data":[3,158,196,165,25,251,213,203,67,247,41,156,114,4,27,26,194,122,116,243,186,194,224,167,235,233,40,231,129,179,228,171,156]}]},"sequence":4294967295}],"outs":[{"script":{"buffer":{"type":"Buffer","data":[118,169,20,119,246,65,99,114,184,117,236,133,119,104,246,244,100,50,62,255,241,41,192,136,172]},"chunks":[118,169,{"type":"Buffer","data":[119,246,65,99,114,184,117,236,133,119,104,246,244,100,50,62,255,241,41,192]},136,172]},"value":20000},{"script":{"buffer":{"type":"Buffer","data":[118,169,20,45,94,100,226,250,127,5,209,243,37,234,219,16,225,55,122,246,77,194,174,136,172]},"chunks":[118,169,{"type":"Buffer","data":[45,94,100,226,250,127,5,209,243,37,234,219,16,225,55,122,246,77,194,174]},136,172]},"value":830000}]}
      hdAccounts[0].createTx = () -> tx
      hdAccounts[0].getBalance = () -> 870000

      window.BlockchainAPI = 
        push_tx: (tx, note, success, error) -> 
          console.log("API: push_tx mock called.")
          success
        get_unspent: (xpubList,success,error,conf,nocache) -> 
          console.log("API: get_unspent mock called.")
          success(getUnspendMock)



      data.from = 0 #iDX
      # spyOn(BlockchainAPI, "push_tx")
      #   .and.callFake(()-> console.log "Fuck yeah!")
      MyWallet.setDoubleEncryption(false)
      console.log "The beginning of the drama"
      MyWallet.sendBitcoinsForAccount  data.from
                                     , data.to
                                     , data.amount
                                     , data.fee
                                     , data.note
                                     , observer.success
                                     , observer.error
                                     , observer.listener
                                     , null  # this must be null if double encrypt is false

      expect(101).toBe(101)
      expect(MyWallet.getHDWallet).toHaveBeenCalled();

  describe "generateNewMiniPrivateKey()", ->
    it "should do something...mini :)", ->
      # this is not a public function on MyWallet
      pending()

  describe "redeemFromEmailOrMobile()", ->
    it "...", ->
      pending()

  describe "sendToAccount()", ->
    it "...", ->
      pending()

  describe "sendToEmail()", ->
    it "...", ->
      pending()

  describe "sendToMobile()", ->
    it "...", ->
      pending()

  describe "importPrivateKey()", ->
    it "...", ->
      pending()