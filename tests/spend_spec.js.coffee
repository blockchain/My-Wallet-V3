# Spending from a legacy address is tested in legacy_addresses_spec

# sendToAccount
# sendBitcoinsForAccount
  # Make sure a new change address is generated (e.g. not the case in b0cf5a859187e9c0cd7f7836fac88ade98713021eb2c3bcb92d677ac4a2a45ba)

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

  describe "sendToMobile()", ->
    it "...", ->
      pending()
      
  ##############################################################################
  ## LEGACY ADDRESS TESTS
  describe "importPrivateKey()", ->
    it "...", ->
      pending()

  describe "sendFromLegacyAddressToAccount()", ->
    it "...", ->
      pending()

  describe "sweepLegacyAddressToAccount()", ->
    it "...", ->
      pending()

  describe "sendFromLegacyAddressToAddress()", ->
    it "...", ->
      # observer = 
      #   correct_password: () ->
      #     console.log("Correct password!")
      #   wrong_password: () ->
      #     console.log("Wrong password!")
      
      # spyOn(observer, "correct_password")
      # spyOn(observer, "wrong_password")
      mockedObj =
              to_addresses : []
              fee : BigInteger.ZERO
              base_fee : BigInteger.valueOf(10000)
              ready_to_send_header : 'Transaction Ready to Send.'
              addListener: () -> return 
              start: () -> return
              
      observer = 
        success: () -> return 
        error: () -> return
        listener: () -> return
        getPassword: () -> return

      spyOn(observer, 'success')
      spyOn(observer, 'error')
      spyOn(observer, 'listener')
      spyOn(observer, 'getPassword')
      spyOn(mockedObj, 'addListener')
      spyOn(mockedObj, 'start')
      spyOn(Signer, "initNewTx").and.callFake(()-> return mockedObj)

      from   = "1Q5pU54M3ombtrGEGpAheWQtcX2DZ3CdqF"
      to     = "1gvtg5mEEpTNVYDtEx6n4J7oyVpZGU13h"
      amount = 600000
      fee    = 15000
      note   = "That is an expensive toy"

      MyWallet.setDoubleEncryption(false) 
      MyWallet.sendFromLegacyAddressToAddress( from
                                             , to
                                             , amount
                                             , fee
                                             , note
                                             , observer.success
                                             , observer.error
                                             , observer.listener
                                             , observer.getPassword
      )

      expect(Signer.initNewTx).toHaveBeenCalled()
      expect(BigInteger.valueOf(15000).equals(mockedObj.fee)).toBe(true)
      expect([from]).toEqual(mockedObj.from_addresses)
      expect(note).toBe(mockedObj.note)
      # expect([to]).toEqual(mockedObj.to_addresses)   
      expect(mockedObj.start).toHaveBeenCalled()
      # pending()
