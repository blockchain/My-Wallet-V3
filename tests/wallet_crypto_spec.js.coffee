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
    # sha256(sha256(seedHex + i))
    # i = 0x00 : GUID
    # i = 0x01 : Shared key
    # etc...
    # Note that v4 of the UUID standard modifies two bits.

    it "should deterministically generate a GUID", ->
      expect(WalletCrypto.seedToKeys(seed).guid).toEqual("0a081b50-c8be-4fe0-8135-f607c4404c78")

    it "should deterministically generate a shared key", ->
      expect(WalletCrypto.seedToKeys(seed).sharedKey).toEqual("1ea92b14-38f1-44e6-b780-69e05b1bd2d0")

    it "should deterministically generate a meta data shared key", ->
      expect(WalletCrypto.seedToKeys(seed).metaDataSharedKey).toEqual("76731873-41dc-409a-b83c-dcba51b8182d")

    it "should deterministically generate a meta data key", ->
      expect(WalletCrypto.seedToKeys(seed).metaDataKey).toEqual("xba1xKmOAZeXqePlnFOQnA==")

  describe "encryptMetaData()", ->
    it "should be the same when decrypted", ->
      key = "YiVGNZY/Wi2bS7LQyCpOSF3FHwWQe/pcsVi4wmPjing="
      data = {hello: "world"}

      encrypted = WalletCrypto.encryptMetaData(data, key)
      expect(encrypted.payload).toBeDefined()

      decrypted = WalletCrypto.decryptMetaData(encrypted, key)
      expect(decrypted).toEqual(data)
