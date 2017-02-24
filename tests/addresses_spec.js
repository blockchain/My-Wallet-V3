let proxyquire = require('proxyquireify')(require);

fdescribe('Addresses', () => {
  let mockPayload = {
    version: '1.0.0',
    labels: []
  };

  let Metadata = {
    fromMasterHDNode (n, masterhdnode) {
      return {
        create () {},
        fetch () {
          return Promise.resolve(mockPayload);
        }
      };
    }
  };

  let stubs = {
    './metadata': Metadata
  };

  let Addresses = proxyquire('../src/addresses', stubs);

  let wallet = {
    hdwallet: {
      getMasterHDNode () {}
    }
  };

  let e;

  describe('class', () =>
    describe('new Addresses()', () =>
      it('should transform an Object to Addresses', () => {
        e = new Addresses(wallet);
        return expect(e.constructor.name).toEqual('Addresses');
      })
    )
  );

  return describe('instance', () => {
    beforeEach(() => {
      e = new Addresses(wallet);
    });

    describe('fetch', () => {
      it('should have version', done => {
        let promise = e.fetch().then(res => {
          expect(e._version).toEqual('1.0.0');
        });
        return expect(promise).toBeResolved(done);
      });

      return it('should not deserialize non-expected fields', done => {
        mockPayload = {version: '1.0.0', rarefield: 'I am an intruder'};
        let promise = e.fetch().then(res => {
          expect(e._version).toBeDefined();
          return expect(e._rarefield).toBeUndefined();
        });
        return expect(promise).toBeResolved(done);
      });
    });

    return describe('JSON serializer', () => {
      beforeEach(() => {
      });

      it('should store version', () => {
        let json = JSON.stringify(e, null, 2);
        return expect(json).toEqual(JSON.stringify({version: '1.0.0'}, null, 2));
      });

      return it('should not serialize non-expected fields', () => {
        e.rarefield = 'I am an intruder';
        let json = JSON.stringify(e, null, 2);
        let obj = JSON.parse(json);

        expect(obj.version).toBeDefined();
        return expect(obj.rarefield).not.toBeDefined();
      });
    });
  });
});
