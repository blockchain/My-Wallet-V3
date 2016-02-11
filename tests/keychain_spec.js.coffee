proxyquire = require('proxyquireify')(require)
KeyChain   = proxyquire('../src/keychain', {})
Base58     = require('bs58');

describe "KeyChain constructor", ->

  it "should construct from cache", ->
    receiveAccount = "xpub6EFgBWeVDxjHRXVj1GviKqBcLZT6pK8fnpQC9DwXHmLtUjWMdg3MHLCksWcUSn7AUqkYWE4vHUG73NKANWJuCH3sJfvjfk4HZUjwfrRA7p1"
    kc = new KeyChain(null, null, receiveAccount)
    address = kc.getAddress(100);
    expect(address).toEqual("1AFu9ceBtznn9AFDrEiXNaUV6aNXWv5dGk")

  it "should construct from extended public key and index", ->
    xpub = "xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq"
    kc = new KeyChain(xpub, 0, null)
    address = kc.getAddress(100);
    expect(address).toEqual("16XJvK8jvEfh9R4bnfyovUrWqCp57fg4j1")

  it "should construct from extended private key and get key for index", ->
    xpriv = "xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E"
    kc = new KeyChain(xpriv, 0, null)
    pkey = Base58.encode(kc.getPrivateKey(100).keyPair.d.toBuffer(32));
    expect(pkey).toEqual("ETsc7CKyRYFNzHPVfR4GDPj3NyJBMLiACRrXg814tJ5w")

  it "should not print xpriv when you ask for xpub", ->
    xpriv = "xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E"
    kc = new KeyChain(xpriv, 0, null)
    expect(kc.xpub).toEqual("xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP")
