proxyquire = require('proxyquireify')(require)
Wallet = proxyquire('../src/blockchain-wallet', {})

describe "getTags()", ->
  wallet = new Wallet()
  it "should be an empty array", ->
    pending()
    # expect(wallet.getTags()).toEqual([])
