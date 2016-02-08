
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
