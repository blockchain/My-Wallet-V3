proxyquire = require('proxyquireify')(require)
RNG   = proxyquire('../src/rng', {})

describe "RNG.xor", ->

  it "should be an xor operation", ->
    A = new Buffer('a123456c', 'hex')
    B = new Buffer('ff0123cd', 'hex')
    R = '5e2266a1'
    expect(RNG.xor(A,B).toString('hex')).toEqual(R)
