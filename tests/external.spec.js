let proxyquire = require('proxyquireify')(require);

describe('External', () => {
  let External;
  let e;

  let mockPayload;

  let metaDataInstance = {
    create () {},
    fetch () {
      return Promise.resolve(mockPayload);
    },
    fromObject (object, magichash) {
      return Promise.resolve(object);
    }
  };

  let Metadata = {
    fromMetadataHDNode (n, masterhdnode) {
      return metaDataInstance;
    }
  };

  beforeEach(() => {
    mockPayload = {
      coinify: {},
      sfox: {}
    };

    let stubs = {
      './metadata': Metadata
    };

    External = proxyquire('../src/external', stubs);
  });

  let wallet = {
    hdwallet: {
    }
  };

  let metadata = {};

  describe('class', () => {
    describe('new External()', () => {
      it('should transform an Object to an External', () => {
        e = new External(metadata, wallet, {});
        expect(e.constructor.name).toEqual('External');
      });

      it('should work with a null payload', () => {
        mockPayload = {};
        e = new External(metadata, wallet, null);
        expect(e.constructor.name).toEqual('External');
        expect(e._receivedObject).toEqual(null);
      });
    });

    describe('fetch', () => {
      it('should call metadata.fetch()', () => {
        spyOn(metaDataInstance, 'fetch').and.callThrough();
        External.fetch(wallet);
        expect(metaDataInstance.fetch).toHaveBeenCalled();
      });

      it('should construct an object', (done) => {
        let checks = (res) => {
          expect(res.constructor.name).toEqual('External');
        };
        External.fetch(wallet).then(checks).then(done);
      });

      it('should reject the promise if something goes wrong', (done) => {
        spyOn(metaDataInstance, 'fetch').and.callFake(() => Promise.reject());
        External.fetch(wallet).catch(done);
      });
    });

    describe('fromJSON', () => {
      it('should call metadata.fromObject()', () => {
        spyOn(metaDataInstance, 'fromObject').and.callThrough();
        External.fromJSON(wallet, '{}', 'magic');
        expect(metaDataInstance.fromObject).toHaveBeenCalled();
      });

      it('should construct an object', (done) => {
        let checks = (res) => {
          expect(res.constructor.name).toEqual('External');
        };
        External.fromJSON(wallet, '{}', 'magic').then(checks).then(done);
      });

      it('should reject the promise if something goes wrong', (done) => {
        spyOn(metaDataInstance, 'fromObject').and.callFake(() => Promise.reject());
        External.fromJSON(wallet, '{}', 'magic').catch(done);
      });
    });
  });

  describe('instance', () => {
    describe('toJSON', () => {
      it('should return undefined for null json input', () => {
        e = new External(metadata, wallet, null);
        expect(e.toJSON()).toEqual(undefined)
      });
      it('should return empty json for empty json input', () => {
        e = new External(metadata, wallet, {});
        expect(e.toJSON()).toEqual({})
      });
      it('should return mock json for mock json input', () => {
        e = new External(metadata, wallet, mockPayload);
        expect(e.toJSON()).toEqual(mockPayload)
      });
    });
  });
});
