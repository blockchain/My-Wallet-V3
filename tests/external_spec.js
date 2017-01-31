let proxyquire = require('proxyquireify')(require);

describe('External', () => {
  let mockPayload = {
    coinify: {},
    sfox: {}
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

  let Coinify = obj => {
    if (!obj.trades) {
      obj.trades = [];
    }
    return obj;
  };

  let SFOX = obj => {
    if (!obj.trades) {
      obj.trades = [];
    }
    return obj;
  };

  let ExchangeDelegate = () => ({});

  Coinify.new = () =>
    ({
      trades: []
    })
  ;

  SFOX.new = () =>
    ({
      trades: []
    })
  ;

  let stubs = {
    'bitcoin-coinify-client': Coinify,
    'bitcoin-sfox-client': SFOX,
    './metadata': Metadata,
    './exchange-delegate': ExchangeDelegate
  };

  let External = proxyquire('../src/external', stubs);

  let wallet = {
    hdwallet: {
      getMasterHDNode () {}
    }
  };

  let e;

  describe('class', () =>
    describe('new External()', () =>
      it('should transform an Object to an External', () => {
        e = new External(wallet);
        return expect(e.constructor.name).toEqual('External');
      })
    )
  );

  return describe('instance', () => {
    beforeEach(() => {
      e = new External(wallet);
    });

    describe('fetch', () => {
      it('should include partners if present', done => {
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeDefined();
          return expect(e._sfox).toBeDefined();
        });
        return expect(promise).toBeResolved(done);
      });

      it('should not cointain any partner by default', done => {
        mockPayload = {};
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeUndefined();
          return expect(e._sfox).toBeUndefined();
        });
        return expect(promise).toBeResolved(done);
      });

      return it('should not deserialize non-expected fields', done => {
        mockPayload = {coinify: {}, rarefield: 'I am an intruder'};
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeDefined();
          return expect(e._rarefield).toBeUndefined();
        });
        return expect(promise).toBeResolved(done);
      });
    });

    return describe('JSON serializer', () => {
      beforeEach(() => {
        e._coinify = {};
        e._sfox = {};
      });

      it('should store partners', () => {
        let json = JSON.stringify(e, null, 2);
        return expect(json).toEqual(JSON.stringify({coinify: {}, sfox: {}}, null, 2));
      });

      return it('should not serialize non-expected fields', () => {
        e.rarefield = 'I am an intruder';
        let json = JSON.stringify(e, null, 2);
        let obj = JSON.parse(json);

        expect(obj.coinify).toBeDefined();
        return expect(obj.rarefield).not.toBeDefined();
      });
    });
  });
});
