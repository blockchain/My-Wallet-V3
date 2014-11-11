describe "HD Wallet", ->
  passphrase = undefined
  
  beforeEach ->
    passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
  describe "buildHDWallet()", ->
    
      it "should have accounts count be 2", ->
          bip39Password = "bip39Password"
          accountsArrayPayload = [
              {
                  label: "Savings",
                  archived: false,
                  change_addresses: 12,
                  paymentRequests: [{amount: 100, paid: 0, canceled: false, complete: false, index: 0}]
              },
              {
                  label: "Splurge",
                  archived: false,
                  change_addresses: 2,
                  paymentRequests: []
              }
          ]

          hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), accountsArrayPayload, bip39Password)

          expect(hdwallet.getAccountsCount()).toBe(2)

      return
      
    describe "paymentRequest", ->
      hdwallet = undefined
      account = undefined
      paymentRequest = undefined
      address = undefined
      
      beforeEach ->
        hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

        account = hdwallet.createAccount("Spending")
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

              expect(paymentRequest2.canceled).toBe(true)

          return


      describe "checkToAddTxToPaymentRequest()", ->
          it "should exist", ->
              expect(account.checkToAddTxToPaymentRequest).toBeDefined()

          it "should mark request as complete if amount matches", ->
              account.checkToAddTxToPaymentRequest(address, "tx1", 1, false)

              request =  account.paymentRequests[0]

              expect(request.complete).toBe(true)

          return

 