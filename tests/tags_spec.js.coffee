describe "getTags()", ->
  it "should be an empty array", ->
    expect(MyWallet.getTags("some_tx_hash")).toEqual([])