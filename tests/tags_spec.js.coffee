proxyquire = require('proxyquireify')(require)

WalletStore = proxyquire('../src/wallet-store', {})


describe "getTags()", ->
  it "should be an empty array", ->
    expect(WalletStore.getTags("some_tx_hash")).toEqual([])
