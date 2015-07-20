proxyquire = require('proxyquireify')(require)
KeyRing   = proxyquire('../src/hd-wallet', {})

describe "HDWallet", ->

  it "should be placeholder", ->
    pending()
