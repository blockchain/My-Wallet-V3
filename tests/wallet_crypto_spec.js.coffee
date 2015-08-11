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

  describe "seedToKeys", ->
    # Mnemonic: trash analyst join silver omit napkin aspect sweet bachelor have know hello
    # 512 bit seed Hex:
    seed =  "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"
    # sha512(sha512(seedHex)) = 0a9c34d88194b5493b50093b3446793853443a6759e9d4b21ebe7ad9ff99409bc7a4da74627891f40f0313c455b4058812c4b11838609178c330b535a51313e4
    # GUID is the first quarter, shared key the second quarter, meta data key the 3rd.
    # Note that v4 of the GUID standard modifies two bits.

    it "should deterministically generate a GUID", ->
      expect(WalletCrypto.seedToKeys(seed).guid).toEqual("0a9c34d8-8194-4549-bb50-093b34467938")

    it "should deterministically generate a shared key", ->
      expect(WalletCrypto.seedToKeys(seed).sharedKey).toEqual("53443a67-59e9-44b2-9ebe-7ad9ff99409b")

    it "should deterministically generate a meta data key", ->
      expect(WalletCrypto.seedToKeys(seed).metaDataKey).toEqual("x6TadGJ4kfQPAxPEVbQFiA==")

  describe "encryptMetaData()", ->
    it "should be the same when decrypted", ->
      key = "YiVGNZY/Wi2bS7LQyCpOSF3FHwWQe/pcsVi4wmPjing="
      data = {hello: "world"}

      encrypted = WalletCrypto.encryptMetaData(data, key)
      expect(encrypted.payload).toBeDefined()

      decrypted = WalletCrypto.decryptMetaData(encrypted, key)
      expect(decrypted).toEqual(data)
