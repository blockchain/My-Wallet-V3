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
        expect(e.constructor.name).toEqual('External');
      })
    )
  );

  describe('instance', () => {
    beforeEach(() => {
      e = new External(wallet);
    });

    describe('fetch', () => {
      it('should include partners if present', done => {
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeDefined();
          expect(e._sfox).toBeDefined();
        });
        expect(promise).toBeResolved(done);
      });

      it('should not cointain any partner by default', done => {
        mockPayload = {};
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeUndefined();
          expect(e._sfox).toBeUndefined();
        });
        expect(promise).toBeResolved(done);
      });

      return it('should not deserialize non-expected fields', done => {
        mockPayload = {coinify: {}, rarefield: 'I am an intruder'};
        let promise = e.fetch().then(res => {
          expect(e._coinify).toBeDefined();
          expect(e._rarefield).toBeUndefined();
        });
        expect(promise).toBeResolved(done);
      });
    });

    describe('JSON serializer', () => {
      beforeEach(() => {
        e._coinify = {};
        e._sfox = {};
      });

      it('should store partners', () => {
        let json = JSON.stringify(e, null, 2);
        expect(json).toEqual(JSON.stringify({coinify: {}, sfox: {}}, null, 2));
      });

      it('should not serialize non-expected fields', () => {
        e.rarefield = 'I am an intruder';
        let json = JSON.stringify(e, null, 2);
        let obj = JSON.parse(json);

        expect(obj.coinify).toBeDefined();
        expect(obj.rarefield).not.toBeDefined();
      });
    });
  });

  describe('canBuy', () => {
    e = new External(wallet);

    const accountInfo = {
      countryCodeGuess: 'US',
      invited: {
        coinify: false,
        sfox: false
      }
    };

    const options = {
      showBuySellTab: ['US'],
      partners: {
        coinify: {
          countries: ['NL']
        },
        sfox: {
          countries: ['US']
        }
      }
    };

    it('should be false in a non-coinify country by default', () => {
      expect(e.canBuy(accountInfo, options)).toEqual(false);
    });

    describe('in a Coinify country', () => {
      beforeEach(() => {
        accountInfo.countryCodeGuess = 'NL';
      });

      it('should be true regardless of what backend says', () => {
        accountInfo.countryCodeGuess = 'NL';
        accountInfo.invited.coinify = false;
        accountInfo.invited.sfox = false;
        expect(e.canBuy(accountInfo, options)).toEqual(true);
      });
    });

    describe('in an SFOX country', () => {
      beforeEach(() => {
        accountInfo.countryCodeGuess = 'US';
      });

      it('should be false when user is not invited', () => {
        expect(e.canBuy(accountInfo, options)).toEqual(false);
      });

      it('should be true when user is invited', () => {
        accountInfo.invited.sfox = true;
        expect(e.canBuy(accountInfo, options)).toEqual(true);
      });

      it('should not be affected by coinify.invited', () => {
        accountInfo.invited.coinify = true;
        accountInfo.invited.sfox = false;
        expect(e.canBuy(accountInfo, options)).toEqual(false);
      });
    });
  });
});
