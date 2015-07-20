proxyquire = require('proxyquireify')(require)
HDWallet   = proxyquire('../src/hd-wallet', {})

describe "HDWallet", ->

  it "should be placeholder", ->
    pending()
