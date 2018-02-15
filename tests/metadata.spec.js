let proxyquire = require('proxyquireify')(require);

let OriginalWalletCrypto = require('../src/wallet-crypto');
let OriginalBitcoin = require('bitcoinjs-lib');

// mock derivation to generate hdnode from string deterministically
let masterhdnode = {
  deriveHardened (purpose) {
    return {
      deriveHardened (payloadType) {
        return {
          deriveHardened (i) {
            return BitcoinJS.HDNode.fromSeedBuffer(
                                         OriginalWalletCrypto.sha256(
                                          `m/${purpose}'/${payloadType}'/${i}'`));
          }
        };
      }
    };
  }
};

let metahdnode = {
  deriveHardened (payloadType) {
    return {
      deriveHardened (i) {
        return BitcoinJS.HDNode.fromSeedBuffer(
                                       OriginalWalletCrypto.sha256(
                                        `m/proposit'/${payloadType}'/${i}'`));
      }
    };
  }
};

var BitcoinJS = {};
let WalletCrypto = {};
let stubs = {
  './wallet-crypto': WalletCrypto,
  'bitcoinjs-lib': BitcoinJS
};
let Metadata = proxyquire('../src/metadata', stubs);

describe('Metadata', () => {
  let c;
  let response = {
    payload: 'Q1ayZRanBA5pzRsYQOzni43yMVl53T65DGUjp1cEgzpl/HOcc6PcGtWkrvOREtnc',
    version: 1,
    type_id: -1,
    signature: 'IBZQntOxNxJlg5nKMmzi7mH4l3+BZrZnVDz+eJas3QKaCApbcQuTy9XCTSuSRpWuJ4mmsW/PuWhAFOv63DZ6+fs=',
    prev_magic_hash: '6006136dcb283dff85ce8b5c25f8a339437943b136bfefe2b10d7a902b25f957',
    created_at: 1480072957000,
    updated_at: 1480072976166,
    address: '19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA'
  };

  let nonEncResponse = {
    payload: 'eyJoZWxsbyI6IndvcmxkIn0=',
    version: 1,
    type_id: -1,
    signature: 'IAC4PIBfjHPSp9w7Lg/UaVfAo1WZnB07aViLXasNQZQnMDFWS4q8mDgs7o8DhDb0yP+QwbZ/rrFlEARDy6+d0S8=',
    prev_magic_hash: '33f698a2819f6e779cb0cc579a08975d2fc92632c31d294f363bde70560e722a',
    created_at: 1480072957000,
    updated_at: 1480074223395,
    address: '19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA'
  };

  beforeEach(() => JasminePromiseMatchers.install());

  afterEach(() => JasminePromiseMatchers.uninstall());

  describe('Metadata.message', () => {
    it('should compute message with prevMagicHash', () => {
      let payload = Buffer.from('payload');
      let prevMagic = Buffer.from('prevMagic');
      let message = Metadata.message(payload, prevMagic);
      return expect(message).toBe('cHJldk1hZ2ljI59Z7VXnN8dxR89VrQwbAwttfudIp0JpUvm4UtWpNeU=');
    });

    return it('should compute message without prevMagicHash', () => {
      let payload = Buffer.from('payload');
      let prevMagic;
      let message = Metadata.message(payload, prevMagic);
      return expect(message).toBe('cGF5bG9hZA==');
    });
  });

  describe('Metadata.magic', () => {
    it('should compute magicHash with prevMagicHash', () => {
      let payload = Buffer.from('payload');
      let prevMagic = Buffer.from('prevMagic');
      let magic = Metadata.magic(payload, prevMagic);
      return expect(magic.toString('base64')).toBe('CDaNC0fPlsRlIyjKeELKrrttBEP7g27PCv/pIY4cWCQ=');
    });

    return it('should compute magicHash without prevMagicHash', () => {
      let payload = Buffer.from('payload');
      let prevMagic;
      let magic = Metadata.magic(payload, prevMagic);
      return expect(magic.toString('base64')).toBe('ADDQotVAKs732nTFsqr7RtJsY9n3Ng6OKIcEd/BNjCI=');
    });
  });

  describe('Metadata.computeSignature', () => {
    it('should compute signature with prevMagicHash', () => {
      let k = OriginalBitcoin.ECPair.fromWIF('L1tXV2tuvFWvLw2JTZ1yYz8gxSXPawvoDemrwruTtwp4hhn5cbD3');
      let payload = Buffer.from('payload');
      let prevMagic = Buffer.from('prevMagic');
      let signature = Metadata.computeSignature(k, payload, prevMagic);
      return expect(signature.toString('base64')).toBe('H0Ggd/NL6cfGVMCUnUEtbHcFmwbt2i3CXP4dzAtMd6lFCKdbPuCezCVnfRoSvAWeajvP0CkgWxNLnWzjqv1gKfw=');
    });

    return it('should compute signature without prevMagicHash', () => {
      let k = OriginalBitcoin.ECPair.fromWIF('L1tXV2tuvFWvLw2JTZ1yYz8gxSXPawvoDemrwruTtwp4hhn5cbD3');
      let payload = Buffer.from('payload');
      let prevMagic;
      let signature = Metadata.computeSignature(k, payload, prevMagic);
      return expect(signature.toString('base64')).toBe('INBtCI3+o9zQuTwijKDN1L/caBjmXI38hJAJ6sse9+L6O8dwvPptLUl/aP4l9Rz+zfJ9bUJj1UJwp/YeQJBFBBM=');
    });
  });

  describe('Metadata.verifyResponse', () => {
    it('should propagate null', () => {
      let verified = Metadata.verifyResponse('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', null);
      return expect(verified).toBe(null);
    });

    it('should verify and compute the new magic hash', () => {
      let verified = Metadata.verifyResponse(response.address, response);
      let expectedMagicHash = Buffer.from('sS4b2JTeq53jyrAVYX8WQeIU/wDezNiFX34jNYSmfKQ=', 'base64');
      expect(expectedMagicHash.compare(verified.compute_new_magic_hash)).toEqual(0);
    });

    return it('should fail and launch an exception', () => {
      let shouldFail = () => Metadata.verifyResponse('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX', response);
      return expect(shouldFail).toThrow(new Error('METADATA_SIGNATURE_VERIFICATION_ERROR'));
    });
  });

  describe('Metadata.extractResponse', () => {
    it('should propagate null', () => {
      let extracted = Metadata.extractResponse('encrypteionKey', null);
      return expect(extracted).toBe(null);
    });

    it('should extract encrypted data', () => {
      let wif = 'Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA';
      let k = OriginalBitcoin.ECPair.fromWIF(wif);
      let pkbuff = k.d.toBuffer();
      let enck = OriginalWalletCrypto.sha256(pkbuff);
      let extracted = JSON.stringify(Metadata.extractResponse(enck, response));
      let hello = JSON.stringify({hello: 'world'});
      return expect(extracted).toBe(hello);
    });

    return it('should extract non-encrypted data', () => {
      let extracted = JSON.stringify(Metadata.extractResponse(undefined, nonEncResponse));
      let hello = JSON.stringify({hello: 'world'});
      return expect(extracted).toBe(hello);
    });
  });

  describe('class', () =>
    describe('new Metadata()', () => {
      it('should instantiate', () => {
        let k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
        let m = new Metadata(k);
        return expect(m.constructor.name).toEqual('Metadata');
      });

      it('should set the address', () => {
        let k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
        let m = new Metadata(k);
        return expect(m._address).toEqual('19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA');
      });

      it('should set the signature KeyPair', () => {
        let k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
        let m = new Metadata(k);
        return expect(m._signKey.toWIF()).toEqual('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
      });

      return it('should set the encryption key', () => {
        let k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
        let m = new Metadata(k, 'enc');
        return expect(m._encKeyBuffer).toEqual('enc');
      });
    })
  );

  describe('read', () => {
    it('should resolve with null for 404 entry', done => {
      spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(null));
      let promise = Metadata.read('19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA');
      promise.then(res => expect(res).toBe(null));
      return expect(promise).toBeResolved(done);
    });

    return it('should read non-encrypted data', done => {
      spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => new Promise(resolve => resolve(nonEncResponse)));
      let promise = Metadata.read('19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA');
      return expect(promise).toBeResolvedWith(jasmine.objectContaining({hello: 'world'}), done);
    });
  });

  describe('API', () => {
    beforeEach(() => {
      let k = OriginalBitcoin.ECPair.fromWIF('Kz5XipXFW4v4CVEd1N77q5rRdFFsgVovC2AuivvZ5MfDZhQBzuFA');
      let pkbuff = k.d.toBuffer();
      let enck = OriginalWalletCrypto.sha256(pkbuff);
      c = new Metadata(k, enck);
    });

    describe('fetch', () => {
      it('should resolve with null for 404 entry', done => {
        spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(null));
        let promise = c.fetch();
        promise.then(res => expect(res).toBe(null));
        return expect(promise).toBeResolved(done);
      });

      return it('should resolve decrypted data', done => {
        spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(response));
        let promise = c.fetch();
        return expect(promise).toBeResolvedWith(jasmine.objectContaining({hello: 'world'}), done);
      });
    });

    describe('create', () =>

      it('should call request with encrypted data', done => {
        spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(response));
        spyOn(WalletCrypto, 'encryptDataWithKey').and.callFake((data, key) => Buffer.from(data).toString('base64'));
        let promise = c.create({hello: 'world'});
        promise.then(() => {
          return expect(Metadata.request).toHaveBeenCalledWith(
            'PUT',
            '19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA',
            Object({ version: 1, payload: 'eyJoZWxsbyI6IndvcmxkIn0=', signature: 'IEPGABLAeYLlFvRcxJjPwHtPCZIg16sUqLUInw5MhxUzMGbUSnHB+R1a0KRkqTQ0JsGSFzXol+wweZEqMgrHtuQ=', prev_magic_hash: null, type_id: -1 })
          );
        }
        );
        return expect(promise).toBeResolved(done);
      })
    );

    return describe('update', () => {
      it('should call request with encrypted data', done => {
        spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(response));
        spyOn(WalletCrypto, 'encryptDataWithKey').and.callFake((data, key) => Buffer.from(data).toString('base64'));
        let promise = c.update({hello: 'world'});
        promise.then(() => {
          return expect(Metadata.request).toHaveBeenCalledWith(
            'PUT',
            '19ryWY7sn9G6yX74AJKSs83vnhdydcvDjA',
            Object({ version: 1, payload: 'eyJoZWxsbyI6IndvcmxkIn0=', signature: 'IEPGABLAeYLlFvRcxJjPwHtPCZIg16sUqLUInw5MhxUzMGbUSnHB+R1a0KRkqTQ0JsGSFzXol+wweZEqMgrHtuQ=', prev_magic_hash: null, type_id: -1 })
          );
        }
        );
        return expect(promise).toBeResolved(done);
      });

      return it('should not update if no data changes', done => {
        spyOn(Metadata, 'request').and.callFake((method, endpoint, data) => Promise.resolve(response));
        spyOn(WalletCrypto, 'encryptDataWithKey').and.callFake((data, key) => Buffer.from(data).toString('base64'));
        c._value = 'no changes';
        let promise = c.update('no changes');
        promise.then(() => {
          return expect(Metadata.request).not.toHaveBeenCalled();
        }
        );
        return expect(promise).toBeResolved(done);
      });
    });
  });

  return describe('Factory', () => {
    it('should create metadata instance from metadata hdnode with the right derivation', () => {
      let m = Metadata.fromMetadataHDNode(metahdnode, 1714);
      return expect(m._address).toBe('1Auq6HbwMkxM3gVjdN8RbQdZbF5sfLuskv');
    });

    return it('should create metadata instance from masterdata hdnode with the right derivation', () => {
      let m = Metadata.fromMasterHDNode(masterhdnode, 1714);
      return expect(m._address).toBe('12auwetBz7DetiL4i58L813y8bdN8UtPzc');
    });
  });
});
