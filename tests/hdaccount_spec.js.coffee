proxyquire = require('proxyquireify')(require)
HDAccount   = proxyquire('../src/hd-account', {})

describe "HDAccount", ->
  account = HDAccount.fromExtPublicKey("xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq", undefined, "Example account");

  describe "JSON serializer", ->

    it 'should hold: fromJSON . toJSON = id', ->
      json1     = JSON.stringify(account, null, 2)
      account2 = JSON.parse(json1, HDAccount.reviver)
      json2     = JSON.stringify(account2, null, 2)
      expect(json1).toEqual(json2)
