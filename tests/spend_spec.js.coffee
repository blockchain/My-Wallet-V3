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
      email: "emmy@noether.me"
      mobile: "+34649999999"

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
        setUnspentOutputs: (utxo) -> return
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

  ##############################################################################
  ## SendBitcoinsForAccount TESTS
  describe "Send", ->

    getUnspendMock = undefined
    tx             = undefined
    beforeEach ->  
      # Mocked objects
      # - all the methods in the accoupnt object (hdwallet.js)
      #    - createTx, getBalance, getAccountExtendedKey, setUnspentOutputs
      # - BlockchainAPI calls
      #    - get_unspent, push_tx 
      # - MyWallet
      #    - decryptSecretWithSecondPassword and validateSecondPassword
      data.from = 0 #iDX
      getUnspendMock = 'unspent_outputs': [
        {
          'tx_hash': '100be2539cd2088ceeb4e306a567438bda6735ac5dd6fd162a18d1741bb06f7f'
          'tx_hash_big_endian': '7f6fb01b74d1182a16fdd65dac3567da8b4367a506e3b4ee8c08d29c53e20b10'
          'tx_index': 81047728
          'tx_output_n': 1
          'script': '76a91418fc20c88ee4201e1fc31dfe25a5f5881614aa2188ac'
          'xpub':
            'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcK\
                  ETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
            'path': 'M/1/2'
          'value': 10000
          'value_hex': '2710'
          'confirmations': 30
        }
        {
          'tx_hash': '17cba71f08fc8e7af50088d87f94fa7ce8d70dfaa74c4544eccbf261eaeca2e9'
          'tx_hash_big_endian': 'e9a2ecea61f2cbec44454ca7fa0dd7e87cfa947fd88800f57a8efc081fa7cb17'
          'tx_index': 81073644
          'tx_output_n': 1
          'script': '76a914d36f60cc98e0f36946f7e30e7652ebe65f3d0f7388ac'
          'xpub':
            'm': 'xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp9Gf9QcK\
                  ETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ'
            'path': 'M/1/7'
          'value': 800000
          'value_hex': '0c3500'
          'confirmations': 0
        }
      ]
      tx = Bitcoin.Transaction.fromHex "010000000117cba71f08fc8e7af50088d87f94fa\
           7ce8d70dfaa74c4544eccbf261eaeca2e9010000006a4730440220596b5654ad1d695\
           5c75636125637fa5870457de6535c63ffea2a534efa0bcb9d02203419ab6603a8ea94\
           4d485f4a7db3a99ab7a62dfb99c7b64e10d72ab1be64a38c01210349802adc55cc58e\
           ca077ab42b9fe10037146bd61cca9f8b6abf729c8126237a9ffffffff02204e000000\
           0000001976a91477f6416372b875ec857768f6f464323efff129c088acd0bf0b00000\
           000001976a914fe7e2afa1b1878ca20185b036200fdb9ba7acebc88ac00000000"
      hdAccounts[data.from].createTx = () -> tx
      hdAccounts[data.from].getBalance = () -> 810000

      window.BlockchainAPI =
        get_unspent: () -> return
        push_tx: () -> return
        sendViaEmail: () -> return

      spyOn(BlockchainAPI, "get_unspent")
        .and.callFake((xpubList,success,error,conf,nocache) -> 
          # console.log "GET_UNSPENT MOCK USED"
          success(getUnspendMock))
      spyOn(BlockchainAPI, "push_tx")
        .and.callFake((tx, note, success, error) ->
          # console.log "PUSH MOCK USED" 
          success())
      spyOn(BlockchainAPI, "sendViaEmail")
        .and.callFake((email, tx, privateKey, success, error) ->
          # console.log "sendViaEmail MOCK USED" 
          success())

    describe "sendBitcoinsForAccount()", ->
      it "the transaction has been pushed to the network", ->

        spyOn(MyWallet.getHDWallet(),"getAccount").and.callThrough()
        spyOn(hdAccounts[data.from], 'createTx').and.callThrough()
        spyOn(hdAccounts[data.from], 'getBalance').and.callThrough()

        MyWallet.setDoubleEncryption(false)
        MyWallet.sendBitcoinsForAccount  data.from
                                       , data.to
                                       , data.amount
                                       , data.fee
                                       , data.note
                                       , observer.success
                                       , observer.error
                                       , observer.listener
                                       , null  # this must be null if double encrypt is false

        expect(MyWallet.getHDWallet().getAccount).toHaveBeenCalledWith(data.from)
        expect(BlockchainAPI.get_unspent).toHaveBeenCalled()
        xpub = BlockchainAPI.get_unspent.calls.argsFor(0)[0][0]
        expect(xpub).toBe(hdAccounts[0].extendedPublicKey)
        expect(hdAccounts[data.from].getBalance).toHaveBeenCalled()
        expect(hdAccounts[data.from].createTx)
          .toHaveBeenCalledWith(
             data.to
            ,data.amount
            ,data.fee
            ,getUnspendMock.unspent_outputs
            ,hdAccounts[data.from].getAccountExtendedKey(true)
            ,observer.listener)
        expect(BlockchainAPI.push_tx).toHaveBeenCalled()
        transaction = BlockchainAPI.push_tx.calls.argsFor(0)[0].toHex()
        expect(transaction).toBe(tx.toHex())
        expect(observer.success).toHaveBeenCalled()
        expect(observer.error).not.toHaveBeenCalled()

      it "with double encryption enabled and wrong password", ->

        data.from = 0 #iDX
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> false)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendBitcoinsForAccount  data.from
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

      it "with double encryption enabled and correct password", ->

        data.from = 0 #iDX
        spyOn(MyWallet, "decryptSecretWithSecondPassword")
          .and.returnValue(hdAccounts[data.from].getAccountExtendedKey(true))
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> true)
        MyWallet.setDoubleEncryption(true)
        MyWallet.sendBitcoinsForAccount  data.from
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
        expect(MyWallet.decryptSecretWithSecondPassword).toHaveBeenCalled()
        expect(observer.success).toHaveBeenCalled()

    describe "sendToAccount()", ->
      it "should call sendBitcoinsForAccount with the expected address.", ->
        data.from = 0 #iDX
        data.to = 0 #iDX
        adr = "18dRLjdquhJeCLc9iBuRYvNZWrp9wY4Qur"
        hdAccounts[data.to].getReceivingAddress = () -> adr
        spyOn(MyWallet, 'sendBitcoinsForAccount').and.callThrough()
        MyWallet.sendToAccount data.from
                             , data.to
                             , data.amount
                             , data.fee
                             , data.note
                             , observer.success
                             , observer.error
                             , observer.listener
                             , observer.getPassword 

        expect(MyWallet.sendBitcoinsForAccount)
          .toHaveBeenCalledWith  data.from
                               , adr
                               , data.amount
                               , data.fee
                               , data.note
                               , observer.success
                               , observer.error
                               , observer.listener
                               , observer.getPassword

    describe "sendToEmail()", ->
      it "should create a new address, create a tx to this address and push it", ->

        data.from = 0
        MyWallet.setDoubleEncryption(false)
        spyOn(MyWallet, 'addPrivateKey').and.returnValue(true)
        spyOn(MyWallet, 'setLegacyAddressTag')
        spyOn(MyWallet, 'setLegacyAddressLabel')
          .and.callFake((adr,lab,success,error) -> success())
        spyOn(MyWallet, 'backupWallet')
          .and.callFake((method,success,error) -> success())
        spyOn(MyWallet, 'getAndSetUnspentOutputsForAccount')
          .and.callThrough()
        spyOn(hdAccounts[data.from], 'createTx').and.callThrough()

        MyWallet.sendToEmail data.from
                           , data.amount
                           , data.fee
                           , data.email
                           , observer.success
                           , observer.error
                           , observer.listener
                           , null 

        expect(MyWallet.addPrivateKey).toHaveBeenCalled()
        expect(MyWallet.setLegacyAddressTag).toHaveBeenCalled()
        address = MyWallet.setLegacyAddressTag.calls.argsFor(0)[0]
        expect(MyWallet.setLegacyAddressLabel)
          .toHaveBeenCalledWith( address 
                                ,jasmine.any(String)
                                ,jasmine.any(Function)
                                ,jasmine.any(Function)
        )
        expect(MyWallet.backupWallet)
          .toHaveBeenCalledWith( 'update'
                                ,jasmine.any(Function)
                                ,jasmine.any(Function)
        )
        expect(MyWallet.getAndSetUnspentOutputsForAccount).toHaveBeenCalled() 
        expect(hdAccounts[data.from].createTx)
          .toHaveBeenCalledWith(
             address
            ,data.amount
            ,data.fee
            ,getUnspendMock.unspent_outputs
            ,hdAccounts[data.from].getAccountExtendedKey(true)
            ,observer.listener)

        expect(BlockchainAPI.push_tx)
          .toHaveBeenCalledWith(
             jasmine.any(Object)
            ,null
            ,jasmine.any(Function)
            ,jasmine.any(Function)
        )

      it "with double encryption and wrong password", ->

        data.from = 0
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> false)
        MyWallet.setDoubleEncryption(true)

        MyWallet.sendToEmail data.from
                           , data.amount
                           , data.fee
                           , data.email
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

      it "with double encryption enabled and correct password", ->

        data.from = 0
        spyOn(MyWallet, "validateSecondPassword").and.callFake((pw)-> true)
        spyOn(MyWallet, "decryptSecretWithSecondPassword")
          .and.returnValue(hdAccounts[data.from].getAccountExtendedKey(true))
        MyWallet.setDoubleEncryption(true)
        spyOn(MyWallet, 'addPrivateKey').and.returnValue(true)
        spyOn(MyWallet, 'setLegacyAddressTag')
        spyOn(MyWallet, 'setLegacyAddressLabel')
          .and.callFake((adr,lab,success,error) -> success())
        spyOn(MyWallet, 'backupWallet')
          .and.callFake((method,success,error) -> success())
        
        MyWallet.sendToEmail data.from
                           , data.amount
                           , data.fee
                           , data.email
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
        expect(MyWallet.decryptSecretWithSecondPassword).toHaveBeenCalled()
        expect(observer.success).toHaveBeenCalled()

    describe "sendToMobile()", ->
      it "should create a new address, create a tx to this address and push it", ->
        pending()
        # data.from = 0
        # MyWallet.setDoubleEncryption(false)
        # spyOn(MyWallet, 'addPrivateKey').and.returnValue(true)
        # spyOn(MyWallet, 'setLegacyAddressTag')
        # spyOn(MyWallet, 'setLegacyAddressLabel')
        #   .and.callFake((adr,lab,success,error) -> success())
        # spyOn(MyWallet, 'backupWallet')
        #   .and.callFake((method,success,error) -> success())
        # spyOn(MyWallet, 'getAndSetUnspentOutputsForAccount')
        #   .and.callThrough()
        # spyOn(hdAccounts[data.from], 'createTx').and.callThrough()

        # MyWallet.sendToMobile data.from
        #                    , data.amount
        #                    , data.fee
        #                    , data.mobile
        #                    , observer.success
        #                    , observer.error
        #                    , observer.listener
        #                    , null 

        # expect(MyWallet.addPrivateKey).toHaveBeenCalled()
        # expect(MyWallet.setLegacyAddressTag).toHaveBeenCalled()
        # address = MyWallet.setLegacyAddressTag.calls.argsFor(0)[0]
        # expect(MyWallet.setLegacyAddressLabel)
        #   .toHaveBeenCalledWith( address 
        #                         ,jasmine.any(String)
        #                         ,jasmine.any(Function)
        #                         ,jasmine.any(Function)
        # )
        # expect(MyWallet.backupWallet)
        #   .toHaveBeenCalledWith( 'update'
        #                         ,jasmine.any(Function)
        #                         ,jasmine.any(Function)
        # )
        # expect(MyWallet.getAndSetUnspentOutputsForAccount).toHaveBeenCalled() 
        # expect(hdAccounts[data.from].createTx)
        #   .toHaveBeenCalledWith(
        #      address
        #     ,data.amount
        #     ,data.fee
        #     ,getUnspendMock.unspent_outputs
        #     ,hdAccounts[data.from].getAccountExtendedKey(true)
        #     ,observer.listener)

        # expect(BlockchainAPI.push_tx)
        #   .toHaveBeenCalledWith(
        #      jasmine.any(Object)
        #     ,null
        #     ,jasmine.any(Function)
        #     ,jasmine.any(Function)
        # )        
  ##############################################################################
  describe "generateNewMiniPrivateKey()", ->
    it "create a well formatted pair of key, miniKey", ->

      spyOn(Bitcoin.ECKey, 'makeRandom')
        .and.callFake(() -> 
          Bitcoin.ECKey.fromWIF "5K59WVEboZDoaQTRGJQtkpquNsd6LBczjES8nDqXAh7p49iy2jf")
      spyOn(MyWallet, 'addPrivateKey').and.returnValue(true)

      expectedWIF = "5JgQTisqR2v6vcsJnP71JF2mnm2nQdtSPk9Dh8jmwXtoytuD6aB"
      keys = MyWallet.generateNewMiniPrivateKey()
      checkMiniKey = SHA256(keys.miniKey + '?', {asBytes: true})[0]

      expect(Bitcoin.ECKey.makeRandom).toHaveBeenCalled()
      expect(MyWallet.addPrivateKey).toHaveBeenCalled()
      expect(checkMiniKey).toBe(0)
      expect(keys.miniKey).toBe('SC8okrRqGVS9B5R7Kssqfp')
      expect(keys.key.toWIF()).toBe(expectedWIF)

  describe "redeemFromEmailOrMobile()", ->
    it "...", ->
      pending()

  describe "importPrivateKey()", ->
    it "...", ->
      pending()