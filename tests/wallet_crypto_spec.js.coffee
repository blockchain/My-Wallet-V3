proxyquire = require('proxyquireify')(require)
uuid = require('uuid')

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

  describe "seedToMetaDataXpub", ->
    seed = "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"

    it "should generate m / 1'", ->
      # m / 1' xpub:
      xpub = "xpub68fAf6k8L3NNPu2q8ned7C6dwm7aT5Z9Z2FM7WmXHfRHRHdfEm1AoMetYgEovKYZSTMiQeXuayCvqsUDRv6WGZoJv8cTEAgG3spKRLhTCRY"
      expect(WalletCrypto.seedToMetaDataXpub(seed)).toEqual(xpub)

  describe "pubKeyToPseudoAddress", ->
    it "should perform step 2 and 3", ->
      # https://en.bitcoin.it/wiki/Technical_background_of_version_1_Bitcoin_addresses
      pubKey = new Buffer("0450863AD64A87AE8A2FE83C1AF1A8403CB53F53E486D8511DAD8A04887E5B23522CD470243453A299FA9E77237716103ABC11A1DF38855ED6F2EE187E9C582BA6", "hex")

      step3 = "010966776006953d5567439e5e39f86a0d273bee"

      expect(WalletCrypto.pubKeyToPseudoAddress(pubKey).toString("hex")).toEqual(step3)


  describe "metaDataXpubToKeys", ->
    # Mnemonic: trash analyst join silver omit napkin aspect sweet bachelor have know hello
    # 512 bit seed Hex:
    seed =  "8eadcb94ece1db0b056b3b006b21e0e36548eee1a2f9b4572e5c2d764b6e6668060a3230f37c4e910ea7990c3a87553dc835a7a174decd2e0e4f810c8a7bea11"
    # sha256(sha256(seedHex + i))
    # i = 0x00 : GUID
    # i = 0x01 : Shared key
    # etc...
    # Note that v4 of the UUID standard modifies two bits.

    it "should deterministically generate e.g. a GUID", ->

      xpub = "xpub68fAf6k8L3NNPu2q8ned7C6dwm7aT5Z9Z2FM7WmXHfRHRHdfEm1AoMetYgEovKYZSTMiQeXuayCvqsUDRv6WGZoJv8cTEAgG3spKRLhTCRY"

      uuid = uuid.v4({
        random: WalletCrypto.metaDataXpubToKey(xpub, 0, 16)
      })

      expect(uuid).toEqual("2aafd70c-3ef8-493a-96cb-bb379be61448")


  describe "encryptMetaData()", ->
    it "should be the same when decrypted", ->
      key = "YiVGNZY/Wi2bS7LQyCpOSF3FHwWQe/pcsVi4wmPjing="
      data = {hello: "world"}

      encrypted = WalletCrypto.encryptMetaData(data, key)
      expect(encrypted.payload).toBeDefined()

      decrypted = WalletCrypto.decryptMetaData(encrypted, key)
      expect(decrypted).toEqual(data)
