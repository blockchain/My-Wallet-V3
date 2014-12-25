describe "HD Wallet", ->
  accountsPayload = undefined
  accountsPayloadSecondPassword = undefined
  
  beforeEach ->
    accountsPayload = decryptedWalletPayload["hd_wallets"][0]["accounts"]
    accountsPayloadSecondPassword = decryptedWalletWithSecondPasswordPayload["hd_wallets"][0]["accounts"]
  
  describe "buildHDWallet()", ->
    
    describe "when opening an existing wallet", ->
      it "should have accounts count be 2", ->
          hdwallet = buildHDWallet(seed, accountsPayload,bip39Password)
          expect(hdwallet.getAccountsCount()).toBe(2)
          
      it "should not require the seed", ->
        hdwallet = buildHDWallet(null, accountsPayload, bip39Password)
        expect(hdwallet.getAccountsCount()).toBe(2)
        
      it "should know the xpub for each account", ->
        pending()
        
      it "should know the xpriv for each account", ->
        pending()
        
      it "should only know the encrypted xpriv for a 2nd password protected account", ->
        pending()      
      
    describe "when generating a new wallet", ->
       it "should have 0 accounts", ->
         hdwallet = buildHDWallet(seed, [], bip39Password)
         expect(hdwallet.getAccountsCount()).toBe(0)

  describe "createAccount()", ->
    account = undefined
    
    beforeEach ->
      hdwallet = buildHDWallet(seed, [], bip39Password)
      account = hdwallet.createAccount("Spending", null)

    describe "getAccountExtendedPrivKey()", ->
        it "should get the xpriv", ->
            extendedPrivKey = account.getAccountExtendedKey(true);

            expect(extendedPrivKey).toBe("xprv9yd5CkFRNfUXBGf22qxMtvZvBEaSzzUioe7QqeyC1uuTukBWeMvFpzjJUEDswuWby8JmGR84wQHy75djYEAsAktvJa5B2QueQkzuNQiqS1C")

        return

    describe "getAccountExtendedPubKey()", ->
        it "should get the xpub", ->
            extendedPubKey = account.getAccountExtendedKey(false);

            expect(extendedPubKey).toBe("xpub6CcRcFnKD32pPkjV8sVNG4WejGQwQTCaAs31e3NoaFSSnYWfBuEWNo3nKWVZotgtN1dpoYGwSxUVyVfNrrgE7YwpSrUWsqgK2LdmuGDCBMp")

        return
        
    describe "when 2nd password is enabled", ->
      it "should ask for it", ->
        pending()
        
      it "should only know the encrypted xpriv", ->
        pending()
        
    describe "when 2nd password is disabled", ->
      it "should not ask for it", ->
        pending()
        