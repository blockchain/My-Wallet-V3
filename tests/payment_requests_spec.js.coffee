describe "Payment request", ->
  account = undefined
  address = undefined
  paymentRequest = undefined
    
  beforeEach ->
    hdwallet = buildHDWallet(seed, decryptedWalletPayload["hd_wallets"][0]["accounts"], bip39Password)
    account = hdwallet.getAccounts()[1] # Mockt account 0 has an existing request.
    paymentRequest = account.generatePaymentRequest(1)
    address = account.getAddressAtIdx(paymentRequest.index)

  describe "generatePaymentRequest()", ->
    it "should have payment request array length be 1", ->
      expect(account.paymentRequests.length).toBe(1)

    it "should have reused canceled payment request", ->
      account.cancelPaymentRequest(address)

      paymentRequest2 = account.generatePaymentRequest(2)

      expect(account.paymentRequests.length).toBe(1)
      expect(account.paymentRequests[paymentRequest2.index].amount).toBe(2)

    return

  describe "acceptPaymentRequest()", ->
    it "should mark request as completed", ->
      account.acceptPaymentRequest(address)

      paymentRequest2 = account.paymentRequests[paymentRequest.index]

      expect(paymentRequest2.complete).toBe(true)

    return


  describe "updatePaymentRequest()", ->
      it "should have amount change to 2", ->
          account.updatePaymentRequest(address, 2)

          paymentRequest2 = account.paymentRequests[paymentRequest.index]

          expect(paymentRequest2.amount).toBe(2)

      return


  describe "cancelPaymentRequest()", ->
      it "should mark request as canceled", ->
          account.cancelPaymentRequest(address)

          paymentRequest2 = account.paymentRequests[paymentRequest.index]

          expect(paymentRequest2.label == "" && paymentRequest2.amount == 0).toBe(true)

      return


  describe "checkToAddTxToPaymentRequest()", ->
      it "should exist", ->
          expect(account.checkToAddTxToPaymentRequest).toBeDefined()

      it "should mark request as complete if amount matches", ->
          account.checkToAddTxToPaymentRequest(address, "tx1", 1, false)

          request =  account.paymentRequests[0]

          expect(request.complete).toBe(true)

      return

 