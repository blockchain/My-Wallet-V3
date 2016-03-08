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
      expect(Helpers.isBitcoinAddress("3A1KUd5H4hBEHk4bZB4C3hGgvuXuVX7p7t")).toBeTruthy()

    it "should not recognize bad addresses", ->
      expect(Helpers.isBitcoinAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEa")).toBeFalsy()
      expect(Helpers.isBitcoinAddress("5KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb")).toBeFalsy()
      expect(Helpers.isBitcoinAddress("1KM7w12SkjzJ1FYV2g1UCMzHjv")).toBeFalsy()

  describe "isAlphaNum", ->
    it "should recognize alphanumerical strings", ->
      expect(Helpers.isAlphaNum("a,sdfw-g4+ 234e1.1_")).toBeTruthy()

    it "should not recognize non alphanumerical strings", ->
      expect(Helpers.isAlphaNum("")).toBeFalsy()
      expect(Helpers.isAlphaNum(122342)).toBeFalsy()
      expect(Helpers.isAlphaNum({'a': 1})).toBeFalsy()

  describe "isSeedHex", ->
    it "should recognize seed hex", ->
      expect(Helpers.isAlphaNum("0123456789abcdef0123456789abcdef")).toBeTruthy()

    it "should not recognize non valid seed hex", ->
      expect(Helpers.isSeedHex("")).toBeFalsy()
      expect(Helpers.isSeedHex(122342)).toBeFalsy()
      expect(Helpers.isSeedHex({'a': 1})).toBeFalsy()
      expect(Helpers.isSeedHex("4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")).toBeFalsy()

  describe "and", ->
    it "should work", ->
      expect(Helpers.and(0, 1)).toBeFalsy()
      expect(Helpers.and(1, 0)).toBeFalsy()
      expect(Helpers.and(1, 1)).toBeTruthy()
      expect(Helpers.and(0, 0)).toBeFalsy()

  describe "or", ->
    it "should work", ->
      expect(Helpers.or(0, 1)).toBeTruthy()
      expect(Helpers.or(1, 0)).toBeTruthy()
      expect(Helpers.or(1, 1)).toBeTruthy()
      expect(Helpers.or(0, 0)).toBeFalsy()

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

  describe "scorePassword", ->
    it "should give a good score to strong passwords", ->
      expect(Helpers.scorePassword('u*3Fq1D&qvq3Qy6045^NcDJhD0TODs') > 60).toBeTruthy()
      expect(Helpers.scorePassword('&T3m#ABtzlJCH0Nv!QQ4') > 60).toBeTruthy()
      expect(Helpers.scorePassword('I!&JrqDszO') > 60).toBeTruthy()

    it "should give a low score to weak passwords", ->
      expect(Helpers.scorePassword('correctbattery') < 20).toBeTruthy()
      expect(Helpers.scorePassword('123456123456123456') < 20).toBeTruthy()
      expect(Helpers.scorePassword('') == 0).toBeTruthy()

    it "should set a score of 0 to non strings", ->
      expect(Helpers.scorePassword(0) == 0).toBeTruthy()

  describe "asyncOnce", ->

    it "should only execute once", (done) ->
      observer =
        func: () ->
        before: () ->

      spyOn(observer, "func")
      spyOn(observer, "before")

      async = Helpers.asyncOnce(observer.func, 20, observer.before)

      async()
      async()
      async()
      async()

      result = () ->
        expect(observer.func).toHaveBeenCalledTimes(1)
        expect(observer.before).toHaveBeenCalledTimes(4)

        done()

      setTimeout(result, 1000)

    it "should work with arguments", (done) ->
      observer =
        func: () ->
        before: () ->

      spyOn(observer, "func")
      spyOn(observer, "before")

      async = Helpers.asyncOnce(observer.func, 20, observer.before)

      async(1)
      async(1)
      async(1)
      async(1)

      result = () ->
        expect(observer.func).toHaveBeenCalledTimes(1)
        expect(observer.func).toHaveBeenCalledWith(1)
        expect(observer.before).toHaveBeenCalledTimes(4)

        done()

      setTimeout(result, 1000)


  describe "guessFee", ->
    # TODO make these tests pass
    #    it "should not compute fee for null input", ->
    #      expect(Helpers.guessFee(1, 1, null)).toBe(NaN)
    #      expect(Helpers.guessFee(null, 1, 10000)).toBe(NaN)
    #      expect(Helpers.guessFee(1, null, 10000)).toBe(NaN)

    #it 'should not return a fee when using negative values', ->
    #  expect(Helpers.guessFee(-1, 1, 10000)).toEqual(NaN)
    #  expect(Helpers.guessFee(1, -1, 10000)).toEqual(NaN)
    #  expect(Helpers.guessFee(1, 1, -10000)).toEqual(NaN)

    #it 'should not return a fee when using non integer values', ->
    #  expect(Helpers.guessFee(1.5, 1, 10000)).toEqual(NaN)
    #  expect(Helpers.guessFee(1, 1.2, 10000)).toEqual(NaN)

    # (148 * input + 34 * outputs + 10) * fee per kb (10 = overhead)
    describe "standard formula", ->
      it 'should work for 1 input, 1 output and 10000 fee per kB', ->
        expect(Helpers.guessFee(1,1,10000)).toEqual(1920)

      it 'should work for 1 input, 2 output and 10000 fee per kB', ->
        expect(Helpers.guessFee(1,2,10000)).toEqual(2260)

      it 'should round up for 2 input, 1 output and 10000 fee per kB', ->
        expect(Helpers.guessFee(2,1,10000)).toEqual(3401)

      it 'should work for 1 input, 1 output and 15000 fee per kB', ->
        expect(Helpers.guessFee(1,1,15000)).toEqual(2880)


  describe "guessSize", ->
    # TODO make these tests pass
    #    it "should not compute size for null input", ->
    #      expect(Helpers.guessSize(1, 1)).toBe(NaN)
    #      expect(Helpers.guessSize(null, 1)).toBe(NaN)
    #      expect(Helpers.guessSize(1, null)).toBe(NaN)

    #it 'should not return a fee when using negative values', ->
    #  expect(Helpers.guessSize(-1, 1)).toEqual(NaN)
    #  expect(Helpers.guessSize(1, -1)).toEqual(NaN)
    #  expect(Helpers.guessSize(1, 1)).toEqual(NaN)

    #it 'should not return a fee when using non integer values', ->
    #  expect(Helpers.guessSize(1.5, 1)).toEqual(NaN)
    #  expect(Helpers.guessSize(1, 1.2)).toEqual(NaN)

    # (148 * input + 34 * outputs + 10) (10 = overhead)
    describe "standard formula", ->
      it 'should work for 1 input, 1 output', ->
        expect(Helpers.guessSize(1,1)).toEqual(192)

      it 'should work for 1 input, 2 output', ->
        expect(Helpers.guessSize(1,2,10000)).toEqual(226)

      it 'should work for 2 input, 1 output', ->
        expect(Helpers.guessSize(2,1,10000)).toEqual(340)

