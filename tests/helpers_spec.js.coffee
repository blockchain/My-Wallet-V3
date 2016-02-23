proxyquire = require('proxyquireify')(require)

describe "Helpers", ->

  Helpers = proxyquire('../src/helpers', {
  })

  describe "getHostName", ->
    it "should be localhost in Jasmine", ->
      expect(Helpers.getHostName()).toEqual("localhost")

  describe "TOR", ->
    it "should be detected based on window.location", ->
      # hostname is "localhost" in test:
      expect(Helpers.tor()).toBeFalsy()

      spyOn(Helpers, "getHostName").and.returnValue "blockchainbdgpzk.onion"
      expect(Helpers.tor()).toBeTruthy()

    it "should not detect false positives", ->
      spyOn(Helpers, "getHostName").and.returnValue "the.onion.org"
      expect(Helpers.tor()).toBeFalsy()


  describe "isBitcoinAddress", ->
    it "should recognize valid addresses", ->
      expect(Helpers.isBitcoinAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb")).toBeTruthy()

    it "should not recognize bad addresses", ->
      expect(Helpers.isBitcoinAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEa")).toBeFalsy()
      expect(Helpers.isBitcoinAddress("5KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb")).toBeFalsy()
      expect(Helpers.isBitcoinAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv")).toBeFalsy()

  describe "isBitcoinPrivateKey", ->
    it "should recognize valid private keys", ->
      expect(Helpers.isBitcoinPrivateKey("5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")).toBeTruthy()

    it "should not recognize private keys with a bad header", ->
      expect(Helpers.isBitcoinPrivateKey("4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")).toBeFalsy()

    it "should not recognize private keys with a bad checksum", ->
      expect(Helpers.isBitcoinPrivateKey("4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gw")).toBeFalsy()

    it "should not recognize private keys with a bad length", ->
      expect(Helpers.isBitcoinPrivateKey("5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUC")).toBeFalsy()

  describe "isPositiveInteger", ->
    it "should include 1", ->
      expect(Helpers.isPositiveInteger(1)).toBe(true)

    it "should include 0", ->
      expect(Helpers.isPositiveInteger(0)).toBe(true)

    it "should exclude -1", ->
      expect(Helpers.isPositiveInteger(-1)).toBe(false)

    it "should exclude 1.1", ->
      expect(Helpers.isPositiveInteger(1.1)).toBe(false)

  describe "isPositiveNumber", ->
    it "should include 1", ->
      expect(Helpers.isPositiveNumber(1)).toBe(true)

    it "should include 0", ->
      expect(Helpers.isPositiveNumber(0)).toBe(true)

    it "should exclude -1", ->
      expect(Helpers.isPositiveNumber(-1)).toBe(false)

    it "should include 1.1", ->
      expect(Helpers.isPositiveNumber(1.1)).toBe(true)
