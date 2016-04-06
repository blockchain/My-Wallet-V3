Bitcoin = require('bitcoinjs-lib')

proxyquire = require('proxyquireify')(require)
MyWallet = {
  wallet: {
    sharedKey: 'shared_key'
    pbkdf2_iterations: 5000
    getHistory: () ->
    syncWallet: () ->
  }
}

Bitcoin = {
  ECPair: {
    makeRandom: (options) ->
      pk = options.rng(32)
      {
        getAddress: () ->
          "random_address"
        pub: {

        }
        d:
          toBuffer: () ->
            pk
      }
    fromWIF: (wif) ->
      {
        getAddress: () ->
          "pub_key_for_" + wif
        d:
          toBuffer: () ->
            wif + "_private_key_buffer"
      }
  }
  message: {
    sign: (keyPair, message) -> message + '_signed'
  }
}

Base58 = {
  encode: (v) ->
    v
}

Helpers = {
  isBitcoinAddress: () -> false
  isKey: () -> true
  isBitcoinPrivateKey: () -> false
  privateKeyStringToKey: (priv, format) -> { priv: priv }
}

RNG = {
  run: (input) ->
    if RNG.shouldThrow
      throw 'Connection failed'
    "1111111111111111111111111111111H"
}

ImportExport =
  parseBIP38toECPair: (b58, pass, succ, wrong, error) ->
    if pass == "correct"
      succ('5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU')
    else if pass == "wrong"
      wrong()
    else if pass == "fail"
      error()

WalletCrypto =
  decryptSecretWithSecondPassword: (data, pw) -> data + '_decrypted_with_' + pw

stubs = {
  './wallet': MyWallet,
  './rng' : RNG,
  './import-export': ImportExport,
  './wallet-crypto': WalletCrypto,
  './helpers' : Helpers,
  'bitcoinjs-lib': Bitcoin,
  'bs58' : Base58
}

Address    = proxyquire('../src/address', stubs)

describe "Address", ->

  a = undefined
  object =
    "addr": "1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN"
    "priv": "GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF"
    "label": "my label"
    "tag": 0
    "created_time": 0
    "created_device_name": "javascript-web"
    "created_device_version": "1.0"

  beforeEach ->
    spyOn(MyWallet, "syncWallet")
    spyOn(MyWallet.wallet, "getHistory")

  describe "class", ->
    describe "new Address()", ->

      it "should create an empty Address with default options", ->
        a = new Address()
        expect(a.balance).toEqual(null)
        expect(a.archived).not.toBeTruthy()
        expect(a.active).toBeTruthy()
        expect(a.isWatchOnly).toBeTruthy()

      it "should transform an Object to an Address", ->
        a = new Address(object)
        expect(a.address).toEqual(object.addr)
        expect(a.priv).toEqual(object.priv)
        expect(a.label).toEqual(object.label)
        expect(a.created_time).toEqual(object.created_time)
        expect(a.created_device_name).toEqual(object.created_device_name)
        expect(a.created_device_version).toEqual(object.created_device_version)
        expect(a.active).toBeTruthy()
        expect(a.archived).not.toBeTruthy()
        expect(a.isWatchOnly).not.toBeTruthy()

    describe "Address.new()", ->
      beforeEach ->
        spyOn(Bitcoin.ECPair, "makeRandom").and.callThrough()
        spyOn(RNG, "run").and.callThrough()
        Helpers.isBitcoinAddress = () -> false
        Helpers.isKey = () -> true
        Helpers.isBitcoinPrivateKey = () -> false

      it "should return an address", ->
        a = Address.new("My New Address")
        expect(a.label).toEqual("My New Address")

      it "should generate a random private key", ->
        a = Address.new("My New Address")
        expect(a.priv).toBe("1111111111111111111111111111111H")

      it "should generate a random address", ->
        a = Address.new("My New Address")
        expect(a.address).toBe("random_address")

      it "should call Bitcoin.ECPair.makeRandom with our RNG", ->
        a = Address.new("My New Address")
        expect(Bitcoin.ECPair.makeRandom).toHaveBeenCalled()
        expect(RNG.run).toHaveBeenCalled()

      it "should throw if RNG throws", ->
        # E.g. because there was a network failure.
        # This assumes BitcoinJS ECPair.makeRandom does not rescue a throw
        # inside the RNG, which is the case in version 2.1.4
        RNG.shouldThrow = true
        expect(() -> Address.new("My New Address")).toThrow('Connection failed')

  describe "instance", ->
    beforeEach ->
      a = new Address(object)

    describe "Setter", ->

      it "archived should archive the address and sync wallet", ->
        a.archived = true
        expect(a.archived).toBeTruthy()
        expect(a.active).not.toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()

      it "archived should unArchive the address and sync wallet", ->
        a.archived = false
        expect(a.archived).not.toBeTruthy()
        expect(a.active).toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        expect(MyWallet.wallet.getHistory).toHaveBeenCalled()

      it "archived should throw exception if is non-boolean set", ->
        wrongSet = () -> a.archived = "failure"
        expect(wrongSet).toThrow()

      it "balance should be set and not sync wallet", ->
        a.balance = 100
        expect(a.balance).toEqual(100)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "balance should throw exception if is non-Number set", ->
        wrongSet = () -> a.balance = "failure"
        expect(wrongSet).toThrow()

      it "label should be set and sync wallet", ->
        a.label = "my label"
        expect(a.label).toEqual("my label")
        expect(MyWallet.syncWallet).toHaveBeenCalled()

      it "label should be alphanumerical", ->
        invalid = () ->
          a.label = 1

        expect(invalid).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it "label should be undefined if set to empty string", ->
        a.label = ''

        expect(a.label).toEqual(undefined)

      it "totalSent must be a number", ->
        invalid = () ->
          a.totalSent = "1"

        valid = () ->
          a.totalSent = 1

        expect(invalid).toThrow()
        expect(a.totalSent).toEqual(null)
        expect(valid).not.toThrow()
        expect(a.totalSent).toEqual(1)

      it "totalReceived must be a number", ->
        invalid = () ->
          a.totalReceived = "1"

        valid = () ->
          a.totalReceived = 1

        expect(invalid).toThrow()
        expect(a.totalReceived).toEqual(null)
        expect(valid).not.toThrow()
        expect(a.totalReceived).toEqual(1)

      it "active shoud toggle archived", ->
        a.active = false
        expect(a.archived).toBeTruthy()
        expect(MyWallet.syncWallet).toHaveBeenCalled()
        a.active = true
        expect(a.archived).toBeFalsy()

      it "private key is read only", ->
        a.priv = "not allowed"
        expect(a.priv).toEqual("GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF")

      it "address is read only", ->
        a.address = "not allowed"
        expect(a.address).toEqual("1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN")

    describe ".signMessage", ->

      it 'should sign a message', ->
        expect(a.signMessage('message')).toEqual('message_signed')

      it 'should sign a message with the second password', ->
        a._priv = 'encpriv'
        spyOn(WalletCrypto, 'decryptSecretWithSecondPassword')
        expect(a.signMessage('message', 'secpass')).toEqual('message_signed')
        expect(WalletCrypto.decryptSecretWithSecondPassword).toHaveBeenCalledWith('encpriv', 'secpass', 'shared_key', 5000)

      it 'should fail when not passed a bad message', ->
        expect(a.signMessage.bind(a)).toThrow('Expected message to be a string')

      it 'should fail when encrypted and second pw is not provided', ->
        a._priv = 'encpriv'
        expect(a.signMessage.bind(a, 'message')).toThrow('Second password needed to decrypt key')

      it 'should fail when called on a watch only address', ->
        a._priv = null
        expect(a.signMessage.bind(a, 'message')).toThrow('Private key needed for message signing')

    describe ".encrypt", ->

      it 'should fail when encryption fails', ->
        wrongEnc = () -> a.encrypt(() -> null)
        expect(wrongEnc).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should write in a temporary field and let the original key intact', ->
        originalKey = a.priv
        a.encrypt(() -> "encrypted key")
        expect(a._temporal_priv).toEqual("encrypted key")
        expect(a.priv).toEqual(originalKey)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should do nothing if watch only address', ->
        a._priv = null
        a.encrypt(() -> "encrypted key")
        expect(a.priv).toEqual(null)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should do nothing if no cipher provided', ->
        originalKey = a.priv
        a.encrypt(undefined)
        expect(a.priv).toEqual(originalKey)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    describe ".decrypt", ->

      it 'should fail when decryption fails', ->
        wrongEnc = () -> a.decrypt(() -> null)
        expect(wrongEnc).toThrow()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should write in a temporary field and let the original key intact', ->
        originalKey = a.priv
        a.decrypt(() -> "decrypted key")
        expect(a._temporal_priv).toEqual("decrypted key")
        expect(a.priv).toEqual(originalKey)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should do nothing if watch only address', ->
        a._priv = null
        a.decrypt(() -> "decrypted key")
        expect(a.priv).toEqual(null)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should do nothing if no cipher provided', ->
        originalKey = a.priv
        a.decrypt(undefined)
        expect(a.priv).toEqual(originalKey)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    describe ".persist", ->

      it 'should do nothing if temporary is empty', ->
        originalKey = a.priv
        a.persist()
        expect(a.priv).toEqual(originalKey)
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

      it 'should swap and delete if we have a temporary value', ->
        a._temporal_priv = "encrypted key"
        temp             = a._temporal_priv
        a.persist()
        expect(a.priv).toEqual(temp)
        expect(a._temporal_priv).not.toBeDefined()
        expect(MyWallet.syncWallet).not.toHaveBeenCalled()

    describe "JSON serializer", ->

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(a, null, 2)
        b = JSON.parse(json, Address.reviver)
        expect(a).toEqual(b)

      it 'should hold: fromJSON . toJSON = id for watchOnly addresses', ->
        a._priv = null
        json = JSON.stringify(a, null, 2)
        b = JSON.parse(json, Address.reviver)
        expect(a).toEqual(b)

      it 'should not serialize non-expected fields', ->
        a.rarefield = "I am an intruder"
        json = JSON.stringify(a, null, 2)
        b = JSON.parse(json)
        expect(b.addr).toBeDefined()
        expect(b.priv).toBeDefined()
        expect(b.tag).toBeDefined()
        expect(b.label).toBeDefined()
        expect(b.created_time).toBeDefined()
        expect(b.created_device_name).toBeDefined()
        expect(b.created_device_version).toBeDefined()
        expect(b.rarefield).not.toBeDefined()
        expect(b._temporary_priv).not.toBeDefined()

      it 'should not deserialize non-expected fields', ->
        json = JSON.stringify(a, null, 2)
        b = JSON.parse(json)
        b.rarefield = "I am an intruder"
        bb = new Address(b)
        expect(bb).toEqual(a)

    describe ".fromString", ->
      beforeEach ->
        Helpers.isBitcoinAddress = (candidate) ->
          return true if candidate == "address"
          false

        Helpers.detectPrivateKeyFormat = (candidate) ->
          return null if candidate == "unknown_format"
          return "bip38" if candidate == "bip_38"
          return "mini" if candidate.indexOf("mini_") == 0
          "sipa"

        Helpers.privateKeyStringToKey = (address, format) ->
          return "mini_address" if address == "mini_address"
          throw "invalid mini" if address == "mini_invalid"


        spyOn(Address, "import").and.callFake((address) ->
          {
            _addr: address
          }
        )


      it "should not import unknown formats", (done) ->
        promise = Address.fromString("unknown_format", null, null)
        expect(promise).toBeRejectedWith('unknown key format', done)

      it "should not import BIP-38 format without a password", (done) ->
        promise = Address.fromString("bip_38", null, null, done)
        expect(promise).toBeRejectedWith('needsBip38', done)

      it "should not import BIP-38 format with an empty password", (done) ->
        promise = Address.fromString("bip_38", null, "", done)
        expect(promise).toBeRejectedWith('needsBip38', done)

      it "should not import BIP-38 format with a bad password", (done) ->
        promise = Address.fromString("bip_38", null, "wrong", done)
        expect(promise).toBeRejectedWith('wrongBipPass', done)

      it "should not import BIP-38 format if the decryption fails", (done) ->
        promise = Address.fromString("bip_38", null, "fail", done)
        expect(promise).toBeRejectedWith('importError', done)

      it "should import BIP-38 format with a correct password", (done) ->
        promise = Address.fromString("bip_38", null, "correct", done)
        expect(promise).toBeResolved(done)

      it "should import valid addresses string", (done) ->
        promise = Address.fromString("address", null, null)
        match = jasmine.objectContaining({_addr: "address"})
        expect(promise).toBeResolvedWith(match, done)

      it "should import private keys using mini format string", (done) ->
        promise = Address.fromString("mini_address", null, null)
        match = jasmine.objectContaining({_addr: "mini_address"})
        expect(promise).toBeResolvedWith(match, done)

      it "should not import private keys using an invalid mini format string", (done) ->
        promise = Address.fromString("mini_invalid", null, null)
        expect(promise).toBeRejected(done)

    describe "Address import", ->
      beforeEach ->
        Helpers.isKey = () -> false
        Helpers.isBitcoinAddress = () -> true

      it "should not import unknown formats", ->
        Helpers.isBitcoinAddress = () -> false
        expect(() -> Address.import("abcd", null)).toThrow()

      it "should not import invalid addresses", ->
        Helpers.isBitcoinAddress = () -> false
        expect(() -> Address.import("19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd66", null)).toThrow()

      it "should import WIF keys", ->
        Helpers.isBitcoinAddress = () -> false
        Helpers.isBitcoinPrivateKey = () -> true
        addr = Address.import("5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU", null)
        expect(addr.address).toEqual("pub_key_for_5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU")

      it "should import valid addresses", ->
        addr = Address.import("19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q", null)
        expect(addr.address).toEqual("19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q")


    describe "Address factory", ->
      beforeEach ->
        Helpers.isKey = () -> false
        Helpers.isBitcoinAddress = () -> true

      it 'should not touch an already existing object', ->
        addr = Address.import("19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q", null)
        fromFactory = Address.factory({}, addr)
        expect(fromFactory['19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q']).toEqual(addr)

    describe "isEncrypted", ->

      it 'should be false if the address has been encrypted but not persisted', ->
        expect(a.isEncrypted).toBeFalsy()
        a.encrypt(() -> 'ZW5jcnlwdGVk')
        expect(a.isEncrypted).toBeFalsy()

      it 'should be true if the address has been encrypted and persisted', ->
        expect(a.isEncrypted).toBeFalsy()
        a.encrypt(() -> 'ZW5jcnlwdGVk')
        a.persist()
        expect(a.isEncrypted).toBeTruthy()

    describe "isUnEncrypted", ->

      it 'should be false if the address has been decrypted but not persisted', ->
        expect(a.isUnEncrypted).toBeTruthy()
        expect(a.isEncrypted).toBeFalsy()
        a.encrypt(() -> 'ZW5jcnlwdGVk')
        a.persist()
        expect(a.isUnEncrypted).toBeFalsy()
        a.decrypt(() -> '5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU')
        expect(a.isUnEncrypted).toBeFalsy()

      it 'should be true if the address has been decrypted and persisted', ->
        expect(a.isEncrypted).toBeFalsy()
        a.encrypt(() -> 'ZW5jcnlwdGVk')
        a.persist()
        expect(a.isUnEncrypted).toBeFalsy()
        a.decrypt(() -> 'GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF')
        expect(a.isUnEncrypted).toBeFalsy()
        a.persist()
        expect(a.isUnEncrypted).toBeTruthy()
