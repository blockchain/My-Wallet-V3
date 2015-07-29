proxyquire = require('proxyquireify')(require)

WalletCrypto = {}
Bitcoin = {}
BlockchainAPI = {}

stubs = {
          './wallet-crypto'  : WalletCrypto
        , 'bitcoinjs-lib'    : Bitcoin
        , './blockchain-api' : BlockchainAPI
      }

Signup = proxyquire('../src/wallet-signup', stubs)
BigInteger = require('bigi')

describe "Signup", ->
  beforeEach ->
    spyOn(Signup, "insertWallet").and.callFake(() ->)
    
  describe "generateNewWallet", ->
    it "should obtain a guid and shared key", ->
      spyOn(Signup, "generateUUIDandSharedKey").and.returnValue({guid: "", sharedKey: ""})
      Signup.generateNewWallet("a", "password", "info@blockchain.com", "Account name", (()->),(()->))
      expect(Signup.generateUUIDandSharedKey).toHaveBeenCalled()
    
  describe "generateUUIDandSharedKey", ->
    # Mnemonic: trash analyst join silver omit napkin aspect sweet bachelor have know hello 
    # 512 bit seed Hex:
    seed =  "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"
    # sha256(sha256(seedHex)) = 13d2bf702d11e782bce6df5f9f5ca6f492d8826127617997a3e47cf00df44a5d
    # GUID is the first half, shared key the second half. Note that v4 of the GUID standard modifies two bits.
    
    it "should deterministically generate a GUID", ->
      expect(Signup.generateUUIDandSharedKey(seed).guid).toEqual("13d2bf70-2d11-4782-bce6-df5f9f5ca6f4")
      
    it "should deterministically generate a shared key", ->
      expect(Signup.generateUUIDandSharedKey(seed).sharedKey).toEqual("92d88261-2761-4997-a3e4-7cf00df44a5d")