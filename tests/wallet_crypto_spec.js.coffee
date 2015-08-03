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

  describe "seedToUUIDandSharedKey", ->
    # Mnemonic: trash analyst join silver omit napkin aspect sweet bachelor have know hello
    # 512 bit seed Hex:
    seed =  "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"
    # sha256(sha256(seedHex)) = 13d2bf702d11e782bce6df5f9f5ca6f492d8826127617997a3e47cf00df44a5d
    # GUID is the first half, shared key the second half. Note that v4 of the GUID standard modifies two bits.

    it "should deterministically generate a GUID", ->
      expect(WalletCrypto.seedToUUIDandSharedKey(seed).guid).toEqual("13d2bf70-2d11-4782-bce6-df5f9f5ca6f4")

    it "should deterministically generate a shared key", ->
      expect(WalletCrypto.seedToUUIDandSharedKey(seed).sharedKey).toEqual("92d88261-2761-4997-a3e4-7cf00df44a5d")

  describe "encryptMetaData()", ->
    it "should be the same when decrypted", ->
      key = "YiVGNZY/Wi2bS7LQyCpOSF3FHwWQe/pcsVi4wmPjing="
      data = {hello: "world"}

      encrypted = WalletCrypto.encryptMetaData(data, key)
      expect(encrypted.payload).toBeDefined()

      decrypted = WalletCrypto.decryptMetaData(encrypted, key)
      expect(decrypted).toEqual(data)
