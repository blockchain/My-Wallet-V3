let proxyquire = require('proxyquireify')(require);
let KeyChain = proxyquire('../src/keychain', {});
let Base58 = require('bs58');

describe('KeyChain constructor', () => {
  it('should construct from cache', () => {
    let receiveAccount = 'xpub6EFgBWeVDxjHRXVj1GviKqBcLZT6pK8fnpQC9DwXHmLtUjWMdg3MHLCksWcUSn7AUqkYWE4vHUG73NKANWJuCH3sJfvjfk4HZUjwfrRA7p1';
    let kc = new KeyChain(null, null, receiveAccount);
    let address = kc.getAddress(100);
    expect(address).toEqual('1AFu9ceBtznn9AFDrEiXNaUV6aNXWv5dGk');
  });

  it('should construct from extended public key and index', () => {
    let xpub = 'xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq';
    let kc = new KeyChain(xpub, 0, null);
    let address = kc.getAddress(100);
    expect(address).toEqual('16XJvK8jvEfh9R4bnfyovUrWqCp57fg4j1');
  });

  it('should construct from extended private key and get key for index', () => {
    let xpriv = 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E';
    let kc = new KeyChain(xpriv, 0, null);
    let pkey = Base58.encode(kc.getPrivateKey(100).keyPair.d.toBuffer(32));
    expect(pkey).toEqual('ETsc7CKyRYFNzHPVfR4GDPj3NyJBMLiACRrXg814tJ5w');
  });

  it('should not print xpriv when you ask for xpub', () => {
    let xpriv = 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E';
    let kc = new KeyChain(xpriv, 0, null);
    expect(kc.xpub).toEqual('xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP');
  });

  it('should not create a chain given an invalid index', () => {
    let xpriv = 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E';
    let kc = new KeyChain(xpriv, -1, null);
    expect(kc.xpub).toEqual(null);
  });

  describe('.init', () =>
    it('should not overwrite an existing chain', () => {
      let xpriv = 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E';
      let kc = new KeyChain(xpriv, 0, null);
      let fromInit = kc.init('xprv9yko4kDvhYSdUcqK5e8naLwtGE1Ca57mwJ6JMB8WxeYq8t1w3PpiZfGGvLN6N6GEwLF8XuHnp8HeNLrWWviAjXxb2BFEiLaW2UgukMZ3Zva', 0, null);
      expect(fromInit.xpub).toEqual(kc.xpub);
    })
  );
});
