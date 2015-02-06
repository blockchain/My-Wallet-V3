describe "HD Wallet", ->
  accountsPayload = undefined
  accountsPayloadSecondPassword = undefined
  hdwallet = undefined
  observer = undefined
  
  beforeEach ->
    accountsPayload = decryptedWalletPayload["hd_wallets"][0]["accounts"]
    accountsPayloadSecondPassword = decryptedWalletWithSecondPasswordPayload["hd_wallets"][0]["accounts"]
    MyWallet.setDoubleEncryption(false)
  
  describe "initializeHDWallet()", ->
    beforeEach ->
      observer = {}
      
      observer.success = () ->
      observer.error = () ->
        console.log "error"
      
      spyOn(observer, "success")
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(MyWallet, "generateHDWalletSeedHex").and.returnValue(seed)
      
    describe "without 2nd password", ->
      beforeEach ->
        MyWallet.setUseBuildHDWalletWebworker(false);
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
        
      it "should ask for it", ->         
        expect(observer.getPassword).toHaveBeenCalled()
        
      it "should succeed", ->
        expect(observer.success).toHaveBeenCalled()
  
  describe "buildHDWallet()", ->
    
    describe "when opening an existing wallet", ->
      beforeEach ->
        hdwallet = buildHDWallet(seed, accountsPayload, bip39Password)
        
      it "should have accounts count be 2", ->
          expect(hdwallet.getAccountsCount()).toBe(2)
          
      it "should not require the seed or bip39Password", ->
        # In practice, you always need to provide a seed, e.g. 0
        fake_seed = 0
        hdwallet = buildHDWallet(fake_seed, accountsPayload, null)
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
        beforeEach ->
          # It might be better to refactor these tests at a higher level
          fake_seed = 0
          hdwallet = buildHDWallet(fake_seed, accountsPayloadSecondPassword, null)
          hdwallet.setSeedHexString(seed_encrypted)
                     
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
         hdwallet = buildHDWallet(seed, [], bip39Password)
         expect(hdwallet.getAccountsCount()).toBe(0)
         

  describe "createAccount()", ->
    account = undefined
    
        
    describe "when 2nd password is disabled", ->
      beforeEach ->
        hdwallet = buildHDWallet(seed, accountsPayload, bip39Password)
        account = hdwallet.createAccount("Mobile", null) # index 2
        
      it "should know the xpub", ->
        extendedPubKey = account.getAccountExtendedKey(false) 
        expect(extendedPubKey).toBe("xpub6CcRcFnKD32pSYsYf97azD7YtChp1CMxFaDnXcoYpjm4YLGBvy4LojWFYsgJxRCyzRysWxSiZ9yiZLdtncB8vhCouoihMW2BZu4T6uyW6ue")
        
      it "should know the xpriv", ->
        extendedPrivateKey = account.getAccountExtendedKey(true)
        expect(extendedPrivateKey).toBe("xprv9yd5CkFRNfUXE4o5Z7aad5ApLAsKbje6tMJBjEPwGQE5fXw3PRk6FwBmhbLDduzdQGmFP3CfhxmLKaYHxHApmrrtkHswj4oL6g37McodpQd")      
      
    describe "when 2nd password is enabled", ->
      beforeEach ->
        fake_seed = 0
        hdwallet = buildHDWallet(fake_seed, accountsPayloadSecondPassword, null)
        hdwallet.setSeedHexString(seed_encrypted)
        account = hdwallet.createAccount("Mobile", second_password) # index 2  
        
      it "should know the xpub", ->
        extendedPubKey = account.getAccountExtendedKey(false)
        expect(extendedPubKey).toBe("xpub6CcRcFnKD32pSYsYf97azD7YtChp1CMxFaDnXcoYpjm4YLGBvy4LojWFYsgJxRCyzRysWxSiZ9yiZLdtncB8vhCouoihMW2BZu4T6uyW6ue")
        
      it "should only know the encrypted xpriv", ->
        # Key encryption is non deterministic, so we check if the decrypted result is correct
        extendedPrivateKey = account.getAccountExtendedKey(true)
        descrypyedExtendedPrivateKey = MyWallet.decryptSecretWithSecondPassword(extendedPrivateKey, second_password)
        expect(descrypyedExtendedPrivateKey).toBe("xprv9yd5CkFRNfUXE4o5Z7aad5ApLAsKbje6tMJBjEPwGQE5fXw3PRk6FwBmhbLDduzdQGmFP3CfhxmLKaYHxHApmrrtkHswj4oL6g37McodpQd")
        
  describe "getHDWalletPassphraseString()", ->
    beforeEach ->
      observer = {}
      
      observer.success = () ->
      observer.error = () ->
        console.log "error"
      
      spyOn(observer, "success")
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
      
      spyOn(MyWallet, "decryptSecretWithSecondPassword").and.callFake((secret, password) -> 
        return seed if secret == seed_encrypted and password == second_password
        return null
      )
      
      observer.getPassword = (callback) ->
        callback(second_password, (()->), (()->))
        
      spyOn(observer, "getPassword").and.callThrough()
      
      MyWallet.getHDWalletPassphraseString(observer.getPassword, observer.success, observer.error)
      
      expect(observer.getPassword).toHaveBeenCalled()
      expect(observer.success).toHaveBeenCalledWith(passphrase)
        
