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
      receiveAddress0:  '1BvLArNafRnVFGkJWC62sedPsgUXGL1VSt'
      receiveAddress1:  '1CRs95vMDVh64BLSn7mNs4stFZCrecT8Fy'
      receiveAddress42: '17SNgZfdpWPJUE6sdU2nw3XcBuL4tBUWk9'
      changeAddress0:   '13XhrZFvDBzw1L3qhEecfEKcU3ryqfnfHm'
      changeAddress1:   '1BNRMSnSZpitrMPquwCSoiM3JqUhdt9WoK'
      changeAddress42:  '1A4wncLbY7sjBaFqga2STu4GyYY6FK4bLo'

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

  describe "address generation", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should generate a change address", ->
      expect(account.getChangeAddress()).toBe(result.changeAddress0)
      expect(account.getChangeAddressAtIndex(0)).toBe(result.changeAddress0)

    it "should generate different change addresses at different indexes", ->
      address0 = account.getChangeAddressAtIndex(0)
      address1 = account.getChangeAddressAtIndex(1)
      expect(address0).not.toBe(address1)

    it "should generate a receive address", ->
      expect(account.getReceiveAddress()).toBe(result.receiveAddress0)
      expect(account.getReceiveAddressAtIndex(0)).toBe(result.receiveAddress0)

    it "should generate different receive addresses at different indexes", ->
      address0 = account.getReceiveAddressAtIndex(0)
      address1 = account.getReceiveAddressAtIndex(1)
      expect(address0).not.toBe(address1)

    it "should generate the next receive address after incrementReceiveIndex", ->
      address0 = account.getReceiveAddress()
      account.incrementReceiveIndex()
      address1 = account.getReceiveAddress()
      expect(address0).toBe(result.receiveAddress0)
      expect(address1).toBe(result.receiveAddress1)

    it "should generate the right receive addresses from generateKeyFromPath", ->
      receiveNode0 = account.generateKeyFromPath('M/0/0')
      expect(receiveNode0.depth).toBe(5)
      expect(receiveNode0.index).toBe(0)
      receiveNode1 = account.generateKeyFromPath('M/0/1')
      expect(receiveNode1.depth).toBe(5)
      expect(receiveNode1.index).toBe(1)
      receiveNode42 = account.generateKeyFromPath('M/0/42')
      expect(receiveNode42.depth).toBe(5)
      expect(receiveNode42.index).toBe(42)
      address0 = receiveNode0.getAddress().toBase58Check()
      address1 = receiveNode1.getAddress().toBase58Check()
      address42 = receiveNode42.getAddress().toBase58Check()
      expect(address0).toBe(result.receiveAddress0)
      expect(address1).toBe(result.receiveAddress1)
      expect(address42).toBe(result.receiveAddress42)

    it "should generate the right change addresses from generateKeyFromPath", ->
      changeNode0 = account.generateKeyFromPath('M/1/0')
      expect(changeNode0.depth).toBe(5)
      expect(changeNode0.index).toBe(0)
      changeNode1 = account.generateKeyFromPath('M/1/1')
      expect(changeNode1.depth).toBe(5)
      expect(changeNode1.index).toBe(1)
      changeNode42 = account.generateKeyFromPath('M/1/42')
      expect(changeNode42.depth).toBe(5)
      expect(changeNode42.index).toBe(42)
      address0 = changeNode0.getAddress().toBase58Check()
      address1 = changeNode1.getAddress().toBase58Check()
      address42 = changeNode42.getAddress().toBase58Check()
      expect(address0).toBe(result.changeAddress0)
      expect(address1).toBe(result.changeAddress1)
      expect(address42).toBe(result.changeAddress42)

    it "should throw erros from generateKeyFromPath with wrong input", ->
      try
        account.generateKeyFromPath('X/1/0/')
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('Invalid Path prefix')

      try
        account.generateKeyFromPath('M/3/0/')
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('Invalid Path: change/receive index out of bounds')

      try
        account.generateKeyFromPath('M/1/0/3')
      catch e
        expect(e.name).toBe('AssertionError')
        expect(e.message).toBe('Invalid Path length')

    it "should cache generated addresses from generateKeyFromPath", ->
      expect(account.containsAddressInCache(result.changeAddress0)).toBe(false)
      expect(account.containsAddressInCache(result.changeAddress1)).toBe(false)
      changeNode0 = account.generateKeyFromPath('M/1/0')
      expect(account.containsAddressInCache(result.changeAddress0)).toBe(true)
      expect(account.containsAddressInCache(result.changeAddress1)).toBe(false)
      changeNode1 = account.generateKeyFromPath('M/1/1')
      expect(account.containsAddressInCache(result.changeAddress0)).toBe(true)
      expect(account.containsAddressInCache(result.changeAddress1)).toBe(true)
      changeNode0Again = account.generateKeyFromPath('M/1/0')
      expect(changeNode0).toBe(changeNode0Again)

      expect(account.containsAddressInCache(result.receiveAddress0)).toBe(false)
      expect(account.containsAddressInCache(result.receiveAddress1)).toBe(false)
      receiveNode0 = account.generateKeyFromPath('M/0/0')
      expect(account.containsAddressInCache(result.receiveAddress0)).toBe(true)
      expect(account.containsAddressInCache(result.receiveAddress1)).toBe(false)
      receiveNode1 = account.generateKeyFromPath('M/0/1')
      expect(account.containsAddressInCache(result.receiveAddress0)).toBe(true)
      expect(account.containsAddressInCache(result.receiveAddress1)).toBe(true)
      receiveNode0Again = account.generateKeyFromPath('M/0/0')
      expect(receiveNode0).toBe(receiveNode0Again)

  describe ".getAccountJsonData()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should create the JSON output", ->
      json = account.getAccountJsonData()
      expect(json.label).toBe(data.label)
      expect(json.archived).toBe(false)
      expect(json.xpriv).toBe(null)
      expect(json.xpub).toBe(null)
      expect(json.cache).toBe(account.cache)

  describe ".recommendedTransactionFee()", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should be correct", ->
      expect(account.recommendedTransactionFee()).toBe(10000)


  describe "address labels", ->
    account = null

    beforeEach ->
      account = HDAccount.fromExtKey(data.xpub, data.label, data.index)

    it "should correctly set, retrieve and unset", ->
      expect(account.address_labels.length).toBe(0)
      account.setLabelForAddress(3, 'test')
      expect(account.address_labels.length).toBe(1)

      account.setLabelForAddress(7, 'test 2')
      expect(account.address_labels.length).toBe(2)
      expect(account.getLabelForReceiveAddress(7).label).toBe('test 2')

      didUnset = account.unsetLabelForAddress(3)
      expect(account.address_labels.length).toBe(1)
      expect(didUnset).toBe(true)

      didUnset = account.unsetLabelForAddress(3)
      expect(account.address_labels.length).toBe(1)
      expect(didUnset).toBe(false)

      didUnset = account.unsetLabelForAddress(7)
      expect(account.address_labels.length).toBe(0)
      expect(didUnset).toBe(true)

      didUnset = account.unsetLabelForAddress(7)
      expect(account.address_labels.length).toBe(0)
      expect(didUnset).toBe(false)
