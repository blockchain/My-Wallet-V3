proxyquire = require('proxyquireify')(require)

OriginalWalletCrypto = require('../src/wallet-crypto');
OriginalBitcoin = require('bitcoinjs-lib');

# mock derivation to generate hdnode from string deterministically
masterhdnode =
  deriveHardened: (purpose) ->
    deriveHardened: (payloadType) ->
      deriveHardened: (i) -> BitcoinJS.HDNode.fromSeedBuffer(
                                     OriginalWalletCrypto.sha256(
                                      "m/#{ purpose }'/#{ payloadType }'/#{ i }'"))

metahdnode =
  deriveHardened: (payloadType) ->
    deriveHardened: (i) -> BitcoinJS.HDNode.fromSeedBuffer(
                                     OriginalWalletCrypto.sha256(
                                      "m/proposit'/#{ payloadType }'/#{ i }'"))

BitcoinJS = {}
WalletCrypto = {}
stubs = {
  './wallet-crypto': WalletCrypto,
  'bitcoinjs-lib': BitcoinJS
}
Metadata = proxyquire('../src/metadata', stubs)

describe "Metadata", ->

  c = undefined
  response =
    payload: "Q1ayZRanBA5pzRsYQOzni43yMVl53T65DGUjp1cEgzpl/HOcc6PcGtWkrvOREtnc",
    version: 1,
    type_id: -1,
    signature: "IBZQntOxNxJlg5nKMmzi7mH4l3+BZrZnVDz+eJas3QKaCApbcQuTy9XCTSuSRpWuJ4mmsW/PuWhAFOv63DZ6+fs=",
    prev_magic_hash: "6006136dcb283dff85ce8b5c25f8a339437943b136bfefe2b10d7a902b25f957",
    created_at: 1480072957000,
    updated_at: 1480072976166,
    address: "19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA"

  non_enc_response =
    payload:"eyJoZWxsbyI6IndvcmxkIn0=",
    version:1,
    type_id:-1,
    signature:"IAC4PIBfjHPSp9w7Lg/UaVfAo1WZnB07aViLXasNQZQnMDFWS4q8mDgs7o8DhDb0yP+QwbZ/rrFlEARDy6+d0S8=",
    prev_magic_hash:"33f698a2819f6e779cb0cc579a08975d2fc92632c31d294f363bde70560e722a",
    created_at:1480072957000,
    updated_at:1480074223395,
    address:"19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA"

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "Metadata.message", ->

    it "should compute message with prevMagicHash", ->
      payload = Buffer.from('payload')
      prevMagic = Buffer.from('prevMagic')
      message = Metadata.message(payload, prevMagic)
      expect(message).toBe('cHJldk1hZ2ljI59Z7VXnN8dxR89VrQwbAwttfudIp0JpUvm4UtWpNeU=');

    it "should compute message without prevMagicHash", ->
      payload = Buffer.from('payload')
      prevMagic = undefined
      message = Metadata.message(payload, prevMagic)
      expect(message).toBe('cGF5bG9hZA==');

  describe "Metadata.magic", ->

    it "should compute magicHash with prevMagicHash", ->
      payload = Buffer.from('payload')
      prevMagic = Buffer.from('prevMagic')
      magic = Metadata.magic(payload, prevMagic)
      expect(magic.toString('base64')).toBe('CDaNC0fPlsRlIyjKeELKrrttBEP7g27PCv/pIY4cWCQ=');

    it "should compute magicHash without prevMagicHash", ->
      payload = Buffer.from('payload')
      prevMagic = undefined
      magic = Metadata.magic(payload, prevMagic)
      expect(magic.toString('base64')).toBe('ADDQotVAKs732nTFsqr7RtJsY9n3Ng6OKIcEd/BNjCI=');

  describe "Metadata.computeSignature", ->

    it "should compute signature with prevMagicHash", ->
      k = OriginalBitcoin.ECPair.fromWIF('L1tXV2tuvFWvLw2JTZ1yYz8gxSXPawvoDemrwruTtwp4hhn5cbD3')
      payload = Buffer.from('payload')
      prevMagic = Buffer.from('prevMagic')
      signature = Metadata.computeSignature(k, payload, prevMagic)
      expect(signature.toString('base64')).toBe('H0Ggd/NL6cfGVMCUnUEtbHcFmwbt2i3CXP4dzAtMd6lFCKdbPuCezCVnfRoSvAWeajvP0CkgWxNLnWzjqv1gKfw=');

    it "should compute signature without prevMagicHash", ->
      k = OriginalBitcoin.ECPair.fromWIF('L1tXV2tuvFWvLw2JTZ1yYz8gxSXPawvoDemrwruTtwp4hhn5cbD3')
      payload = Buffer.from('payload')
      prevMagic = undefined
      signature = Metadata.computeSignature(k, payload, prevMagic)
      expect(signature.toString('base64')).toBe('INBtCI3+o9zQuTwijKDN1L/caBjmXI38hJAJ6sse9+L6O8dwvPptLUl/aP4l9Rz+zfJ9bUJj1UJwp/YeQJBFBBM=');

  describe "Metadata.verifyResponse", ->

    it "should propagate null", ->
      verified = Metadata.verifyResponse('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', null)
      expect(verified).toBe(null);

    it "should verify and compute the new magic hash", ->
      verified = Metadata.verifyResponse(response.address, response)
      expectedMagicHash = Buffer.from('sS4b2JTeq53jyrAVYX8WQeIU/wDezNiFX34jNYSmfKQ=', 'base64')
      expect(verified).toEqual(jasmine.objectContaining({compute_new_magic_hash: expectedMagicHash}))

    it "should fail and launch an exception", ->
      shouldFail = () => Metadata.verifyResponse('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', response)
      expect(shouldFail).toThrow(new Error('METADATA_SIGNATURE_VERIFICATION_ERROR'));

  describe "Metadata.extractResponse", ->

    it "should propagate null", ->
      extracted = Metadata.extractResponse('encrypteionKey', null)
      expect(extracted).toBe(null)

    it "should extract encrypted data", ->
      wif = 'Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA'
      k = OriginalBitcoin.ECPair.fromWIF(wif)
      pkbuff = k.d.toBuffer();
      enck = OriginalWalletCrypto.sha256(pkbuff);
      extracted = JSON.stringify(Metadata.extractResponse(enck, response))
      hello = JSON.stringify({hello: 'world'})
      expect(extracted).toBe(hello)

    it "should extract non-encrypted data", ->
      extracted = JSON.stringify(Metadata.extractResponse(undefined, non_enc_response))
      hello = JSON.stringify({hello: 'world'})
      expect(extracted).toBe(hello)

  describe "class", ->
    describe "new Metadata()", ->

      it "should instantiate", ->
        k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA')
        m = new Metadata(k)
        expect(m.constructor.name).toEqual("Metadata")

      it "should set the address", ->
        k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA')
        m = new Metadata(k)
        expect(m._address).toEqual("19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA")

      it "should set the signature KeyPair", ->
        k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA')
        m = new Metadata(k)
        expect(m._signKey.toWIF()).toEqual("Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA")

      it "should set the encryption key", ->
        k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA')
        m = new Metadata(k, 'enc')
        expect(m._encKeyBuffer).toEqual("enc")

  describe "read", ->

    it "should resolve with null for 404 entry", (done) ->
      spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(null))
      promise = Metadata.read("19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA")
      promise.then((res) -> expect(res).toBe(null))
      expect(promise).toBeResolved(done)

    it "should read non-encrypted data", (done) ->
      spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> new Promise((resolve) -> resolve(non_enc_response)))
      promise = Metadata.read("19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA")
      expect(promise).toBeResolvedWith(jasmine.objectContaining({hello: "world"}), done)

  describe "API", ->
    beforeEach ->
      k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA')
      pkbuff = k.d.toBuffer();
      enck = OriginalWalletCrypto.sha256(pkbuff);
      c = new Metadata(k, enck)

    describe "fetch", ->

      it "should resolve with null for 404 entry", (done) ->
        spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(null))
        promise = c.fetch()
        promise.then((res) -> expect(res).toBe(null))
        expect(promise).toBeResolved(done)

      it "should resolve decrypted data", (done) ->
        spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(response))
        promise = c.fetch()
        expect(promise).toBeResolvedWith(jasmine.objectContaining({hello: "world"}), done)

    describe "create", ->

      it "should call request with encrypted data", (done) ->
        spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(response))
        spyOn(WalletCrypto, "encryptDataWithKey").and.callFake((data, key) -> Buffer.from(data).toString('base64'))
        promise = c.create({hello: 'world'})
        promise.then( () =>
          expect(Metadata.request).toHaveBeenCalledWith(
            'PUT',
            "19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA",
            Object({ version: 1, payload: 'eyJoZWxsbyI6IndvcmxkIn0=', signature: 'IEPGABLAeYLlFvRcxJjPwHtPCZIg16sUqLUInw5MhxUzMGbUSnHB+R1a0KRkqTQ0JsGSFzXol+wweZEqMgrHtuQ=', prev_magic_hash: null, type_id: -1 })
          )
        )
        expect(promise).toBeResolved(done)

    describe "update", ->

      it "should call request with encrypted data", (done) ->
        spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(response))
        spyOn(WalletCrypto, "encryptDataWithKey").and.callFake((data, key) -> Buffer.from(data).toString('base64'))
        promise = c.update({hello: 'world'})
        promise.then( () =>
          expect(Metadata.request).toHaveBeenCalledWith(
            'PUT',
            "19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA",
            Object({ version: 1, payload: 'eyJoZWxsbyI6IndvcmxkIn0=', signature: 'IEPGABLAeYLlFvRcxJjPwHtPCZIg16sUqLUInw5MhxUzMGbUSnHB+R1a0KRkqTQ0JsGSFzXol+wweZEqMgrHtuQ=', prev_magic_hash: null, type_id: -1 })
          )
        )
        expect(promise).toBeResolved(done)

      it "should not update if no data changes", (done) ->
        spyOn(Metadata, "request").and.callFake((method, endpoint, data) -> Promise.resolve(response))
        spyOn(WalletCrypto, "encryptDataWithKey").and.callFake((data, key) -> Buffer.from(data).toString('base64'))
        c._value = "no changes"
        promise = c.update("no changes")
        promise.then( () =>
          expect(Metadata.request).not.toHaveBeenCalled()
        )
        expect(promise).toBeResolved(done)

  describe "Factory", ->
    it "should create metadata instance from metadata hdnode with the right derivation", ->
      m = Metadata.fromMetadataHDNode(metahdnode, 1714)
      expect(m._address).toBe('1Auq6HbwMkxM3gVjdN8RbQdZbF5sfLuskv')

    it "should create metadata instance from masterdata hdnode with the right derivation", ->
      m = Metadata.fromMasterHDNode(masterhdnode, 1714)
      expect(m._address).toBe('12auwetBz7DetiL4i58L813y8bdN8UtPzc')
