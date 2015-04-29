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
      changeChain:  cache.changeAccount
      receiveChain: cache.receiveAccount

  describe ".fromCache()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromCache(cache, data.label, data.index)

    it "should create the internal and external account", ->
      expect(account.changeChain.toBase58()).toBe(result.changeChain)
      expect(account.receiveChain.toBase58()).toBe(result.receiveChain)

    it "should re-create the cache", ->
      expect(account.cache.changeAccount).toBe(result.changeChain)
      expect(account.cache.receiveAccount).toBe(result.receiveChain)

  describe ".fromExtKey()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should create the internal and external account", ->
      expect(account.changeChain.neutered().toBase58()).toBe(result.changeChain)
      expect(account.receiveChain.neutered().toBase58()).toBe(result.receiveChain)

    it "should generate the cache", ->
      account.generateCache()
      expect(account.cache.changeAccount).toBe(result.changeChain)
      expect(account.cache.receiveAccount).toBe(result.receiveChain)
