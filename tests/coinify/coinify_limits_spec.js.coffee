
proxyquire = require('proxyquireify')(require)

stubs = {
}

Limits = proxyquire('../../src/coinify/limits', stubs)

# Tests both limits.js and limit.js
describe "CoinifyLimits", ->
  remainingObj = undefined
  limitsObj = undefined

  remaining = undefined
  limits = undefined

  beforeEach ->

    remainingObj = {
      card:
        in: 100
      bank:
        in: 1000
        out: 1000
    }

    limitsObj = {
      card:
        in:
          daily: 100
      bank:
        in:
          daily: 1000
        out:
          daily: 1000
    }

    remaining = new Limits(remainingObj)
    limits = new Limits(limitsObj)


  describe "class", ->
    describe "new Limits()", ->
      it "should process remaining amounts", ->
        expect(remaining.card.inRemaining).toBe(100)
        expect(remaining.bank.inRemaining).toBe(1000)
        expect(remaining.bank.outRemaining).toBe(1000)

      it "should process daily limit", ->
        expect(limits.card.inDaily).toBe(100)
        expect(limits.bank.inDaily).toBe(1000)
        expect(limits.bank.outDaily).toBe(1000)
