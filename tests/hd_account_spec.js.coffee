proxyquire = require('proxyquireify')(require)

stubs = {}

HDAccount = proxyquire('../src/hd-account', stubs)
Bitcoin = require('bitcoinjs-lib')
Buffer = require('buffer').Buffer


data = null
cache = null
result = null

describe "HDAccount", ->

  beforeEach ->
    data =
      seed: 'dab7b88ddbb42008cb97e97056d87e7f'

      xpub: 'xpub6CLAAj2CbG6x1ush31p7tAKvSHrobQKHUS82LUcN8jsWuyJDhZ5CN4ghn6dx5dr6mKP3rWSfMaiYXfnNoCkJGTShZjiV32AmM8iW5oQ8wLg'
      xpriv: 'xprv9yLomDVJktYeoRoDvzH7X2PBtG2KBwbS7DCRY6CkaQLY3Ay5A1kwpGNDvnaR6WvuckKDT2Sen4AAhE1ZG4svVWCaSDQnpPrBnKdfAoaiLXE'

      label: 'Test'
      index: 0

    cache =
      changeAccount: "xpub6F7ynyBM2LWmrgGxKK7g6cLVqYmkeX3kGQHnR7FN9Yy6uqKyQge8iEWUhxHZRiKaFixprq6U1jNeRVEprrKyG4R2MovGc4A2FbJ1ypaU16q"
      receiveAccount: "xpub6F7ynyBM2LWmqM3RbhVRMJ7AQhmCeznwmc3JwSwvBmYiNi8pZkmkPu3ZQT7aXLobarBGxSxgNiswZZo57jvNLRgKbBXEJt3riFwkdjquKSY"

    result =
      internalXpub: 'xpub6F7ynyBM2LWmrgGxKK7g6cLVqYmkeX3kGQHnR7FN9Yy6uqKyQge8iEWUhxHZRiKaFixprq6U1jNeRVEprrKyG4R2MovGc4A2FbJ1ypaU16q'
      externalXpub: 'xpub6F7ynyBM2LWmqM3RbhVRMJ7AQhmCeznwmc3JwSwvBmYiNi8pZkmkPu3ZQT7aXLobarBGxSxgNiswZZo57jvNLRgKbBXEJt3riFwkdjquKSY'

  describe ".fromCache()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromCache(cache, data.label, data.index)

    it "should create the internal and external account", ->
      expect(account.internalAccount.toBase58()).toBe(result.internalXpub)
      expect(account.externalAccount.toBase58()).toBe(result.externalXpub)

    it "should re-create the cache", ->
      expect(account.cache.changeAccount).toBe(result.internalXpub)
      expect(account.cache.receiveAccount).toBe(result.externalXpub)

  describe ".fromExtKey()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should create the internal and external account", ->
      expect(account.internalAccount.neutered().toBase58()).toBe(result.internalXpub)
      expect(account.externalAccount.neutered().toBase58()).toBe(result.externalXpub)

    it "should generate the cache", ->
      account.generateCache()
      expect(account.cache.changeAccount).toBe(result.internalXpub)
      expect(account.cache.receiveAccount).toBe(result.externalXpub)
