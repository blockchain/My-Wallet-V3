proxyquire = require('proxyquireify')(require)
KeyRing   = proxyquire('../src/hd-account', {})

describe "HDAccount", ->

  it "should be placeholder", ->
    pending()
