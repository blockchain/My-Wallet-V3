
proxyquire = require('proxyquireify')(require)

Limits = () ->
  {limits: 'limits_mock'}

stubs = {
  './limits' : Limits
}

Level = proxyquire('../../src/coinify/level', stubs)

describe "CoinifyLevel", ->
  obj = undefined
  level = undefined

  beforeEach ->
    obj =
      currency: "EUR"
      feePercentage: 3
      limits: {}
      requirements: {}
      name: "1"

  describe "class", ->
    describe "constructor", ->
      it "should set properties", ->
        level = new Level(obj)
        expect(level._name).toEqual('1')
        expect(level._requirements).toEqual({})
        expect(level._feePercentage).toEqual(3)
        expect(level._currency).toEqual('EUR')

      it "should create a Limits object", ->
        level = new Level(obj)
        expect(level._limits).toEqual({limits: 'limits_mock'})

  describe "instance", ->
    beforeEach ->
      level = new Level(obj)

    it "should have getters", ->
      expect(level.currency).toEqual('EUR')
      expect(level.name).toEqual('1')
      expect(level.requirements).toEqual({})
      expect(level.limits).toEqual({limits: 'limits_mock'})
      expect(level.feePercentage).toEqual(3)
