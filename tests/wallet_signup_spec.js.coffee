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
      spyOn(WalletCrypto, "seedToUUIDandSharedKey").and.returnValue({guid: "", sharedKey: ""})
      Signup.generateNewWallet("a", "password", "info@blockchain.com", "Account name", (()->),(()->))
      expect(WalletCrypto.seedToUUIDandSharedKey).toHaveBeenCalled()