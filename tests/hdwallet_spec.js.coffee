describe "HD Wallet", ->
    # beforeEach ->


    describe "generatePaymentRequest()", ->
        it "should have payment request array length be 1", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")
            paymentRequest = account.generatePaymentRequest(1)

            expect(account.paymentRequests.length).toBe(1)

        it "should have reused canceled payment request", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")
            paymentRequest = account.generatePaymentRequest(1)
            address = account.getAddressAtIdx(paymentRequest.index)
            account.cancelPaymentRequest(address)

            paymentRequest2 = account.generatePaymentRequest(2)

            expect(account.paymentRequests.length).toBe(1)
            expect(account.paymentRequests[paymentRequest2.index].amount).toBe(2)

        return


    describe "updatePaymentRequest()", ->
        it "should have amount change to 2", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")
            paymentRequest = account.generatePaymentRequest(1)
            address = account.getAddressAtIdx(paymentRequest.index)
            account.updatePaymentRequest(address, 2)

            paymentRequest2 = account.paymentRequests[paymentRequest.index]

            expect(paymentRequest2.amount).toBe(2)

        return


    describe "cancelPaymentRequest()", ->
        it "should mark request as canceled", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")
            paymentRequest = account.generatePaymentRequest(1)
            address = account.getAddressAtIdx(paymentRequest.index)
            account.cancelPaymentRequest(address)

            paymentRequest2 = account.paymentRequests[paymentRequest.index]

            expect(paymentRequest2.canceled).toBe(true)

        return


    describe "checkToAddTxToPaymentRequest()", ->
        it "should exist", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")

            expect(account.checkToAddTxToPaymentRequest).toBeDefined()

        it "should mark request as complete if amount matches", ->
            passphrase = "add imitate business carbon city orbit spray boss ribbon deposit bachelor sustain"
            hdwallet = buildHDWallet(passphraseToPassphraseHexString(passphrase), [])

            account = hdwallet.createAccount("Spending")

            paymentRequest = account.generatePaymentRequest(1)
            address = account.getAddressAtIdx(paymentRequest.index)

            account.checkToAddTxToPaymentRequest(address, "tx1", 1, false)

            request =  account.paymentRequests[0]

            expect(request.complete).toBe(true)

        return