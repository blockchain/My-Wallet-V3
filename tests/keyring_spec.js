let proxyquire = require('proxyquireify')(require);
let KeyRing = proxyquire('../src/keyring', {});
let Base58 = require('bs58');

describe('KeyRing', () => {
  let cache = {
    'receiveAccount': 'xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP',
    'changeAccount': 'xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m'
  };
  let xpriv = 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E';
  let xpub = 'xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq';

  let cacheKR = new KeyRing(null, cache);
  let publicKR = new KeyRing(xpub, null);
  let privateKR = new KeyRing(xpriv, null);

  it('should be constructed from cache', () => {
    expect(cacheKR._receiveChain.xpub).toEqual('xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP');
    expect(cacheKR._changeChain.xpub).toEqual('xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m');
  });

  it('should be constructed from xpub', () => {
    expect(publicKR._receiveChain.xpub).toEqual('xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP');
    expect(publicKR._changeChain.xpub).toEqual('xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m');
  });

  it('should be constructed from xpriv', () => {
    expect(privateKR._receiveChain.xpub).toEqual('xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP');
    expect(privateKR._changeChain.xpub).toEqual('xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m');
  });

  it('should generate key from path when private keyring', () => {
    let pkey = Base58.encode(privateKR.privateKeyFromPath('M/1/101').keyPair.d.toBuffer(32));
    expect(pkey).toEqual('FsY7NFHZNQJL6LzNt7zGqthrMBpfNuDkGwQUCBhQCpTv');
  });

  it('should not generate private key from path when public keyring', () => {
    let pkey = publicKR.privateKeyFromPath('M/1/101');
    expect(pkey).toBe(null);
  });

  it('should not generate private key from path when cached keyring', () => {
    let pkey = cacheKR.privateKeyFromPath('M/1/101');
    expect(pkey).toBe(null);

    pkey = cacheKR.privateKeyFromPath('M/0/101');
    expect(pkey).toBe(null);
  });

  it('should not serialize non-expected fields or xprivs', () => {
    privateKR.rarefield = 'I am an intruder';
    let json = JSON.stringify(privateKR, null, 2);
    let object = JSON.parse(json);
    expect(object.receiveAccount).toBeDefined();
    expect(object.changeAccount).toBeDefined();
    expect(object.rarefield).not.toBeDefined();
    expect(object.receiveAccount).toBe(cache.receiveAccount);
    expect(object.changeAccount).toBe(cache.changeAccount);
  });

  describe('.init', () => {
    it('should not touch an already created object', () => {
      let fromInit = privateKR.init(xpriv, null);
      expect(fromInit).toEqual(privateKR);
    });

    it('should do nothing with undefined arguments on an empty object', () => {
      let kr = new KeyRing();
      let fromInit = kr.init();
      expect(fromInit).toEqual(kr);
    });
  });
});
