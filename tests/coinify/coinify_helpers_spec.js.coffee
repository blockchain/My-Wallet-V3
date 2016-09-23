
proxyquire = require('proxyquireify')(require)

stubs = {
}

Helpers = proxyquire('../../src/coinify/helpers', stubs)

describe "CoinifyHelpers", ->
  describe "isNumber", ->
    it "should be true for 1.1", ->
      expect(Helpers.isNumber(1.1)).toBeTruthy()

    it "should be false for 'a'", ->
      expect(Helpers.isNumber('a')).toBeFalsy()

  describe "isInteger", ->
    it "should be true for 1", ->
      expect(Helpers.isInteger(1)).toBeTruthy()

    it "should be true for -1", ->
      expect(Helpers.isInteger(-1)).toBeTruthy()

    it "should be false for 1.1", ->
      expect(Helpers.isInteger(1.1)).toBeFalsy()

    it "should be true for 1.0", ->
      expect(Helpers.isInteger(1.0)).toBeTruthy()

  describe "isPositiveInteger", ->
    it "should be true for 1", ->
      expect(Helpers.isPositiveInteger(1)).toBeTruthy()

    it "should be false for -1", ->
      expect(Helpers.isPositiveInteger(-1)).toBeFalsy()

    it "should be true for 0", ->
      expect(Helpers.isPositiveInteger(1)).toBeTruthy()

  describe "toCents", ->
    it "should multiply by 100", ->
      expect(Helpers.toCents(1.03)).toEqual(103)

  describe "toSatoshi", ->
    it "should multiply by 100,000,000", ->
      expect(Helpers.toSatoshi(0.001)).toEqual(100000)

  describe "fromCents", ->
    it "should divide by 100", ->
      expect(Helpers.fromCents(103)).toEqual(1.03)

  describe "fromSatoshi", ->
    it "should divide by 100,000,000", ->
      expect(Helpers.fromSatoshi(100000)).toEqual(0.001)
