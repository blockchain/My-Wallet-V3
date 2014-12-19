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
                  xpub: "xpub6CEhipAhE6UangYAYeQUAAMiVHzhroPZRL9we3X2zzrHPsBLSfUGxkz6gZSJNm5iFV6Mf1x2V6f6APXD6YeK8sc72FYtxYrhHsfopCMLNwy",
                  xpriv: "xprv9yFMKJdoPivHaCThScsTo2QywGADTLfi47ELqf7RSfKJX4rBu8A2QxfcqGjt3kar4RHzZvhpv3UXLQyLuqAcd4X53qpyc6PSBj7LjKftg8f",
                  archived: false,
                  change_addresses: 12,
                  paymentRequests: [{amount: 100, paid: 0, complete: false, index: 0}]
              },
              {
                  label: "Splurge",
                  xpub: "xpub6CEhipAhE6UaqPj9UHEYpjY1o62ZRqeej116R7Q8rVFS1qPz2qP7kdWhMopXvJD5CoUw17aNiX81d8NJ3PAcQz8KDu5CmoJdovnX7bw5KCy",
                  xpriv: "xprv9yFMKJdoPivHcuegNFhYTbbHF4C52NvoMn5VcizXJ9iT934qVJ4sCqCDWYWDcXogg9vvBvCDgpR7NXz2W8VzL6F5Pm6k8dxDzwPCgJ2G1oU",
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

        account = hdwallet.createAccount("Spending", passphraseToPassphraseHexString(passphrase))
        paymentRequest = account.generatePaymentRequest(1)
        address = account.getAddressAtIdx(paymentRequest.index)

      describe "getAccountExtendedPrivKey()", ->
          it "should mark request as completed", ->
              extendedPrivKey = account.getAccountExtendedKey(true);

              expect(extendedPrivKey).toBe("xprv9yd5CkFRNfUXBGf22qxMtvZvBEaSzzUioe7QqeyC1uuTukBWeMvFpzjJUEDswuWby8JmGR84wQHy75djYEAsAktvJa5B2QueQkzuNQiqS1C")

          return

      describe "getAccountExtendedPubKey()", ->
          it "should mark request as completed", ->
              extendedPubKey = account.getAccountExtendedKey(false);

              expect(extendedPubKey).toBe("xpub6CcRcFnKD32pPkjV8sVNG4WejGQwQTCaAs31e3NoaFSSnYWfBuEWNo3nKWVZotgtN1dpoYGwSxUVyVfNrrgE7YwpSrUWsqgK2LdmuGDCBMp")

          return

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

 