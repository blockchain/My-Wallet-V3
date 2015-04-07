# localStorage.clear()

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
    
    # Caching derive() on HDNode protoype doesn't do much good, because fromBase58()
    # for a new object is just as slow as derive() on an existing one.
    
    # The slowness is caused by calls to "new ECKey" and "new ECPubKey", but these
    # can't be mocked because they are internal to the module.
    
    # The solution is to mock HDNode.fromBase58() as well.

    Bitcoin.HDNode.prototype.originalDerive = Bitcoin.HDNode.prototype.derive
    spyOn(Bitcoin.HDNode.prototype, "derive").and.callFake((index) ->
      node = undefined
      cacheKey = "Bitcoin.HDNode.prototype.derive " + this.toBase58() + " " + index
      if base58 = localStorage.getItem(cacheKey)
        start = new Date().getTime();
        
        # Too slow by itself:
        node = Bitcoin.HDNode.fromBase58(base58)
      else
        # start = new Date().getTime();
        node = this.originalDerive(index)
        localStorage.setItem(cacheKey, node.toBase58())
        # console.log('Store time: ' + ((new Date().getTime()) - start));

      node
    )
    
    Bitcoin.HDNode.originalFromBase58 = Bitcoin.HDNode.fromBase58
    
    spyOn(Bitcoin.HDNode, "fromBase58").and.callFake((base58)->
      node = undefined
      
      cacheKey = "Bitcoin.HDNode.fromBase58 " + base58
      
      if hex = localStorage.getItem(cacheKey)
        priv_key_hex = hex.split(" ")[0]
        pub_key_hex = hex.split(" ")[1]

        node = Bitcoin.HDNode.prototype

        node = {
          chainCode: new Buffer(hex.split(" ")[2], "hex")
          privKey: if priv_key_hex is "-" then undefined else {
            d:  BigInteger.fromBuffer(new Buffer(priv_key_hex, "hex"))
          }
          pubKey: if pub_key_hex is "-" then undefined else Bitcoin.ECPubKey.fromHex(pub_key_hex)
          derive: Bitcoin.HDNode.prototype.originalDerive
          toBase58: () -> base58
          depth: 0
          index: 0
          parentFingerprint: 0x00000000
          network:  Bitcoin.networks.bitcoin
          getFingerprint: Bitcoin.HDNode.prototype.getFingerprint
          getIdentifier: Bitcoin.HDNode.prototype.getIdentifier
          deriveHardened: Bitcoin.HDNode.prototype.deriveHardened
          MASTER_SECRET: new Buffer('Bitcoin seed')
          HIGHEST_BIT: 0x80000000
          LENGTH: 78
          
          neutered: Bitcoin.HDNode.prototype.neutered # Slow!
        }
        
        buffer = Browserify.bs58check.decode(base58)
        
        assert.strictEqual(buffer.length, node.LENGTH, 'Invalid buffer length')
        
        # 1 byte: depth: 0x00 for master nodes, 0x01 for level-1 descendants, ...
        depth = buffer.readUInt8(4)

        # 4 bytes: the fingerprint of the parent's key (0x00000000 if master key)
        parentFingerprint = buffer.readUInt32BE(5)
        if depth is 0 
          assert.strictEqual(parentFingerprint, 0x00000000, 'Invalid parent fingerprint')
        

        # 4 bytes: child number. This is the number i in xi = xpar/i, with xi the key being serialized.
        # This is encoded in MSB order. (0x00000000 if master key)
        theIndex = buffer.readUInt32BE(9)
        assert(depth > 0 || theIndex is 0, 'Invalid index')

        # 32 bytes: the chain code
        chainCode = buffer.slice(13, 45)

        node.depth = depth
        node.index = theIndex
        node.parentFingerprint = parentFingerprint
        
        
      else        
        node = Bitcoin.HDNode.originalFromBase58(base58)

        priv_key_hex = if node.privKey? then node.privKey.d.toBuffer().toString('hex') else "-"
        
        pub_key_hex = if node.pubKey? then node.pubKey.toHex() else "-"

        hex = [priv_key_hex, pub_key_hex, node.chainCode.toString('hex')].join(" ")
        
        localStorage.setItem(cacheKey, hex)
      
      node
    )
  
  describe "initializeHDWallet()", ->
    beforeEach ->
      observer =
        success: () ->
        error: () ->
          console.log "error"
      
      spyOn(observer, "success").and.callThrough()
      spyOn(MyWallet, "validateSecondPassword").and.returnValue(true)
      spyOn(MyWallet, "generateHDWalletSeedHex").and.returnValue(seed)
      spyOn(WalletStore, "getPbkdf2Iterations").and.returnValue(10)
      
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
              
          spyOn(WalletStore, "getPbkdf2Iterations").and.returnValue 1        
          

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
        spyOn(WalletStore, "getPbkdf2Iterations").and.returnValue 1        
        
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
        
