proxyquire = require('proxyquireify')(require)
MyWallet = {}
stubs = { './wallet': MyWallet }
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

  describe "Constructor", ->

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

  describe "Setter", ->

    beforeEach ->
      a = new Address(object)
      spyOn(MyWallet, "syncWallet")

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

