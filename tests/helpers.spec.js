let proxyquire = require('proxyquireify')(require);
let Bitcoin = require('bitcoinjs-lib');
let BigInteger = require('bigi');

const ImportExport = {
  shouldResolve: false,
  shouldReject: false,
  shouldFail: true,

  parseBIP38toECPair (b58, pass, succ, wrong, error) {
    if (ImportExport.shouldResolve) {
      succ(new Bitcoin.ECPair(BigInteger.fromByteArrayUnsigned(BigInteger.fromBuffer(new Buffer('E9873D79C6D87DC0FB6A5778633389F4453213303DA61F20BD67FC233AA33262', 'hex')).toByteArray()), null, {compressed: true}));
    } else if (ImportExport.shouldReject) {
      wrong();
    } else if (ImportExport.shouldFail) {
      error();
    }
  }
};

describe('Helpers', () => {
  let Helpers = proxyquire('../src/helpers', {
    './import-export': ImportExport
  });

  describe('getHostName', () =>
    it('should be localhost in Jasmine', () => expect(Helpers.getHostName()).toEqual('localhost'))
  );

  describe('TOR', () => {
    it('should be detected based on window.location', () => {
      // hostname is "localhost" in test:
      expect(Helpers.tor()).toBeFalsy();

      spyOn(Helpers, 'getHostName').and.returnValue('blockchainbdgpzk.onion');
      expect(Helpers.tor()).toBeTruthy();
    });

    it('should not detect false positives', () => {
      spyOn(Helpers, 'getHostName').and.returnValue('the.onion.org');
      expect(Helpers.tor()).toBeFalsy();
    });
  });

  describe('isBitcoinAddress', () => {
    it('should recognize valid addresses', () => {
      expect(Helpers.isBitcoinAddress('1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb')).toBeTruthy();
      expect(Helpers.isBitcoinAddress('3A1KUd5H4hBEHk4bZB4C3hGgvuXuVX7p7t')).toBeTruthy();
    });

    it('should not recognize bad addresses', () => {
      expect(Helpers.isBitcoinAddress('1KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEa')).toBeFalsy();
      expect(Helpers.isBitcoinAddress('5KM7w12SkjzJ1FYV2g1UCMzHjv3pkMgkEb')).toBeFalsy();
      expect(Helpers.isBitcoinAddress('1KM7w12SkjzJ1FYV2g1UCMzHjv')).toBeFalsy();
    });
  });

  describe('isAlphaNum', () => {
    it('should recognize alphanumerical strings', () => expect(Helpers.isAlphaNum('a,sdfw-g4+ 234e1.1_')).toBeTruthy());

    it('should not recognize non alphanumerical strings', () => {
      expect(Helpers.isAlphaNum('')).toBeFalsy();
      expect(Helpers.isAlphaNum(122342)).toBeFalsy();
      expect(Helpers.isAlphaNum({'a': 1})).toBeFalsy();
    });
  });

  describe('isSeedHex', () => {
    it('should recognize seed hex', () => expect(Helpers.isAlphaNum('0123456789abcdef0123456789abcdef')).toBeTruthy());

    it('should not recognize non valid seed hex', () => {
      expect(Helpers.isSeedHex('')).toBeFalsy();
      expect(Helpers.isSeedHex(122342)).toBeFalsy();
      expect(Helpers.isSeedHex({'a': 1})).toBeFalsy();
      expect(Helpers.isSeedHex('4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn')).toBeFalsy();
    });
  });

  describe('and', () =>
    it('should work', () => {
      expect(Helpers.and(0, 1)).toBeFalsy();
      expect(Helpers.and(1, 0)).toBeFalsy();
      expect(Helpers.and(1, 1)).toBeTruthy();
      expect(Helpers.and(0, 0)).toBeFalsy();
    })
  );

  describe('isBitcoinPrivateKey', () => {
    it('should recognize valid private keys', () => expect(Helpers.isBitcoinPrivateKey('5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn')).toBeTruthy());

    it('should not recognize private keys with a bad header', () => expect(Helpers.isBitcoinPrivateKey('4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn')).toBeFalsy());

    it('should not recognize private keys with a bad checksum', () => expect(Helpers.isBitcoinPrivateKey('4JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gw')).toBeFalsy());

    it('should not recognize private keys with a bad length', () => expect(Helpers.isBitcoinPrivateKey('5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUC')).toBeFalsy());
  });

  describe('isPositiveInteger', () => {
    it('should include 1', () => expect(Helpers.isPositiveInteger(1)).toBe(true));

    it('should include 0', () => expect(Helpers.isPositiveInteger(0)).toBe(true));

    it('should exclude -1', () => expect(Helpers.isPositiveInteger(-1)).toBe(false));

    it('should exclude 1.1', () => expect(Helpers.isPositiveInteger(1.1)).toBe(false));
  });

  describe('isPositiveNumber', () => {
    it('should include 1', () => expect(Helpers.isPositiveNumber(1)).toBe(true));

    it('should include 0', () => expect(Helpers.isPositiveNumber(0)).toBe(true));

    it('should exclude -1', () => expect(Helpers.isPositiveNumber(-1)).toBe(false));

    it('should include 1.1', () => expect(Helpers.isPositiveNumber(1.1)).toBe(true));
  });

  describe('scorePassword', () => {
    it('should give a good score to strong passwords', () => {
      expect(Helpers.scorePassword('u*3Fq1D&qvq3Qy6045^NcDJhD0TODs') > 60).toBeTruthy();
      expect(Helpers.scorePassword('&T3m#ABtzlJCH0Nv!QQ4') > 60).toBeTruthy();
      expect(Helpers.scorePassword('I!&JrqDszO') > 60).toBeTruthy();
    });

    it('should give a low score to weak passwords', () => {
      expect(Helpers.scorePassword('correctbattery') < 20).toBeTruthy();
      expect(Helpers.scorePassword('123456123456123456') < 20).toBeTruthy();
      expect(Helpers.scorePassword('') === 0).toBeTruthy();
    });

    it('should set a score of 0 to non strings', () => expect(Helpers.scorePassword(0) === 0).toBeTruthy());
  });

  describe('asyncOnce', () => {
    let observer;

    beforeEach(() => {
      jasmine.clock().uninstall();
      jasmine.clock().install();
      observer = {
        func: jasmine.createSpy('func'),
        before: jasmine.createSpy('before')
      };
    });

    it('should only execute once', () => {
      let async = Helpers.asyncOnce(observer.func, 20, observer.before);

      async();
      async();
      async();
      async();

      jasmine.clock().tick(10);

      expect(observer.func).toHaveBeenCalledTimes(0);
      expect(observer.before).toHaveBeenCalledTimes(4);

      jasmine.clock().tick(10);

      expect(observer.func).toHaveBeenCalledTimes(1);
      expect(observer.before).toHaveBeenCalledTimes(4);
    });

    it('should work with arguments', () => {
      let async = Helpers.asyncOnce(observer.func, 20, observer.before);

      async(1);
      async(1);
      async(1);
      async(1);

      jasmine.clock().tick(10);

      expect(observer.func).toHaveBeenCalledTimes(0);
      expect(observer.before).toHaveBeenCalledTimes(4);

      jasmine.clock().tick(10);

      expect(observer.func).toHaveBeenCalledTimes(1);
      expect(observer.func).toHaveBeenCalledWith(1);
      expect(observer.before).toHaveBeenCalledTimes(4);
    });
  });

  describe('guessFee', () =>
    // TODO make these tests pass
    //    it "should not compute fee for null input", ->
    //      expect(Helpers.guessFee(1, 1, null)).toBe(NaN)
    //      expect(Helpers.guessFee(null, 1, 10000)).toBe(NaN)
    //      expect(Helpers.guessFee(1, null, 10000)).toBe(NaN)

    // it 'should not return a fee when using negative values', ->
    //  expect(Helpers.guessFee(-1, 1, 10000)).toEqual(NaN)
    //  expect(Helpers.guessFee(1, -1, 10000)).toEqual(NaN)
    //  expect(Helpers.guessFee(1, 1, -10000)).toEqual(NaN)

    // it 'should not return a fee when using non integer values', ->
    //  expect(Helpers.guessFee(1.5, 1, 10000)).toEqual(NaN)
    //  expect(Helpers.guessFee(1, 1.2, 10000)).toEqual(NaN)

    // (148 * input + 34 * outputs + 10) * fee per kb (10 = overhead)
    describe('standard formula', () => {
      it('should work for 1 input, 1 output and 10000 fee per kB', () => expect(Helpers.guessFee(1, 1, 10000)).toEqual(1920));

      it('should work for 1 input, 2 output and 10000 fee per kB', () => expect(Helpers.guessFee(1, 2, 10000)).toEqual(2260));

      it('should round up for 2 input, 1 output and 10000 fee per kB', () => expect(Helpers.guessFee(2, 1, 10000)).toEqual(3401));

      it('should work for 1 input, 1 output and 15000 fee per kB', () => expect(Helpers.guessFee(1, 1, 15000)).toEqual(2880));
    })
  );

  describe('guessSize', () =>
    // TODO make these tests pass
    //    it "should not compute size for null input", ->
    //      expect(Helpers.guessSize(1, 1)).toBe(NaN)
    //      expect(Helpers.guessSize(null, 1)).toBe(NaN)
    //      expect(Helpers.guessSize(1, null)).toBe(NaN)

    // it 'should not return a fee when using negative values', ->
    //  expect(Helpers.guessSize(-1, 1)).toEqual(NaN)
    //  expect(Helpers.guessSize(1, -1)).toEqual(NaN)
    //  expect(Helpers.guessSize(1, 1)).toEqual(NaN)

    // it 'should not return a fee when using non integer values', ->
    //  expect(Helpers.guessSize(1.5, 1)).toEqual(NaN)
    //  expect(Helpers.guessSize(1, 1.2)).toEqual(NaN)

    // (148 * input + 34 * outputs + 10) (10 = overhead)
    describe('standard formula', () => {
      it('should work for 1 input, 1 output', () => expect(Helpers.guessSize(1, 1)).toEqual(192));

      it('should work for 1 input, 2 output', () => expect(Helpers.guessSize(1, 2, 10000)).toEqual(226));

      it('should work for 2 input, 1 output', () => expect(Helpers.guessSize(2, 1, 10000)).toEqual(340));
    })
  );

  describe('isValidBIP39Mnemonic', () => {
    it('should recognize BIP-39 test vectors', () => {
      expect(Helpers.isValidBIP39Mnemonic('letter advice cage absurd amount doctor acoustic avoid letter advice cage above')).toBeTruthy();
      expect(Helpers.isValidBIP39Mnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')).toBeTruthy();
      expect(Helpers.isValidBIP39Mnemonic('vessel ladder alter error federal sibling chat ability sun glass valve picture')).toBeTruthy();
      expect(Helpers.isValidBIP39Mnemonic('cat swing flag economy stadium alone churn speed unique patch report train')).toBeTruthy();
    });

    it('should not recognize invalid mnemonics', () => {
      expect(Helpers.isValidBIP39Mnemonic('letter advice cage absurd amount doctor acoustic avoid lettre advice cage above')).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic('abandon abandn abandon abandon abandon abandon abandon abandon abandon abandon abandon about')).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic('vessel ladder alter error federal sibling chat ability sun glass valves picture')).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic('cat swing flag economy stadum alone churn speed unique patch report train')).toBeFalsy();
    });

    it("should not recognize things that aren't mnemonics", () => {
      expect(Helpers.isValidBIP39Mnemonic('')).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic('a')).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic(0)).toBeFalsy();
      expect(Helpers.isValidBIP39Mnemonic({ 'mnemonic': 'cat swing flag economy stadium alone churn speed unique patch report train' })).toBeFalsy();
    });
  });

  describe('detectPrivateKeyFormat', () => {
    it('should reject invalid formats', () => {
      let res = Helpers.detectPrivateKeyFormat('46c56bnXQiBjk9mqSYE7ykVQ7NzrRy');
      expect(res).toBeNull();
    });

    it('should recognise sipa', () => {
      let res = Helpers.detectPrivateKeyFormat('5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn');
      expect(res).toEqual('sipa');
    });
  });

  describe('privateKeyStringToKey', () => {
    let fixtures = [
      { format: 'base58', key: 'DXuhJcNCPfgjYN8NQFjVh9yri8Rau5B7ixWJjpSeqW7W', addr: '1EgGs4Pd5ygy1ZCvMCgqpkrkMHtawYcnam' },
      { format: 'base64', key: 'pbc8OCl5SdqjILx4R+yfvljZ7edUr65osjkzjqH2YQw=', addr: '1EL2ha3KWUFa2q7hfLk49XmUfiBV1yCzYG' },
      { format: 'hex', key: '46DA1C47CF7FE23A97497665C217963F048EBC3E4287734947B180D64C7D81DF', addr: '19CK8suvcJptn96vfvLjfNnbcbEoyHS9G' },
      { format: 'mini', key: 'S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy', addr: '1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn' },
      { format: 'sipa', key: '5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn', addr: '1BDSbDEechSue77wS44Jn2uDiFaQWom2dG' },
      { format: 'compsipa', key: 'L3dDv2KUyLfPwkcnhALEaHnd47gewa1BVvnCwWL3gVWsb2H27PY9', addr: '1Mum7V38a3fGLiXN3oCrzdf83mZUKNXmGq' }
    ];

    let errorFixtures = [
      { format: 'base58', key: 'DXuhJcNCPfgjYN8NQFjVh9yri8Rau5B7ixWJjpSeqW7=', error: 'Non-base58 character' },
      { format: 'base64', key: 'pbc8OCl5SdqjILx4R+yfvljZ7edUr65osjkzjqH2YQw+', error: 'Private key must be less than the curve order' },
      { format: 'hex', key: 'abcdefg', error: 'Invalid hex string' },
      { format: 'mini', key: 'S6c56bnXQiBjk9mqSYE7ykVQ7NzrRz', error: 'Invalid mini key' },
      { format: 'sipa', key: '5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsVxyz', error: 'Invalid checksum' },
      { format: 'compsipa', key: 'L3dDv2KUyLfPwkcnhALEaHnd47gewa1BVvnCwWL3gVWsb2H27xyz', error: 'Invalid checksum' }
    ];

    fixtures.forEach(data => it(`should convert ${data.format} format`, () => {
      let res = Helpers.privateKeyStringToKey(data.key, data.format);
      expect(Helpers.isKey(res)).toBeTruthy();
      expect(res.getAddress()).toEqual(data.addr);
    }));

    errorFixtures.forEach(data => it(`should fail for ${data.format} given a bad key`, () => {
      let e = new Error(data.error);
      expect(() => Helpers.privateKeyStringToKey(data.key, data.format)).toThrow(e);
    }));

    it('should fail if given an unknown format', () => {
      let e = new Error('Unsupported Key Format');
      expect(() => Helpers.privateKeyStringToKey('', 'unknown')).toThrow(e);
    });
  });

  describe('privateKeyCorrespondsToAddress', () => {
    afterEach(() => {
      ImportExport.shouldResolve = false;
      ImportExport.shouldReject = false;
      ImportExport.shouldFail = false;
    });

    it('should not recognize invalid formats', done => {
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', '46c56bnXQiBjk9mqSYE7ykVQ7NzrRy');
      expect(promise).toBeRejected(done);
    });

    it('should not match base58 private keys to wrong addresses', done => {
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', '5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn');
      return promise.then(data => {
        expect(data).toEqual(null);
        done();
      }).catch(e => {
        console.log(e);
        assert(false);
        done();
      });
    });

    it('should not match mini private keys to wrong addresses', done => {
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyN', 'S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy');
      return promise.then(data => {
        expect(data).toEqual(null);
        done();
      }).catch(e => {
        console.log(e);
        assert(false);
        done();
      });
    });

    it('should not recognize BIP-38 addresses without password', done => {
      ImportExport.shouldResolve = true;
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg');
      expect(promise).toBeRejected(done);
    });

    it('should not recognize BIP-38 addresses with an empty password', done => {
      ImportExport.shouldResolve = true;
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg', '');
      expect(promise).toBeRejected(done);
    });

    it('should not recognize BIP-38 addresses with a bad password', done => {
      ImportExport.shouldReject = true;
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg', 'pass');
      expect(promise).toBeRejected(done);
    });

    it('should not recognize BIP-38 addresses when decryption fails', done => {
      ImportExport.shouldFail = true;
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg', 'pass');
      expect(promise).toBeRejected(done);
    });

    it('should recognize BIP-38 addresses when decryption succeeds', done => {
      ImportExport.shouldResolve = true;
      let promise = Helpers.privateKeyCorrespondsToAddress('19GuvDvMMUZ8vq84wT79fvnvhMd5MnfTkR', '6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg', 'pass');
      return promise.then(data => {
        expect(data).not.toEqual(null);
        done();
      });
    });

    it('should match base58 private keys to their right addresses', done => {
      let promise = Helpers.privateKeyCorrespondsToAddress('1BDSbDEechSue77wS44Jn2uDiFaQWom2dG', '5JFXNQvtFZSobCCRPxnTZiW1PDVnXvGBg5XeuUDoUCi8LRsV3gn');
      return promise.then(data => {
        expect(data).not.toEqual(null);
        done();
      });
    });

    it('should match mini private keys to their right addresses', done => {
      let promise = Helpers.privateKeyCorrespondsToAddress('1PZuicD1ACRfBuKEgp2XaJhVvnwpeETDyn', 'S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy');
      return promise.then(data => {
        expect(data).not.toEqual(null);
        done();
      });
    });
  });

  describe('isValidPrivateKey', () => {
    it('should not recognize invalid hex keys', () => {
      expect(Helpers.isValidPrivateKey('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')).toBeFalsy();
      expect(Helpers.isValidPrivateKey('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBeFalsy();
      expect(Helpers.isValidPrivateKey('0000000000000000000000000000000000000000000000000000000000000000')).toBeFalsy();
    });

    it('should recognize valide hex keys', () => {
      expect(Helpers.isValidPrivateKey('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364139')).toBeTruthy();
      expect(Helpers.isValidPrivateKey('0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF')).toBeTruthy();
      expect(Helpers.isValidPrivateKey('0000000000000000000000000000000000000000000000000000000000000001')).toBeTruthy();
    });

    it('should not recognize invalid base 64 keys', () => {
      expect(Helpers.isValidPrivateKey('ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=098')).toBeFalsy();
      expect(Helpers.isValidPrivateKey('////////////////////////////////////////////')).toBeFalsy();
    });

    it('should recognize valid base 64 keys', () => {
      expect(Helpers.isValidPrivateKey('ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8=')).toBeTruthy();
      expect(Helpers.isValidPrivateKey('/////////////////////rqu3OavSKA7v9JejNA2QTk=')).toBeTruthy();
      expect(Helpers.isValidPrivateKey('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=')).toBeTruthy();
    });

    it('should recognize BIP-38 keys', () => {
      expect(Helpers.isValidPrivateKey('6PRMUxAWM4XyK8b3wyJRpTwvDdmCKakuP6aGxr3D8MuUaCWVLXM2wnGUCT')).toBeTruthy();
      expect(Helpers.isValidPrivateKey('6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg')).toBeTruthy();
    });
  });

  describe('verifyMessage', () => {
    it('should verify valid messages', () => expect(Helpers.verifyMessage('1LGAzcG9dafqtW8eHkFUPjkDKemjv5dxKd', 'HxvX3mVUI4cQgpKB98bjl/NOYi2BiaSZEsdfCulyJ7GAWrfP/9WkDazCe45lyhWPZQwZKnYZILz5h3SHn4xFPzg=', 'Wright, it is not the same as if I sign Craig Wright, Satoshi.')).toBeTruthy());

    it('should not verify invalid messages', () => expect(Helpers.verifyMessage('12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S', 'IH+xpXCKouEcd0E8Hv3NkrYWbhq0P7pAQpI1GcQ2hF2AAsqL2o4agDE8V81i071/bTMz00YKw2YRMoyFMzThZwM=', 'Wright, it is not the same as if I sign Craig Wright, Satoshi.')).toBeFalsy());
  });

  describe('isFeeOptions', () => {
    it('should return false for all these cases', () => {
      expect(Helpers.isFeeOptions({})).toBeFalsy();
      expect(Helpers.isFeeOptions(null)).toBeFalsy();
      expect(Helpers.isFeeOptions(undefined)).toBeFalsy();
      expect(Helpers.isFeeOptions(1)).toBeFalsy();
      expect(Helpers.isFeeOptions(0)).toBeFalsy();
      expect(Helpers.isFeeOptions('hello')).toBeFalsy();
      expect(Helpers.isFeeOptions('')).toBeFalsy();
      expect(Helpers.isFeeOptions()).toBeFalsy();
      expect(Helpers.isFeeOptions({min_tx_amount: 0})).toBeFalsy();
    });

    it('should return true for an object at least containing the exptected properties', () => {
      expect(Helpers.isFeeOptions({min_tx_amount: 0, percent: 0, max_service_charge: 0, send_to_miner: 0, extraProperty: 0})).toBeTruthy();
    });
  });

  describe('blockchainFee', () => {
    it('should return 0 for all these cases', () => {
      const validOptions = {min_tx_amount: 0, percent: 0.05, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(10000, {})).toBe(0);
      expect(Helpers.blockchainFee(10000, null)).toBe(0);
      expect(Helpers.blockchainFee(10000, undefined)).toBe(0);
      expect(Helpers.blockchainFee(10000, {min_tx_amount: 0})).toBe(0);
      expect(Helpers.blockchainFee(undefined, {min_tx_amount: 0})).toBe(0);
      expect(Helpers.blockchainFee(-100, validOptions)).toBe(0);
      expect(Helpers.blockchainFee(0, validOptions)).toBe(0);
      expect(Helpers.blockchainFee(null, validOptions)).toBe(0);
      expect(Helpers.blockchainFee()).toBe(0);
      expect(Helpers.blockchainFee(100)).toBe(0);
      expect(Helpers.blockchainFee('string', validOptions)).toBe(0);
      expect(Helpers.blockchainFee([], validOptions)).toBe(0);
    });

    it('should work with 0% fee', () => {
      const opt = {min_tx_amount: 0, percent: 0, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(100000000, opt)).toBe(0);
    });

    it('should work with 5% fee not reaching max fee', () => {
      const opt = {min_tx_amount: 0, percent: 0.05, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(10000, opt)).toBe(500);
    });

    it('should work with 40 basis points fee not reaching max fee', () => {
      const opt = {min_tx_amount: 0, percent: 0.004, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(1000, opt)).toBe(4);
    });

    it('should set max fee when overpassing it', () => {
      const opt = {min_tx_amount: 0, percent: 0.05, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(100000000, opt)).toBe(1000);
    });

    it('should be 0 for the exact minimum fee amount', () => {
      const opt = {min_tx_amount: 100, percent: 0.05, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.blockchainFee(100, opt)).toBe(0);
    });
  });

  describe('balanceMinusFee', () => {
    it('should return 0 for negative balances', () => {
      const validOptions = {min_tx_amount: 0, percent: 0.05, max_service_charge: 1000, send_to_miner: true};
      expect(Helpers.balanceMinusFee(-1000, {})).toBe(0);
      expect(Helpers.balanceMinusFee(-1000, null)).toBe(0);
      expect(Helpers.balanceMinusFee(-1000, undefined)).toBe(0);
      expect(Helpers.balanceMinusFee(-1000)).toBe(0);
      expect(Helpers.balanceMinusFee(-1000, validOptions)).toBe(0);
      expect(Helpers.balanceMinusFee(0, validOptions)).toBe(0);
    });

    it('should work with normal fee conditions', () => {
      const opt = {min_tx_amount: 100, percent: 0.05, max_service_charge: 200, send_to_miner: true};
      expect(Helpers.balanceMinusFee(0, opt)).toBe(0);
      expect(Helpers.balanceMinusFee(95, opt)).toBe(95);
      expect(Helpers.balanceMinusFee(100, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(103, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(105, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(130, opt)).toBe(123);
      expect(Helpers.balanceMinusFee(3445, opt)).toBe(3280);
      expect(Helpers.balanceMinusFee(4200, opt)).toBe(4000);
      expect(Helpers.balanceMinusFee(4400, opt)).toBe(4200);
      expect(Helpers.balanceMinusFee(10000, opt)).toBe(9800);
    });

    it('should work with 0% fee', () => {
      const opt = {min_tx_amount: 100, percent: 0, max_service_charge: 200, send_to_miner: true};
      expect(Helpers.balanceMinusFee(0, opt)).toBe(0);
      expect(Helpers.balanceMinusFee(95, opt)).toBe(95);
      expect(Helpers.balanceMinusFee(100, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(103, opt)).toBe(103);
      expect(Helpers.balanceMinusFee(105, opt)).toBe(105);
      expect(Helpers.balanceMinusFee(130, opt)).toBe(130);
      expect(Helpers.balanceMinusFee(3445, opt)).toBe(3445);
      expect(Helpers.balanceMinusFee(4200, opt)).toBe(4200);
      expect(Helpers.balanceMinusFee(4400, opt)).toBe(4400);
      expect(Helpers.balanceMinusFee(10000, opt)).toBe(10000);
    });

    it('should work with 100% fee', () => {
      const opt = {min_tx_amount: 100, percent: 1, max_service_charge: 200, send_to_miner: true};
      expect(Helpers.balanceMinusFee(0, opt)).toBe(0);
      expect(Helpers.balanceMinusFee(95, opt)).toBe(95);
      expect(Helpers.balanceMinusFee(100, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(103, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(105, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(130, opt)).toBe(100);
      expect(Helpers.balanceMinusFee(3445, opt)).toBe(3245);
      expect(Helpers.balanceMinusFee(4200, opt)).toBe(4000);
      expect(Helpers.balanceMinusFee(4400, opt)).toBe(4200);
      expect(Helpers.balanceMinusFee(10000, opt)).toBe(9800);
    });

    it('should work with maxFeePoint < min_tx_amount', () => {
      const opt = {min_tx_amount: 1000, percent: 0.5, max_service_charge: 1, send_to_miner: true};
      expect(Helpers.balanceMinusFee(0, opt)).toBe(0);
      expect(Helpers.balanceMinusFee(990, opt)).toBe(990);
      expect(Helpers.balanceMinusFee(1000, opt)).toBe(1000);
      expect(Helpers.balanceMinusFee(1001, opt)).toBe(1000);
      expect(Helpers.balanceMinusFee(1002, opt)).toBe(1001);
      expect(Helpers.balanceMinusFee(1003, opt)).toBe(1002);
      expect(Helpers.balanceMinusFee(10000, opt)).toBe(9999);
    });
  });

  describe('Bitcoin cash address format', () => {
    it('spec tests', () => {
      const tests = [
        ['1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu', 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'],
        ['1KXrWXciRDZUpQwQmuM1DbwsKDLYAYsVLR', 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'],
        ['16w1D5WRVKJuZUsSRzdLp9w3YGcgoxDXb', 'bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r'],
        ['3CWFddi6m4ndiGyKqzYvsFYagqDLPVMTzC', 'bitcoincash:ppm2qsznhks23z7629mms6s4cwef74vcwvn0h829pq'],
        ['3LDsS579y7sruadqu11beEJoTjdFiFCdX4', 'bitcoincash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4yc93ky28e'],
        ['31nwvkZwyPdgzjBJZXfDmSWsC4ZLKpYyUw', 'bitcoincash:pqq3728yw0y47sqn6l2na30mcw6zm78dzq5ucqzc37']
      ];
      expect(Helpers.fromBitcoinCash(tests[0][1])).toBe(tests[0][0]);
      expect(Helpers.fromBitcoinCash(tests[1][1])).toBe(tests[1][0]);
      expect(Helpers.fromBitcoinCash(tests[2][1])).toBe(tests[2][0]);
      expect(Helpers.fromBitcoinCash(tests[3][1])).toBe(tests[3][0]);
      expect(Helpers.fromBitcoinCash(tests[4][1])).toBe(tests[4][0]);
      expect(Helpers.fromBitcoinCash(tests[5][1])).toBe(tests[5][0]);

      expect(Helpers.toBitcoinCash(tests[0][0])).toBe(tests[0][1]);
      expect(Helpers.toBitcoinCash(tests[1][0])).toBe(tests[1][1]);
      expect(Helpers.toBitcoinCash(tests[2][0])).toBe(tests[2][1]);
      expect(Helpers.toBitcoinCash(tests[3][0])).toBe(tests[3][1]);
      expect(Helpers.toBitcoinCash(tests[4][0])).toBe(tests[4][1]);
      expect(Helpers.toBitcoinCash(tests[5][0])).toBe(tests[5][1]);
    });
  });
});
