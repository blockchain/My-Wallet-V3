proxyquire = require('proxyquireify')(require)

WalletCrypto = {}
Bitcoin = {}
BlockchainAPI = {}
BIP39 = {}
MyWallet = {wallet: {defaultPbkdf2Iterations: 5000}}

stubs = {
          './wallet-crypto'  : WalletCrypto
        , 'bitcoinjs-lib'    : Bitcoin
        , './blockchain-api' : BlockchainAPI
        , 'bip39'            : BIP39
        , './wallet'         : MyWallet
      }

Signup = proxyquire('../src/wallet-signup', stubs)
BigInteger = require('bigi')

describe "Signup", ->
  beforeEach ->
    spyOn(Signup, "insertWallet").and.callFake(() ->)

  describe "generateNewWallet", ->
    it "should obtain a guid and shared key", ->
      spyOn(BIP39, "mnemonicToSeedHex").and.returnValue("1234abcd")
      spyOn(BIP39, "mnemonicToEntropy").and.returnValue("1234")
      spyOn(WalletCrypto, "seedToMetaDataXpub").and.returnValue("xpub")
      spyOn(WalletCrypto, "xpubToGuid").and.returnValue("")
      spyOn(WalletCrypto, "encryptPasswordWithSeed").and.returnValue("encryptedPassword")
      spyOn(WalletCrypto, "xpubToSharedKey").and.returnValue("sharedkey")
      Signup.generateNewWallet("alice bob wonder land", "a", "password", "info@blockchain.com", "Account name", (()->),(()->), true)
      expect(WalletCrypto.seedToMetaDataXpub).toHaveBeenCalledWith("1234abcd")
      expect(WalletCrypto.xpubToGuid).toHaveBeenCalledWith("xpub")
      expect(BIP39.mnemonicToSeedHex).toHaveBeenCalledWith("alice bob wonder land")
