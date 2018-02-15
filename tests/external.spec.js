let proxyquire = require('proxyquireify')(require);

describe('External', () => {
  let External;
  let Exchange;
  let Coinify;
  let SFOX;
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

  let delegate = {};
  let ExchangeDelegate = () => delegate;

  beforeEach(() => {
    mockPayload = {
      coinify: {},
      sfox: {}
    };

    Exchange = obj => {
      if (!obj.trades) {
        obj.trades = [];
      }
      obj.constructor = {name: 'Exchange'};
      return obj;
    };

    Exchange.new = (delegate) =>
      ({
        trades: [],
        constructor: {
          name: 'Exchange'
        },
        delegate: delegate
      })
    ;

    SFOX = Exchange;
    Coinify = Exchange;

    let stubs = {
      'bitcoin-coinify-client': Coinify,
      'bitcoin-sfox-client': SFOX,
      './metadata': Metadata,
      './exchange-delegate': ExchangeDelegate
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

      it('should include partners if present', () => {
        e = new External(metadata, wallet, mockPayload);
        expect(e._coinify).toBeDefined();
        expect(e._sfox).toBeDefined();
      });

      it('should not cointain any partner by default', () => {
        mockPayload = {};
        e = new External(metadata, wallet, mockPayload);
        expect(e._coinify).toBeUndefined();
        expect(e._sfox).toBeUndefined();
      });

      it('should work with a null payload', () => {
        mockPayload = {};
        e = new External(metadata, wallet, null);
        expect(e.constructor.name).toEqual('External');
        expect(e._coinify).toBeUndefined();
        expect(e._sfox).toBeUndefined();
      });

      it('should not deserialize non-expected fields', () => {
        mockPayload = {coinify: {}, rarefield: 'I am an intruder'};
        e = new External(metadata, wallet, mockPayload);
        expect(e._coinify).toBeDefined();
        expect(e._rarefield).toBeUndefined();
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
    beforeEach(() => {
      e = new External(metadata, wallet, mockPayload);
    });

    describe('JSON serializer', () => {
      beforeEach(() => {
        e._coinify = {
          hasAccount: true,
          toJSON: () => { return { user: '1' }; }
        };
        e._sfox = {};
      });

      it('should store partners if one is set', () => {
        let json = JSON.stringify(e, null, 2);
        expect(json).toEqual(JSON.stringify({coinify: {'user': '1'}, sfox: {}}, null, 2));
      });

      it('should not store partners if none are set', () => {
        e._coinify.hasAccount = false;
        let json = JSON.stringify(e, null, 2);
        expect(json).toBeUndefined();
      });

      it('should not serialize non-expected fields', () => {
        e.rarefield = 'I am an intruder';
        let json = JSON.stringify(e, null, 2);
        let obj = JSON.parse(json);

        expect(obj.coinify).toBeDefined();
        expect(obj.rarefield).not.toBeDefined();
      });
    });

    describe('canBuy', () => {
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

    describe('should display sell tab', () => {
      const email = 'random@blockghain.com';

      const options = {
        partners: {
          coinify: {
            showSellFraction: 0
          }
        }
      };

      it('should be false with a non-blockchain.com email', () => {
        expect(e.shouldDisplaySellTab(email, options, 'coinify')).toEqual(false);
      });
    });

    describe('Exchange getters', () => {
      let exchanges;

      beforeEach(() => {
        exchanges = [
          () => e.coinify,
          () => e.sfox
        ];

        spyOn(Exchange, 'new').and.callThrough();
      });

      it('should reuse existing Exchange object', () => {
        for (let exchange of exchanges) {
          let ex = exchange();
          expect(Exchange.new).not.toHaveBeenCalled();
          expect(ex.constructor.name).toEqual('Exchange');
        }
      });

      it('should construct Exchange object and set delegate', () => {
        for (let exchange of exchanges) {
          e = new External(metadata, wallet, {});
          let ex = exchange();
          expect(Exchange.new).toHaveBeenCalled();
          expect(ex.constructor.name).toEqual('Exchange');
          expect(ex.delegate).toBe(delegate);
        }
      });

      it('hasExchangeAccount', () => {
        expect(e.hasExchangeAccount).toEqual(false);
        e._coinify.hasAccount = true;
        expect(e.hasExchangeAccount).toEqual('coinify');
        e._coinify.hasAccount = false;
        e._sfox.hasAccount = true;
        expect(e.hasExchangeAccount).toEqual('sfox');
      });
    });
  });
});
