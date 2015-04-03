describe "HD Wallet", ->
  accountsPayload = undefined
  accountsPayloadSecondPassword = undefined
  observer = undefined
  sharedKey = "87654321-4321-4321-4321-ba0987654321"
  
  beforeEach ->    
    spyOn(MyWallet, "getSharedKey").and.returnValue sharedKey
    
    spyOn(MyWallet, "backupWallet").and.callFake () ->
    spyOn(MyWallet, "backupWalletDelayed").and.callFake () ->
    MyWallet.deleteHDWallet()
      
    accountsPayload = decryptedWalletPayload["hd_wallets"][0]["accounts"]
    accountsPayloadSecondPassword = decryptedWalletWithSecondPasswordPayload["hd_wallets"][0]["accounts"]
    MyWallet.setDoubleEncryption(false)
  
  describe "initializeHDWallet()", ->
    beforeEach ->
      observer =
        success: () ->
        error: () ->
          console.log "error"
      
      spyOn(observer, "success").and.callThrough()
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(MyWallet, "generateHDWalletSeedHex").and.returnValue(seed)
      
    describe "without 2nd password", ->
      beforeEach ->
        MyWallet.initializeHDWallet(null, null, null, observer.success, observer.error)

      it "should succeed", ->
        expect(observer.success).toHaveBeenCalled()

    describe "with a second password", ->
      beforeEach ->

        MyWallet.setDoubleEncryption(true)
        observer.getPassword = (callback) ->
          callback(second_password, (()->), (()->))
        spyOn(observer, "getPassword").and.callThrough()

        MyWallet.initializeHDWallet(null, null, observer.getPassword, observer.success, observer.error)

        # Not sure why this gets called:
        MyWallet.backupWallet = () ->
        MyWallet.backupWalletDelayed = () ->


      it "should ask for it", ->
        expect(observer.getPassword).toHaveBeenCalled()

      it "should succeed", ->
        expect(observer.success).toHaveBeenCalled()

  describe "buildHDWallet()", ->

    describe "when opening an existing wallet", ->

      describe "normally", ->
        hdwallet = undefined

        beforeEach ->
          observer =
            success: (hdWallet) ->
              hdwallet = hdWallet
            error: () ->
              console.log "error"

          spyOn(observer, "success").and.callThrough()
          spyOn(observer, "error")

          buildHDWallet(seed, accountsPayload, bip39Password, null, observer.success, observer.error)

        it "should succeed", ->
          expect(observer.success).toHaveBeenCalled()
          expect(observer.error).not.toHaveBeenCalled()

        it "should have accounts count be 2", ->
            expect(hdwallet.getAccountsCount()).toBe(2)

        it "should not require the seed or bip39Password", ->
          # In practice, you always need to provide a seed, e.g. 0
          fake_seed = 0

          buildHDWallet(fake_seed, accountsPayload, null, ((hdWallet) -> hdwallet = hdWallet))
          expect(hdwallet.getAccountsCount()).toBe(2)

        it "should know the xpub for each account", ->
          # The XPUB is loaded from the JSON payload, not calculated.
          extendedPubKey = hdwallet.getAccounts()[0].getAccountExtendedKey(false)
          expect(extendedPubKey).toBe(xpubAccountZero)

        it "should know the xpriv for each account", ->
           # The XPRIV is loaded from the JSON payload, not calculated.
          extendedPrivateKey = hdwallet.getAccounts()[0].getAccountExtendedKey(true)
          expect(extendedPrivateKey).toBe(xprivAccountZero)

      describe "2nd password protected account", ->
        hdwallet = undefined
        observer = undefined

        beforeEach ->
          # It might be better to refactor these tests at a higher level
          fake_seed = 0

          observer =
            success: (hdWallet) ->
              hdwallet = hdWallet
              hdwallet.setSeedHexString(seed_encrypted)
              
          spyOn(MyWallet, "getPbkdf2Iterations").and.returnValue 1        
          

          spyOn(observer, "success").and.callThrough()

          buildHDWallet(fake_seed, accountsPayloadSecondPassword, null, null, observer.success)

        it "should load", ->
          expect(observer.success).toHaveBeenCalled()

        it "should only know the encrypted xpriv", ->
          extendedPrivateKey = hdwallet.getAccounts()[0].getAccountExtendedKey(true)
          expect(extendedPrivateKey).toBe(decryptedWalletWithSecondPasswordPayload["hd_wallets"][0]["accounts"][0]["xpriv"])

        it "should only know the encrypted seed hex", ->
          expect(hdwallet.getSeedHexString()).toBe(seed_encrypted)

        it "decrypting the seed should work", ->
          decrypted_seed = hdwallet.getSeedHexString(second_password)
          expect(decrypted_seed).toBe(seed)

    describe "when generating a new wallet", ->
       it "should have 0 accounts", ->
         observer =
           success: (hdwallet) ->
             expect(hdwallet.getAccountsCount()).toBe(0)

         spyOn(observer, "success").and.callThrough()

         buildHDWallet(seed, [], bip39Password, null, observer.success)

         expect(observer.success).toHaveBeenCalled()


  describe "createAccount()", ->
    account = undefined


    describe "when 2nd password is disabled", ->
      hdwallet = undefined
      beforeEach ->
        buildHDWallet(seed, accountsPayload, bip39Password, null, ((hdWallet) -> hdwallet = hdWallet))
        account = hdwallet.createAccount("Mobile", null) # index 2

      it "should know the xpub", ->
        extendedPubKey = account.getAccountExtendedKey(false)
        expect(extendedPubKey).toBe("xpub6CcRcFnKD32pSYsYf97azD7YtChp1CMxFaDnXcoYpjm4YLGBvy4LojWFYsgJxRCyzRysWxSiZ9yiZLdtncB8vhCouoihMW2BZu4T6uyW6ue")

      it "should know the xpriv", ->
        extendedPrivateKey = account.getAccountExtendedKey(true)
        expect(extendedPrivateKey).toBe("xprv9yd5CkFRNfUXE4o5Z7aad5ApLAsKbje6tMJBjEPwGQE5fXw3PRk6FwBmhbLDduzdQGmFP3CfhxmLKaYHxHApmrrtkHswj4oL6g37McodpQd")
      
    describe "when 2nd password is enabled", ->
        
      account = undefined
      
      beforeEach ->
        spyOn(MyWallet, "getPbkdf2Iterations").and.returnValue 1        
        
        fake_seed = "00000000000000000000000000000000"
        
        observer =  
          success: (hdwallet) ->
            hdwallet.setSeedHexString(seed_encrypted)
            account = hdwallet.createAccount("Mobile", second_password)
            
        spyOn(observer, "success").and.callThrough()
                
        buildHDWallet(fake_seed, accountsPayloadSecondPassword, null, second_password, observer.success, (error) -> console.log("Error:"); console.log(error))

      it "should load", ->
        expect(observer.success).toHaveBeenCalled()
        
      it "should know the xpub", ->
        extendedPubKey = account.getAccountExtendedKey(false)
        expect(extendedPubKey).toBe("xpub6CcRcFnKD32pSYsYf97azD7YtChp1CMxFaDnXcoYpjm4YLGBvy4LojWFYsgJxRCyzRysWxSiZ9yiZLdtncB8vhCouoihMW2BZu4T6uyW6ue")
        
      it "should only know the encrypted xpriv", ->
        
        # Key encryption is non deterministic, so we check if the decrypted result is correct
        extendedPrivateKey = account.getAccountExtendedKey(true)
        
        # console.log(WalletCrypto.encryptSecretWithSecondPassword("xprv9yd5CkFRNfUXE4o5Z7aad5ApLAsKbje6tMJBjEPwGQE5fXw3PRk6FwBmhbLDduzdQGmFP3CfhxmLKaYHxHApmrrtkHswj4oL6g37McodpQd", second_password, sharedKey, 1))
        
        decryptedExtendedPrivateKey = WalletCrypto.decryptSecretWithSecondPassword(extendedPrivateKey, second_password, sharedKey, 1)
        expect(decryptedExtendedPrivateKey).toBe("xprv9yd5CkFRNfUXE4o5Z7aad5ApLAsKbje6tMJBjEPwGQE5fXw3PRk6FwBmhbLDduzdQGmFP3CfhxmLKaYHxHApmrrtkHswj4oL6g37McodpQd")

  describe "getHDWalletPassphraseString()", ->
    beforeEach ->
      observer = {}

      observer.success = () ->
      observer.error = () ->
        console.log "error"

      spyOn(observer, "success").and.callThrough()
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(MyWallet, "getHDWallet").and.returnValue({
        getSeedHexString: (()-> if MyWallet.getDoubleEncryption() then seed_encrypted else seed)
        getPassphraseString: ((hex) -> if hex is seed then passphrase else "wrong")
      })

    it "should provide the passphrase", ->
      MyWallet.getHDWalletPassphraseString(null, observer.success, observer.error)
      expect(observer.success).toHaveBeenCalledWith(passphrase)

    it "should ask for 2nd password and then provide the passphrase", ->
      MyWallet.setDoubleEncryption(true)

      spyOn(WalletCrypto, "decryptSecretWithSecondPassword").and.callFake((secret, password, shared_key, iterations) ->
        return seed if secret == seed_encrypted and password == second_password and (shared_key == undefined || shared_key == sharedKey)
        return null
      )

      observer.getPassword = (callback) ->
        callback(second_password, (()->), (()->))

      spyOn(observer, "getPassword").and.callThrough()

      MyWallet.getHDWalletPassphraseString(observer.getPassword, observer.success, observer.error)

      expect(observer.getPassword).toHaveBeenCalled()
      expect(observer.success).toHaveBeenCalledWith(passphrase)
        
