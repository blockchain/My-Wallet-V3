proxyquire = require('proxyquireify')(require)
KeyRing   = proxyquire('../src/keyring', {})
Base58     = require('bs58');


describe "KeyRing", ->

  cache =
    "receiveAccount": "xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP"
    "changeAccount": "xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m"
  xpriv = "xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E"
  xpub  = "xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq"

  cacheKR   = new KeyRing(null , cache)
  publicKR  = new KeyRing(xpub , null)
  privateKR = new KeyRing(xpriv, null)

  it "should be constructed from cache", ->
    expect(cacheKR._receiveChain.xpub).toEqual("xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP")
    expect(cacheKR._changeChain.xpub).toEqual("xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m")

  it "should be constructed from xpub", ->
    expect(publicKR._receiveChain.xpub).toEqual("xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP")
    expect(publicKR._changeChain.xpub).toEqual("xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m")

  it "should be constructed from xpriv", ->
    expect(privateKR._receiveChain.xpub).toEqual("xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP")
    expect(privateKR._changeChain.xpub).toEqual("xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m")

  it "should generate key from path when private keyring", ->
    pkey = Base58.encode(privateKR.privateKeyFromPath("M/1/101").d.toBuffer(32))
    expect(pkey).toEqual("FsY7NFHZNQJL6LzNt7zGqthrMBpfNuDkGwQUCBhQCpTv")

  it "should not generate key from path when public keyring", ->
    pkey = publicKR.privateKeyFromPath("M/1/101")
    expect(pkey).toBe(null)

  it "should not generate key from path when cached keyring", ->
    pkey = cacheKR.privateKeyFromPath("M/1/101")
    expect(pkey).toBe(null)

    pkey = cacheKR.privateKeyFromPath("M/0/101")
    expect(pkey).toBe(null)

  it 'should not serialize non-expected fields or xprivs', ->
    privateKR.rarefield = "I am an intruder"
    json = JSON.stringify(privateKR, null, 2)
    object = JSON.parse(json)
    expect(object.receiveAccount).toBeDefined()
    expect(object.changeAccount).toBeDefined()
    expect(object.rarefield).not.toBeDefined()
    expect(object.receiveAccount).toBe(cache.receiveAccount)
    expect(object.changeAccount).toBe(cache.changeAccount)

  describe ".init", ->
    it "should not touch an already created object", ->
      fromInit = privateKR.init(xpriv, null)
      expect(fromInit).toEqual(privateKR)

    it "should do nothing with undefined arguments on an empty object", ->
      kr = new KeyRing()
      fromInit = kr.init()
      expect(fromInit).toEqual(kr)
