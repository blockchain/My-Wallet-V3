proxyquire = require('proxyquireify')(require)

MyWallet = {
  wallet: {
    syncWallet: () ->
  }
}

Coinify = (obj) ->
  return

Coinify.new = () ->
  {}

stubs = {
  './wallet': MyWallet,
  './coinify' : Coinify
}

External    = proxyquire('../src/external', stubs)

describe "External", ->

  e = undefined

  beforeEach ->
    spyOn(MyWallet, "syncWallet")

  describe "class", ->
    describe "new External()", ->
      it "should transform an Object to an External", ->
        e = new External({coinify: {}})
        expect(e.constructor.name).toEqual("External")

      it "should include partners if present", ->
        e = new External({coinify: {}})
        expect(e.coinify).toBeDefined()

      it "should not cointain any partner by default", ->
        e = new External({})
        expect(e.coinify).not.toBeDefined()

  describe "instance", ->
    beforeEach ->
      e = new External({})

    describe "addCoinify", ->

        it "should initialize a Coinify object", ->
          e.addCoinify()
          expect(e.coinify).toBeDefined();

        it "should sync wallet", ->
          e.addCoinify()
          expect(MyWallet.syncWallet).toHaveBeenCalled()

        it "should check if already present", ->
          e.addCoinify()
          expect(() -> e.addCoinify()).toThrow()

    describe "JSON serializer", ->
      beforeEach ->
        e  = new External({coinify: {}})

      it 'should hold: fromJSON . toJSON = id', ->
        json = JSON.stringify(e, null, 2)
        b = JSON.parse(json, External.reviver)
        expect(e).toEqual(b)

      it 'should not serialize non-expected fields', ->
        e.rarefield = "I am an intruder"
        json = JSON.stringify(e, null, 2)
        b = JSON.parse(json)

        expect(b.coinify).toBeDefined()
        expect(b.rarefield).not.toBeDefined()

      it 'should not deserialize non-expected fields', ->
        b = new External({coinify: {}, rarefield: "I am an intruder"})
        expect(b).toEqual(e)
