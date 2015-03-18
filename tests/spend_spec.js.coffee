# Spending from a legacy address is tested in legacy_addresses_spec

# sendToAccount
# sendBitcoinsForAccount
  # Make sure a new change address is generated (e.g. not the case 
  # in b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba)

# sendToEmail (pending, because not supported yet)
################################################################################
describe "Spend", ->
  beforeEach ->  

  describe "redeemFromEmailOrMobile()", ->
    it "...", ->
      pending()

  describe "sendBitcoinsForAccount()", ->
    it "...", ->
      pending()

  describe "sendToAccount()", ->
    it "...", ->
      pending()

  describe "sendToEmail()", ->
    it "...", ->
      pending()
  
  describe "generateNewMiniPrivateKey()", ->
    it "...", ->
      pending()

  describe "sendToMobile()", ->
    it "...", ->
      pending()
      
  ##############################################################################
  ## LEGACY ADDRESS TESTS
  describe "Legacy Address", ->

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
          getAccountExtendedKey: () ->
            "xpub6DHN1xpggNEUbWgGJyMPRFGvYm6pizUnv4TQMAtgYBikkh75dyp\
            9Gf9QcKETpWZkLjtB4zYr2eVaHQ4g3rhj46Aeu4FykMWSayrqmRmEMEZ"
          isArchived: () -> false
          getReceivingAddress: () -> "1D4fdALjnmAaRKD3WuaSwV7zSAkofDXddX"
        }
      ]

      spyOn(MyWallet, "getAccounts").and.returnValue(hdAccounts)
      spyOn(MyWallet, "getHDWallet").and.returnValue({
        getAccounts: () -> hdAccounts
        getAccount: (idx) ->  hdAccounts[idx]
      })

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

    describe "importPrivateKey()", ->
      it "...", ->
        pending()

    describe "sweepLegacyAddressToAccount()", ->
      it "...", ->
        pending()
  ##############################################################################
  ## END LEGACY ADDRESS TESTS