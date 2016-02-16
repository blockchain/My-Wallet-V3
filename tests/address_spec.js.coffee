proxyquire = require('proxyquireify')(require)
MyWallet = {
  wallet: {
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
          toString: () ->
            "random_address"
        pub: {

        }
        d:
          toBuffer: () ->
            pk + "_private_key_buffer"
      }
  }
}

Base58 = {
  encode: (v) -> v + "_base58"
}

Helpers = {
  isBitcoinAddress: () -> false
  isKey: () -> true
  isBitcoinPrivateKey: () -> false
}

RNG = {
  run: (input) ->
    if RNG.shouldThrow
      throw 'Connection failed'
    "random"
}

stubs = {
  './wallet': MyWallet,
  'bitcoinjs-lib' : Bitcoin,
  './helpers' : Helpers,
  'bs58' : Base58,
  './rng' : RNG
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

      it "should return an address", ->
        a = Address.new("My New Address")
        expect(a.label).toEqual("My New Address")

      it "should generate a random private key", ->
        a = Address.new("My New Address")
        expect(a.priv).toBe("random_private_key_buffer_base58")

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

      it "private key is read only", ->
        a.priv = "not allowed"
        expect(a.priv).toEqual("GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF")

      it "address is read only", ->
        a.address = "not allowed"
        expect(a.address).toEqual("1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN")

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

    describe "Address import", ->
      it '', ->
        pending()

    describe "Address factory", ->
      it '', ->
        pending()
