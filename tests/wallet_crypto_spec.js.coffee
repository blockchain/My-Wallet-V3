
describe 'WalletCrypto', ->

  WalletCrypto = require('../src/wallet-crypto')
  crypto = require('crypto')
  walletData = require('./data/wallet-data')

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

          expect(() -> WalletCrypto.decryptWalletSync(wallet.enc, wallet.password)).toThrow("Wallet version 4 not supported.")
          WalletCrypto.decryptWallet(wallet.enc, wallet.password, observers.success, observers.error)
          expect(observers.success).not.toHaveBeenCalled()
          expect(observers.error).toHaveBeenCalled()


  describe 'encryptWallet()', ->
    v3 = walletData.v3[0]

    it 'should encrypt a v3 wallet', ->
      spyOn(crypto, 'randomBytes').and.callFake((bytes) ->
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
        spyOn(crypto, 'randomBytes').and.callThrough()
        pad.Iso10126.pad(input, BLOCK_SIZE_BYTES)
        expect(crypto.randomBytes).toHaveBeenCalledWith(5)

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
