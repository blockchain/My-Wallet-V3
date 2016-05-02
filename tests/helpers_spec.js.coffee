proxyquire = require('proxyquireify')(require)
Bitcoin = require('bitcoinjs-lib')
BigInteger = require('bigi');

ImportExport =
  shouldResolve: false
  shouldReject: false
  shouldFail: true

  parseBIP38toECPair: (b58, pass, succ, wrong, error) ->
    if ImportExport.shouldResolve
      succ(new Bitcoin.ECPair(new BigInteger.fromByteArrayUnsigned(BigInteger.fromBuffer(new Buffer('E9873D79C6D87DC0FB6A5778633389F4453213303DA61F20BD67FC233AA33262', 'hex')).toByteArray()), null,  {compressed: true}))
    else if ImportExport.shouldReject
      wrong()
    else if ImportExport.shouldFail
      error()

describe "Helpers", ->

  Helpers = proxyquire('../src/helpers', {
    './import-export': ImportExport
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

  describe "isValidBIP39Mnemonic", ->

    it "should recognize BIP-39 test vectors", ->
      expect(Helpers.isValidBIP39Mnemonic("letter advice cage absurd amount doctor acoustic avoid letter advice cage above")).toBeTruthy()
      expect(Helpers.isValidBIP39Mnemonic("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about")).toBeTruthy()
      expect(Helpers.isValidBIP39Mnemonic("vessel ladder alter error federal sibling chat ability sun glass valve picture")).toBeTruthy()
      expect(Helpers.isValidBIP39Mnemonic("cat swing flag economy stadium alone churn speed unique patch report train")).toBeTruthy()

    it "should not recognize invalid mnemonics", ->
      expect(Helpers.isValidBIP39Mnemonic("letter advice cage absurd amount doctor acoustic avoid lettre advice cage above")).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic("abandon abandn abandon abandon abandon abandon abandon abandon abandon abandon abandon about")).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic("vessel ladder alter error federal sibling chat ability sun glass valves picture")).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic("cat swing flag economy stadum alone churn speed unique patch report train")).toBeFalsy()

    it "should not recognize things that aren't mnemonics", ->
      expect(Helpers.isValidBIP39Mnemonic("")).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic("a")).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic(0)).toBeFalsy()
      expect(Helpers.isValidBIP39Mnemonic({ 'mnemonic': "cat swing flag economy stadium alone churn speed unique patch report train" })).toBeFalsy()

  describe "detectPrivateKeyFormat", ->
    it "should reject invalid formats", ->
      res = Helpers.detectPrivateKeyFormat("46c56bnXQiBjk9mqSYE7ykVQ7NzrRy")
      expect(res).toBeNull()

    it "should recognise sipa", ->
      res = Helpers.detectPrivateKeyFormat("5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")
      expect(res).toEqual("sipa")

  describe "privateKeyStringToKey", ->
    it "should convert sipa format", ->
      res = Helpers.privateKeyStringToKey("5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn", "sipa")
      expect(Helpers.isKey(res)).toBeTruthy()


  describe "privateKeyCorrespondsToAddress", ->

    afterEach ->
      ImportExport.shouldResolve = false
      ImportExport.shouldReject = false
      ImportExport.shouldFail = false

    it "should not recognize invalid formats", (done) ->
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', "46c56bnXQiBjk9mqSYE7ykVQ7NzrRy")
      expect(promise).toBeRejected(done)

    it "should not match base58 private keys to wrong addresses", (done) ->
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', "5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")
      promise.then((data) ->
        expect(data).toEqual(null)
        done()
      ).catch((e) ->
        console.log(e)
        assert(false)
        done()
      )

    it "should not match mini private keys to wrong addresses", (done) ->
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', "S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy")
      promise.then((data) ->
        expect(data).toEqual(null)
        done()
      ).catch((e) ->
        console.log(e)
        assert(false)
        done()
      )

    it "should not recognize BIP-38 addresses without password", (done) ->
      ImportExport.shouldResolve = true
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg")
      expect(promise).toBeRejected(done)

    it "should not recognize BIP-38 addresses with an empty password", (done) ->
      ImportExport.shouldResolve = true
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg", "")
      expect(promise).toBeRejected(done)

    it "should not recognize BIP-38 addresses with a bad password", (done) ->
      ImportExport.shouldReject = true
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg", "pass")
      expect(promise).toBeRejected(done)

    it "should not recognize BIP-38 addresses when decryption fails", (done) ->
      ImportExport.shouldFail = true
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg", "pass")
      expect(promise).toBeRejected(done)

    it "should recognize BIP-38 addresses when decryption succeeds", (done) ->
      ImportExport.shouldResolve = true
      promise = Helpers.privateKeyCorrespondsToAddress('19GuvDvMMUZ8vq84wT79fvnvhMd5MnfTkR', "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg", "pass")
      promise.then((data) ->
        expect(data).not.toEqual(null)
        done()
      )

    it "should match base58 private keys to their right addresses", (done) ->
      promise = Helpers.privateKeyCorrespondsToAddress('1BDSbDEechSue77wS44Jn2uDiFaQWom2dG', "5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn")
      promise.then((data) ->
        expect(data).not.toEqual(null)
        done()
      )

    it "should match mini private keys to their right addresses", (done) ->
      promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', "S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy")
      promise.then((data) ->
        expect(data).not.toEqual(null)
        done()
      )

  describe "isValidPrivateKey", ->

    it "should not recognize invalid hex keys", ->
      expect(Helpers.isValidPrivateKey("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141")).toBeFalsy()
      expect(Helpers.isValidPrivateKey("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toBeFalsy()
      expect(Helpers.isValidPrivateKey("0000000000000000000000000000000000000000000000000000000000000000")).toBeFalsy()


    it "should recognize valide hex keys", ->
      expect(Helpers.isValidPrivateKey("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364139")).toBeTruthy()
      expect(Helpers.isValidPrivateKey("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF")).toBeTruthy()
      expect(Helpers.isValidPrivateKey("0000000000000000000000000000000000000000000000000000000000000001")).toBeTruthy()

    it "should not recognize invalid base 64 keys", ->
      expect(Helpers.isValidPrivateKey("ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=098")).toBeFalsy()
      expect(Helpers.isValidPrivateKey("////////////////////////////////////////////")).toBeFalsy()

    it "should recognize valid base 64 keys", ->
      expect(Helpers.isValidPrivateKey("ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=")).toBeTruthy()
      expect(Helpers.isValidPrivateKey("/////////////////////rqu3OavSKA7v9JejNA2QTk=")).toBeTruthy()
      expect(Helpers.isValidPrivateKey("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=")).toBeTruthy()

    it "should recognize BIP-38 keys", ->
      expect(Helpers.isValidPrivateKey("6PRMUxAWM4XyK8b3wyJRpTwvDdmCKakuP6aGxr3D8MuUaCWVLXM2wnGUCT")).toBeTruthy()
      expect(Helpers.isValidPrivateKey("6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg")).toBeTruthy()

  describe "verifyMessage", ->

    it "should verify valid messages", ->
      expect(Helpers.verifyMessage("1LGAzcG9dafqtW8eHkFUPjkDKemjv5dxKd", "HxvX3mVUI4cQgpKB98bjl/NOYi2BiaSZEsdfCulyJ7GAWrfP/9WkDazCe45lyhWPZQwZKnYZILz5h3SHn4xFPzg=", "Wright, it is not the same as if I sign Craig Wright, Satoshi.")).toBeTruthy()

    it "should not verify invalid messages", ->
      expect(Helpers.verifyMessage("12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S", "IH+xpXCKouEcd0E8Hv3NkrYWbhq0P7pAQpI1GcQ2hF2AAsqL2o4agDE8V81i071/bTMz00YKw2YRMoyFMzThZwM=", "Wright, it is not the same as if I sign Craig Wright, Satoshi.")).toBeFalsy()


  describe "precisionToSatoshiBN", ->

    it "should parse valid strings with fractional values", ->
      expect(Helpers.precisionToSatoshiBN("21.0349756").intValue()).toEqual(new BigInteger("2103497560").intValue())

    it "should parse valid strings with fractional values", ->
      expect(Helpers.precisionToSatoshiBN("1").intValue()).toEqual(new BigInteger("100000000").intValue())