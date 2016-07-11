proxyquire = require('proxyquireify')(require)

Crypto = {
}

stubs = {
  'crypto': Crypto,
}

WalletCrypto = proxyquire('../src/wallet-crypto', stubs)

describe 'WalletCrypto', ->
  walletData = require('./data/wallet-data')

  describe "stretchPassword()", ->
    it "should stretch a password", ->
      password = "1234567890"
      salt = 'a633e05b567f64482d7620170bd45201'
      pbkdf2_iterations = 10

      expect(WalletCrypto.stretchPassword(password, salt, pbkdf2_iterations).toString('hex')).toBe("4be158806522094dd184bc9c093ea185c6a4ec003bdc6323108e3f5eeb7e388d")

  describe "decryptPasswordWithProcessedPin()", ->
    it "should return the password", ->
      data = 'pKPZ1y8lM9aixrcaW3VGHdZkQL37ESyFQvgxVSIjhEo='
      password = '60ae40d723196edea0ae35ace25db8961905dd8582ae813801c7494e71173925'
      pbkdf2_iterations = 1

      decrypted_password = WalletCrypto.decryptPasswordWithProcessedPin(data, password, pbkdf2_iterations)

      expect(decrypted_password).toBe('testtest12')

  describe "encrypt", ->
    beforeEach ->
      spyOn(WalletCrypto.Buffer, "concat").and.callFake((array) ->
        res = array.join('|')
        {
          toString: (type) -> "#{ res }|#{ type }"
        }
      )
      spyOn(Crypto, "randomBytes").and.callFake(() ->
        "random-bytes"
      )

    data = JSON.stringify({hello: "world"})

    beforeEach ->
      spyOn(WalletCrypto.AES, "encrypt").and.callFake((dataBytes, key, salt, options) ->
        "#{ dataBytes }|encrypted-with-#{ salt }+#{ key }"
      )

    describe "encryptDataWithKey()", ->
      it "should take JSON string and return Base64 concatenated IV + payload", ->
        res = WalletCrypto.encryptDataWithKey(data, "aes-256-key", "random")

        expect(res).toEqual("random|#{ data }|encrypted-with-random+aes-256-key|base64")

      it "should generate an IV if not provided", ->
        res = WalletCrypto.encryptDataWithKey(data, "aes-256-key")

        expect(res).toEqual("random-bytes|#{ data }|encrypted-with-random-bytes+aes-256-key|base64")

    describe "encryptDataWithPassword()", ->
      pending()

  describe "decrypt", ->
    data = JSON.stringify({hello: "world"})

    beforeEach ->
      spyOn(WalletCrypto.AES, "decrypt").and.callFake((payload, key, iv, options) ->
        payloadComponents = payload.split("|")
        cryptoComponents = payloadComponents[1].replace('encrypted-with-','').split("+")
        if cryptoComponents[0] != key
          throw new Error('Wrong AES key')
        if cryptoComponents[1] != iv
          throw new Error('Wrong AES initialization vector')
        res = payloadComponents[0]
        {
          toString: () -> res
        }
      )

    describe "decryptBufferWithKey()", ->
      it "should decrypt when given an IV, payload and key", ->
        res = WalletCrypto.decryptBufferWithKey(
          "#{ data }|encrypted-with-aes-256-key+random",
          'random',
          'aes-256-key'
        )
        expect(res).toEqual(data)

    describe "decryptDataWithKey()", ->
      it "should decode Base64, extract IV and call decryptBufferWithKey()", ->
        spyOn(WalletCrypto, "decryptBufferWithKey")

        key = 'c9a429594db2ae5b3df33aa651825073114dc59df230fbf74aeccab2cd99bd59'

        res = WalletCrypto.decryptDataWithKey(
          'bvOk5Ppz9rPDLwlR1wObQoyPVybs4h+fg0eynTe4u/CePkZOPFvobnTpzGGX10CY',
          Buffer(key, 'hex')
        )

        expect(WalletCrypto.decryptBufferWithKey).toHaveBeenCalled()
        expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[0].toString('hex')).toEqual(
          '8c8f5726ece21f9f8347b29d37b8bbf09e3e464e3c5be86e74e9cc6197d74098' # Payload
        )
        expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[1].toString('hex')).toEqual(
          '6ef3a4e4fa73f6b3c32f0951d7039b42' # IV
        )
        expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[2].toString('hex')).toEqual(
          key # key
        )


  describe "decryptDataWithPassword()", -> # decrypt()
    it "should decode Base64, extract IV, stretch pwd and call decryptBufferWithKey()", ->
      data = "zKHay4ml1+lRidNioY/Da7R5E6ERiwU7bDYsSS2UUH0="
      spyOn(WalletCrypto, "stretchPassword").and.returnValue Buffer('b484f16b5980e877439f5c65aba87572176548280feda10b730e978911dcc825', 'hex')
      spyOn(WalletCrypto, "decryptBufferWithKey").and.returnValue 'test'

      res = WalletCrypto.decrypt(data, "1234", 10)

      expect(WalletCrypto.stretchPassword).toHaveBeenCalledWith(
        '1234',
        jasmine.anything()
        10,
        256
      )
      expect(WalletCrypto.stretchPassword.calls.argsFor(0)[1].toString('hex')).toEqual(
        'cca1dacb89a5d7e95189d362a18fc36b' # salt
      )
      expect(WalletCrypto.decryptBufferWithKey).toHaveBeenCalled()
      expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[0].toString('hex')).toEqual(
        'b47913a1118b053b6c362c492d94507d' # Encrypted payload
      )

      expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[1].toString('hex')).toEqual(
        'cca1dacb89a5d7e95189d362a18fc36b'
      ) # IV is same as salt used for password stretching

      expect(WalletCrypto.decryptBufferWithKey.calls.argsFor(0)[2].toString('hex')).toEqual(
       'b484f16b5980e877439f5c65aba87572176548280feda10b730e978911dcc825'
      ) # The key returned by strechPassword()

      expect(res).toEqual("test")

  describe "pairing code", ->
    it "should decrypt", ->

      payload = "qf7x+dZBbUQnzgbL6SJfI8w/nracmNe4YiGIww+J40V42u4T8SgyjfJdIqPsKkQC7m0UMpQ4OpvkBl2H4NIolJizO/N0zauRnkaSeqK32rY="
      encryption_phrase = "efd93e61900251ab6cd19a4f14e5a2229866e150b04f40fe7912f392c24b5a7d"
      guid = "6f209355-9e4b-4708-9d64-272d76bb8062"

      decrypted = WalletCrypto.decrypt(payload, encryption_phrase, 10)
      components = decrypted.split('|')
      expect(components[0]).toBe(guid)

  describe "decryptWallet", ->

    it "should decrypt a legacy v1 wallet with CBC, ISO10126, 10 iterations", ->
      data = 'OPWBr1rsrvGsbNpIidlztqc0YsPwS0gg51rz6gWlrsJzY+VidziSekuiy7AcxVF42sMcJp9XD41xPsmq0m9yEWrFw6QufwLjSWNE4IK8mD6jIYH35a7fWKbK0LXGq4UIHCfM2W8WVoz/l0QO+JrGrqC3gg8qGyHP3NsVZKVAqG6cGmBi9WEs688U5B0NNGPXPLKE1ZXzHbSd6Pdub1xWv/BEo4RsAu1NySQJpcq3hqo9nLMsza9aiwKH5rG1aMUDu50LNtGs3vCx8ZAkcZpYVp1ZLeoD3pnZVc7siq3kiqJ7zDQoE3FORgD6PuAc6YB2PXW6I3ubw4hkvFMnkIK4/Cc/AEB8RYar6rjmgPVYXSm+ok39sPi9ppIE23k4LkFzz3dUbTM2ub1kKPCUoJLp2E4tUg4hqRidaC7rNxkPyI3lyBWrS8JD457pFYlTWYsUtU1P2sHhxKZuKdeDPQ/Jvo0y+xO5rK9OgmKCg0qxuwaXf4NYu6laqaGEQywRmRyhT1f3E0pQZ371dObo4FOdiVEODhvadPf0FCHjOtuaxWwEkFwyFHVtc0lVNhcy0rg65j2efHpDUXqQnqFBgc2PG23BVI1gY0JIDT5zp33wdFX3r6MjYxSUV7KbRBDwCD0Q3a9NepX9bqv3wpi1qYJ6kcht0iMAE+5WmHHeHWza2HFMXcUApSAU6cu2fzOfK+4gRMJPjNAdk/nVQT1UnWy9k+s6jvwaXBPI10ewaTz5ayRTXyku36N1xLsM6DnBPoJCunuDEXMI5dILgr3BVSCqvzboWsRW04bAfFbpYANioQgdDD5zerygHa61V7ICyD/x5G4li6VLIefsCGGBo+7fU149zYkHv7ruH8F/J26b11UH+gpThimLgenJectT3MnksMFaz8LiSRn6jnz7CMeXssxBoYRT0gvq4MN6JxFGD01HfcqfVuBkWXk8Mo1OE75v3HWovrJOrTXhYbr+JaPppA=='
      password = 'testpassword'

      obj =
        success: (result, obj) ->
        error: (e) ->
          console.log("decryptWallet error:")
          console.log(e)

      spyOn(obj, "success")

      WalletCrypto.decryptWallet(data, password, obj.success, obj.error)
      expect(obj.success).toHaveBeenCalled()
      expect(obj.success.calls.argsFor(0)[0].guid).toBe("6253e902-ce79-4027-bdc4-af51ed970eb5")


    it "should decrypt a legacy v1 wallet with OFB, nopad, 1 iteration", ->
      data = '1LbdcPCYTFMr3Yv27kaJ/kqKflbhLMsQJXAL4EyWOzTKiDHmVrO6JTInh0GzXwTcDSJJQw4G614LT7YyfaZLd3+shhFDQycvSLKrnC4wM40CcIE1Ow335YlolV6+WAJAAQ951ipS2cUERXSpxbbDy41AbUG+wIX/R2wCbiosT6OLHjnMSuQWx5CyEB1ZqRUXfc3TYwbh1iCJdBDaPFnmTPN/LpRegC99DFEJ0E94dPim42Q/8KV4mDNvCOUGjLfqsi/3I+M6kGJtzC5CUo0dVZ0bzzTTXEXm7Ga0eo3arCdMQUDPVGcbJbGK8qTcWcHXHw90EJEGBUi6i4p1XXw+26T5k+Qs6Fl7GD3PHl5Urusk4twB5DM/Hwp5vFWnsCsbM78CRhJl3rbheBMx6t1RJKvxpOUrh/OyvOwhWtU6hRXmS/zrwwDqbWiVG9/LzZP19hnAvlTJ0o1jF/Dmz+EoTaotkVHFZDUuYDKfWPY/+K7sQGkagfdv5W1X9rfary22prDUo8kFiRvNHvGMie3TiM1ucSdpBj1DpgfwCxnWzLIeoRl8ZJFUN/V8CkGjpPoyBYZFfjCeGq9+ET0wXL4s9qfNXaHfx2oEuiwcLcDDf71us655hIW6t/OPaPZ3WPhnW4KqrTtL4xduYrisYbhoZkmqJe5Jl110jhiKdNYdvmOcFo764RDPcu2Oa1bszYhGTbRPc45kLauJUAW3e/UUbA87RpAqFnOLH/0vcNMJvcKbvID9A1RSZNjmlerSOptab+yYI97D6EitvFDx9tFMmUrfWFRGs5bOrjiAHobcCqpJ60AivYHPkkkaz8gROz30aqa9Dpz15wplbOVIpKVqf8hly8Bghj5QK4+m2Nf2qALDdBfX+1ZIUh23kiy0s3duWoJQttIyK0AeEU8oHa0MRP5T/ikMatVvw7GVmcDzO8pFBdBxssxReEhnXCpd4nmjcuWbroa+5oaCMWtzXH4I'
      password = 'testpassword'

      obj =
        success: (result, obj) ->
        error: (e) ->
          console.log("decryptWallet error:")
          console.log(e)

      spyOn(obj, "success")

      WalletCrypto.decryptWallet(data, password, obj.success, obj.error)
      expect(obj.success).toHaveBeenCalled()
      expect(obj.success.calls.argsFor(0)[0].guid).toBe("6253e902-ce79-4027-bdc4-af51ed970eb5")


    it "should decrypt a legacy v1 wallet with OFB, ISO7816, 1 iteration", ->
      data = 'ag6Tn5xvl/9OwQ9uvRl1wcOBaYPsCHFEyv+RjSHwU+evHlsBvsWErhxRFWpaK8oqvy0ECH2F8IH8NWMwoXqGbmV7FNgaXiJMhNCtiJvRIv0oY9OoMvQajVvmmXO+WdepwPGVJ130xUz8aZ9raTUGJySKo5/Aq8zBybXqG9UdxSG6QKxRaQNyvh4nb/T5h9b4opwoMpX+Mqh4HRWcURTgQ+RgGC9wKqdrpCL5nka5RsbRj3eQEG6ZyOzq4ROCjE217RqZhS+n6qjw1lBPPwFREbbWZ2NVVvXRJP1tv+VfRCK69lqoHS6GoTrf4aZy35t/GCISEgzyLVCpcpERgC9uUKzSRoarltHd+LPV7RB6+qA1UxBvzbdcYplBO+fdcWHlrx3YES9lpSKB+B/+PP/aFOg+3z/cQbtkLJ5KkXwrrceKqylNznq9pq5u/a8vjTWkkddgWJzBeQD0FF9kj5zZCJXRb0BwoST7oT952FHz751egpnC5WbCLvM0UgnLH9jEcxkuc2vKpnAEEjyXvry/8WWrzGPsnJgEH6wGvxoocqYWcGIFBMj6iHstDMKa4BsaWvqMOUEyvYnGqvo29Xykzlvou3LUAfoz5xE32UKwZRLlsVeDZafQHk5V10yckRETJaA1P6ZGvpuHGIRsXGlpTZJMCz9XoJB7uXYeI66Rw5JYHgezVtrOTTFNUk/ZuPMty4rRAGIaNiFRQsJE5hY7SHbwvLyoY2xmnAl4J57J2mn9CNXYWMqK9WiF/xPTYU9YphHSlYWL2/pMZux0SqW6pSIoF6YoXKl7bv71bAf+tVYeysLLezVdGYi44ezdOQ12sH1ipTerk1LWJL10DVjh58uigHed+gceF2w1gjcUlU7Xsh4Z+m2UlIekSETmFW/uY2FMQz6oz3fikxwRdXY7gNY5VES9DNA34MV92wfMgRNJD1I9dWRMrPxhRoClZJA1uSBMg8n5jjnhhznTzCJ33g=='
      password = 'testpassword'

      obj =
        success: (result, obj) ->
        error: (e) ->
          console.log("decryptWallet error:")
          console.log(e)

      spyOn(obj, "success")

      WalletCrypto.decryptWallet(data, password, obj.success, obj.error)
      expect(obj.success).toHaveBeenCalled()
      expect(obj.success.calls.argsFor(0)[0].guid).toBe("6253e902-ce79-4027-bdc4-af51ed970eb5")


    it "should decrypt a legacy v1 wallet with CBC, ISO10126, 1 iteration", ->
      data = 'BuAqphHuJDoKyTIHRXlzlm1ZMVo1NKM9l6fDFldPGOPTobqEG+9RjO9UHLcUO04HAbqogDZdoOxU2cyNM7bi7JYEZDTlfiIYldFkJUP+zGA4Wg+twCS+oOJrv4D8VoKaFl8oAnIns2n8o8MEQscxxkBzjNWoZ3yE6jG1AjtoYt8owrz97S8XFmnSaK3/Q3doTMKFPaRZ7NAR7z0gWI4KaHtfmHMYEsiGy33M4riq3DCyiGGezg+f2IlUUsRj/+VmxZd5KlCpA4ZIG3fPpp19BPj2S3yFdDqZtMjfggo570iHi7eMogFrZAo+yiLJlYSaoWT8fs8vTmnm8pxxRYb1601AmrBnNlPPpvGRNSBiV/rfKdaVqPYygonTBca5fLBA+QQQ8k5HJdiKRjgfJkZWpjexxdXTuLi/bRKYfKOp5GT+fDrgNAv/E56U4rpwpolAQYzJI8XGDF6CZCVJHWAIPqq8XO7sBBofRuGpUoJMZChDoSbVJV12ZYKSo52j/oo+G/e/Rylrydb2u2qte4RdvYQE+Fr9FIX8nR3JUJwXpXx3/rUImPJa+9P9+ySOjRo4zvmh04Zj+C6eGfsLO4GvpKe748d6WrQzTZwzcVmzCeFA0spcDmJaeQ6iB9HKh8yYo5YDWiEiuHw1CIxDb83wnlLepxmk0isEMCIXETNJ+8ns1263kBbYKbt9FyfB8gNrSHEM7tyVc5v03Z++c11+9dSONnLyQArQSLCvnktPQlKm2cb/rRfmbk8ASlCfZkkhn6TR7Ugcvgoj+Sh7fm9LWYISdPx3vmPriplQjvnYnrvBcXoNmJuFmNG6tBgCK8wdbtOCtFw4KS0e8nAOjZ4o0xfNuLv+TmMyyA9xAXRGDEPV+5Z//MAQJc69usAazTaojxicUh0RghUlQOpiqHW5Mbg0tUlkAkCJJYJKfu6elNDslw8l6NwjIvaR7rgdF6JGXbRrX9zl81dAYfyWxJg9Nw=='
      password = 'testpassword'

      obj =
        success: (result, obj) ->
        error: (e) ->
          console.log("decryptWallet error:")
          console.log(e)

      spyOn(obj, "success")

      WalletCrypto.decryptWallet(data, password, obj.success, obj.error)
      expect(obj.success).toHaveBeenCalled()
      expect(obj.success.calls.argsFor(0)[0].guid).toBe("6253e902-ce79-4027-bdc4-af51ed970eb5")


    it "should decrypt a test v2 wallet", ->
      data = '{"pbkdf2_iterations":5000,"version":2,"payload":"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"}'
      password = 'testtest12'

      obj =
        success: (result, obj) ->
        error: (e) ->
          console.log("decryptWallet error:")
          console.log(e)

      spyOn(obj, "success")

      WalletCrypto.decryptWallet(data, password, obj.success, obj.error)

      expect(obj.success).toHaveBeenCalled()
      expect(obj.success.calls.argsFor(0)[0].guid).toBe("cc90a34d-9eeb-49e7-95ef-9741b77de443")

    return

  describe 'decryptWalletSync()', ->

    describe 'wallet v3', ->
      walletData.v3.forEach (wallet) ->
        it "should decrypt #{wallet.guid}", ->
          dec = WalletCrypto.decryptWalletSync(wallet.enc, wallet.password)
          expect(dec.guid).toEqual(wallet.guid)

    describe 'legacy wallet v2', ->
      walletData.v2.forEach (wallet) ->
        it "should decrypt #{wallet.guid}", ->
          dec = WalletCrypto.decryptWalletSync(wallet.enc, wallet.password)
          expect(dec.guid).toEqual(wallet.guid)

    describe 'legacy wallet v1', ->
      walletData.v1.forEach (wallet) ->
        it "should decrypt #{wallet.mode}, #{wallet.padding}, #{wallet.iterations} iterations", ->
          dec = WalletCrypto.decryptWalletSync(wallet.enc, wallet.password)
          expect(dec.guid).toEqual(wallet.guid)

    describe 'non-existing wallet v4', ->
      walletData.v4.forEach (wallet) ->
        it "should not decrypt #{wallet.mode}, #{wallet.padding}, #{wallet.iterations} iterations", ->
          observers =
            success: () ->
            error: () ->

          spyOn(observers, "success").and.callThrough()
          spyOn(observers, "error").and.callThrough()

          expect(() -> WalletCrypto.decryptWalletSync(wallet.enc, wallet.password)).toThrow(Error("Wallet version 4 not supported."))
          WalletCrypto.decryptWallet(wallet.enc, wallet.password, observers.success, observers.error)
          expect(observers.success).not.toHaveBeenCalled()
          expect(observers.error).toHaveBeenCalled()


  describe 'encryptWallet()', ->
    v3 = walletData.v3[0]

    it 'should encrypt a v3 wallet', ->
      spyOn(Crypto, 'randomBytes').and.callFake((bytes) ->
        salt = new Buffer(v3.iv, 'hex')
        padding = new Buffer(v3.pad, 'hex')
        return if bytes == 16 then salt else padding
      )
      enc = WalletCrypto.encryptWallet(JSON.stringify(v3.data), v3.password, v3.iterations, 3)
      expect(enc).toEqual(v3.enc)

  describe 'aes-256', ->
    vectors = require('./data/aes-256-vectors')

    ['cbc', 'ofb', 'ecb'].forEach (mode) ->

      describe "#{mode}", ->
        key = new Buffer(vectors[mode].key, 'hex')

        opts =
          mode: WalletCrypto.AES[mode.toUpperCase()]
          padding: WalletCrypto.pad.NoPadding

        vectors[mode].tests.forEach (caseData) ->
          enc = undefined

          iv = if caseData.iv then new Buffer(caseData.iv, 'hex') else null
          testvector = new Buffer(caseData.testvector, 'hex')
          ciphertext = new Buffer(caseData.ciphertext, 'hex')

          it "should encrypt #{caseData.testvector}", ->
            enc = WalletCrypto.AES.encrypt(testvector, key, iv, opts)
            expect(enc.compare(ciphertext)).toEqual(0)

          it "should decrypt #{caseData.testvector}", ->
            dec = WalletCrypto.AES.decrypt(enc, key, iv, opts)
            expect(dec.compare(testvector)).toEqual(0)

    it "should use CBC if no mode is given", ->
      key = new Buffer(vectors['cbc'].key, 'hex')

      opts =
        padding: WalletCrypto.pad.NoPadding

      vectors['cbc'].tests.forEach (caseData) ->

        iv = if caseData.iv then new Buffer(caseData.iv, 'hex') else null
        testvector = new Buffer(caseData.testvector, 'hex')
        ciphertext = new Buffer(caseData.ciphertext, 'hex')

        enc = WalletCrypto.AES.encrypt(testvector, key, iv, opts)
        expect(enc.compare(ciphertext)).toEqual(0)

        dec = WalletCrypto.AES.decrypt(enc, key, iv, opts)
        expect(dec.compare(testvector)).toEqual(0)


  describe 'padding', ->

    BLOCK_SIZE_BYTES = 16
    pad = WalletCrypto.pad
    input = new Buffer(10).fill(0xff)

    describe 'NoPadding', ->
      it 'should not add bytes when padding', ->
        output = pad.NoPadding.pad(input, BLOCK_SIZE_BYTES)
        expect(output.compare(input)).toEqual(0)

      it 'should not remove bytes when unpadding', ->
        output = pad.NoPadding.unpad(input)
        expect(output.compare(input)).toEqual(0)

    describe 'ZeroPadding', ->
      it 'should fill the remaining block space with 0x00 bytes', ->
        output = pad.ZeroPadding.pad(input, BLOCK_SIZE_BYTES)
        expect(output.length).toEqual(BLOCK_SIZE_BYTES)
        expect(output.toString('hex').match(/(00)+$/)[0].length/2).toEqual(6)

      it 'should remove all trailing 0x00 bytes when unpadding', ->
        padded = Buffer.concat([ input, new Buffer(6).fill(0x00) ])
        output = pad.ZeroPadding.unpad(padded)
        expect(output.length).toEqual(10)

      it 'should unpad a ZeroPadding padded buffer', ->
        output = pad.ZeroPadding.unpad(pad.ZeroPadding.pad(input, BLOCK_SIZE_BYTES))
        expect(output.compare(input)).toEqual(0)

    describe 'Iso10126', ->
      it 'should set the last byte to the padding length', ->
        output = pad.Iso10126.pad(input, BLOCK_SIZE_BYTES)
        expect(output[output.length - 1]).toEqual(0x06)

      it 'should pad using random bytes', ->
        spyOn(Crypto, 'randomBytes').and.callThrough()
        pad.Iso10126.pad(input, BLOCK_SIZE_BYTES)
        expect(Crypto.randomBytes).toHaveBeenCalledWith(5)

      it 'should unpad based on the last byte', ->
        padded = new Buffer(BLOCK_SIZE_BYTES)
        padded[padded.length - 1] = 0x07
        output = pad.Iso10126.unpad(padded)
        expect(output.length).toEqual(9)

      it 'should unpad an Iso10126 padded buffer', ->
        output = pad.Iso97971.unpad(pad.Iso97971.pad(input, BLOCK_SIZE_BYTES))
        expect(output.compare(input)).toEqual(0)

    describe 'Iso97971', ->
      it 'should set the first padding byte to 0x80', ->
        output = pad.Iso97971.pad(input, BLOCK_SIZE_BYTES)
        expect(output[input.length]).toEqual(0x80)

      it 'should pad the rest with 0x00 bytes', ->
        output = pad.Iso97971.pad(input, BLOCK_SIZE_BYTES)
        expect(output.toString('hex').match(/(00)+$/)[0].length/2).toEqual(5)

      it 'should unpad an Iso97971 padded buffer', ->
        output = pad.Iso97971.unpad(pad.Iso97971.pad(input, BLOCK_SIZE_BYTES))
        expect(output.compare(input)).toEqual(0)

  describe 'cipherFunction', ->
    it 'should not modify the message is all parameters are falsy', ->
      expect(WalletCrypto.cipherFunction()('toto')).toEqual('toto')

    it 'should not modify the operation is unknown', ->
      expect(WalletCrypto.cipherFunction('password', 'key', 1000, 'nop')('toto')).toEqual('toto')

  describe "scrypt", ->

    observer =
      callback: (hash) ->

    beforeEach ->
  # overrride as a temporary solution
      window.setTimeout = (myFunction) -> myFunction()

    # Crypto_scrypt test vectors can be found at the end of this document:
    ## http://www.tarsnap.com/scrypt/scrypt.pdf

    it "Official test vector 1 should work", ->
      spyOn(observer, "callback")
      expected = "77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442\
                  fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906"
      WalletCrypto.scrypt "", "" , 16, 1, 1, 64, observer.callback
      expect(observer.callback).toHaveBeenCalled()
      computed = observer.callback.calls.argsFor(0)[0].toString("hex")
      expect(expected).toEqual(computed)

    # Not using official test vectors 2-4, because they are too slow. Using
    # Haskell generated test vectors below instead.

    # Disabled because it is too slow
    # it "Official test vector 2 should work", ->
    #   spyOn(observer, "callback")
    #   expected = "fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731\
    #               622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640"
    #   ImportExport.Crypto_scrypt "password", "NaCl" , 1024, 8, 16, 64, observer.callback
    #   expect(observer.callback).toHaveBeenCalled()
    #   computed = observer.callback.calls.argsFor(0)[0].toString("hex")
    #   expect(expected).toEqual(computed)

    # Disabled because it is too slow
    # it "Official test vector 3 should work", ->
    #   spyOn(observer, "callback")
    #   expected = "7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2\
    #               d5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887"
    #   ImportExport.Crypto_scrypt "pleaseletmein", "SodiumChloride", 16384, 8, 1, 64, observer.callback
    #   expect(observer.callback).toHaveBeenCalled()
    #   computed = observer.callback.calls.argsFor(0)[0].toString("hex")
    #   expect(expected).toEqual(computed)

    # Disabled because it is too slow and PhantomJS runs out of memory
    # it "Official test vector 4 should work", ->
    #   spyOn(observer, "callback")
    #   expected = "2101cb9b6a511aaeaddbbe09cf70f881ec568d574a2ffd4dabe5ee9820adaa47\
    #               8e56fd8f4ba5d09ffa1c6d927c40f4c337304049e8a952fbcbf45c6fa77a41a4"
    #   ImportExport.Crypto_scrypt "pleaseletmein", "SodiumChloride" , 1048576, 8, 1, 64, observer.callback
    #   expect(observer.callback).toHaveBeenCalled()
    #   computed = observer.callback.calls.argsFor(0)[0].toString("hex")
    #   expect(expected).toEqual(computed)

    # The next test vectors for crypto scrypt have been generated using this lib:
    ## https://hackage.haskell.org/package/scrypt-0.3.2/docs/Crypto-Scrypt.html

    it "haskell generated test vector 1 should work", ->
      spyOn(observer, "callback")
      expected = "53019da47bc9fbdc4f719183e08d149bc1cd6b5bf3ab24df8a7c69daed193c69\
                  2d0d56d4c2af3ce3f98a317671bdb40afb15aaf4f08146cffbc4ccdd66817402"
      WalletCrypto.scrypt "suchCrypto", "soSalty" , 16, 8, 1, 64, observer.callback
      expect(observer.callback).toHaveBeenCalled()
      computed = observer.callback.calls.argsFor(0)[0].toString("hex")
      expect(expected).toEqual(computed)

    it "haskell generated test vector 2 should work", ->
      spyOn(observer, "callback")
      expected = "56f5f2c4809f3ab95ecc334e64450392bf6f1f7187653b1ba920f39b4c44b2d6\
                  b47a243c70b2c3444bc31cfec9c57893dd39fa0688bd8a5d1cdcbe08b17b432b"
      WalletCrypto.scrypt "ΜΟΛΩΝ", "ΛΑΒΕ" , 32, 4, 4, 64, observer.callback
      expect(observer.callback).toHaveBeenCalled()
      computed = observer.callback.calls.argsFor(0)[0].toString("hex")
      expect(expected).toEqual(computed)

    it "haskell generated test vector 3 should work", ->
      spyOn(observer, "callback")
      expected = "f890a6beae1dc3f627f9d9bcca8a96950b11758beb1edf1b072c8b8522d15562\
                  9db68aba34619e1ae45b4b6b2917bcb8fd1698b536124df69d5c36d7f28fbe0e"
      WalletCrypto.scrypt "ϓ␀𐐀💩", "ϓ␀𐐀💩" , 64, 2, 2, 64, observer.callback
      expect(observer.callback).toHaveBeenCalled()
      computed = observer.callback.calls.argsFor(0)[0].toString("hex")
      expect(expected).toEqual(computed)
