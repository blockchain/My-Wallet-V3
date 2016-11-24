proxyquire = require('proxyquireify')(require)

wallet =
  hdwallet:
    getMasterHDNode: () ->

mockPayload = {coinify: {}}

Metadata =
  fromMasterHDNode: (n, masterhdnode) ->
    {
      create: () ->
      fetch: () ->
        Promise.resolve(mockPayload)
    }

Coinify = (obj) ->
  if !obj.trades
    obj.trades = []
  return obj

ExchangeDelegate = () ->
  {}

Coinify.new = () ->
  {
    trades: []
  }

stubs = {
  './coinify/coinify' : Coinify,
  './metadata' : Metadata,
  './exchange-delegate' : ExchangeDelegate
}

External    = proxyquire('../src/external', stubs)

describe "External", ->

  e = undefined

  beforeEach ->
    JasminePromiseMatchers.install()

  afterEach ->
    JasminePromiseMatchers.uninstall()

  describe "class", ->
    describe "new External()", ->
      it "should transform an Object to an External", ->
        e = new External(wallet)
        expect(e.constructor.name).toEqual("External")

  describe "instance", ->
    beforeEach ->
      e = new External(wallet)

    describe "fetch", ->
      it "should include partners if present", (done) ->
        promise = e.fetch().then((res) ->
          expect(e._coinify).toBeDefined()
        )
        expect(promise).toBeResolved(done)

      it "should not cointain any partner by default", (done) ->
        mockPayload = {}
        promise = e.fetch().then((res) ->
          expect(e._coinify).toBeUndefined()
        )
        expect(promise).toBeResolved(done)

      it 'should not deserialize non-expected fields', (done) ->
        mockPayload = {coinify: {}, rarefield: "I am an intruder"}
        promise = e.fetch().then((res) ->
          expect(e._coinify).toBeDefined()
          expect(e._rarefield).toBeUndefined()
        )
        expect(promise).toBeResolved(done)

    describe "addCoinify", ->

        it "should initialize a Coinify object", ->
          e.addCoinify()
          expect(e.coinify).toBeDefined();

        it "should check if already present", ->
          e.addCoinify()
          expect(() -> e.addCoinify()).toThrow()

    describe "JSON serializer", ->
      beforeEach ->
        e  = new External(wallet)
        e._coinify = {}

      it 'should store partners', ->
        json = JSON.stringify(e, null, 2)
        expect(json).toEqual(JSON.stringify({coinify: {}}, null, 2))

      it 'should not serialize non-expected fields', ->
        e.rarefield = "I am an intruder"
        json = JSON.stringify(e, null, 2)
        b = JSON.parse(json)

        expect(b.coinify).toBeDefined()
        expect(b.rarefield).not.toBeDefined()
