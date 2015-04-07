describe "getTags()", ->
  it "should be an empty array", ->
    expect(WalletStore.getTags("some_tx_hash")).toEqual([])