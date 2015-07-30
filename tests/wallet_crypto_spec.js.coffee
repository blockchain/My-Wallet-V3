proxyquire = require('proxyquireify')(require)

WalletCrypto = proxyquire('../src/wallet-crypto', {})

describe "WalletCrypto", ->
        
  beforeEach ->    
    
  describe "encryptPasswordWithSeed()", ->
    
    it "can be decrypted", ->
      seed = "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"
      encrypted = WalletCrypto.encryptPasswordWithSeed(
        "1234", 
        seed, 
        1
      )
      
      decrypted =  WalletCrypto.decryptPasswordWithSeed(
        encrypted,
        seed, 
        1
      )
    
      expect(decrypted).toEqual("1234")