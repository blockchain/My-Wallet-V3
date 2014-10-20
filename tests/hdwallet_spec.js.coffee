describe "HD Wallet", ->
  # beforeEach ->

            
  describe "checkToAddTxToPaymentRequest()", ->
    it "should exist", ->
      account = HDAccount()
      expect(account.checkToAddTxToPaymentRequest).toBeDefined()
      
    it "should mark request as complete if amount matches", ->
      account = HDAccount()
      account.paymentRequests.push {complete: false, address: "addres1", amount: 1, paid: 0, txidList: []}
      
      account.checkToAddTxToPaymentRequest("addres1", "tx1", 1)
      
      request =  account.paymentRequests[0]
      
      expect(request.complete).toBe(true)
      
    return