let proxyquire = require('proxyquireify')(require);
let exchangeMock = require('./__mocks__/bitcoin-exchange-client.mock');

let delegate;

let trade;

let acc0 = {
  index: 0,
  labels: {},
  receiveIndex: 0,
  receiveAddressAtIndex (i) { return `0-${i}`; }
};

let MyWallet = {
  wallet: {
    hdwallet: {
      accounts: [
        acc0
      ],
      defaultAccount: acc0
    },
    accountInfo: {
      email: 'info@blockchain.com',
      mobile: '+1 55512341234',
      isEmailVerified: true,
      isMobileVerified: true
    },
    external: {
      save () {}
    },
    labels: {
      reserveReceiveAddress: () => {
        return {
          receiveAddress: '',
          commit: () => {}
        };
      },
      releaseReceiveAddress: () => {}
    }
  }
};

let emailVerified = true;
let mobileVerified = true;

const API = {
  getBalances () {},
  getHistory (addresses) {
    if (addresses.indexOf('address-with-tx') > -1) {
      return Promise.resolve({txs: [{hash: 'hash', block_height: 11}]});
    } else {
      return Promise.resolve({txs: []});
    }
  },

  request (action, method, {fields}, headers) {
    return new Promise((resolve, reject) => {
      if ((action === 'GET') && (method === 'wallet/signed-token')) {
        if (fields === 'email') {
          if (emailVerified) {
            resolve({success: true, token: 'json-web-token-email'});
          } else {
            resolve({success: false});
          }
        }
        if (fields === 'email|mobile') {
          if (emailVerified && mobileVerified) {
            resolve({success: true, token: 'json-web-token-email-mobile'});
          } else {
            resolve({success: false});
          }
        }
        if (emailVerified && (fields === 'email|wallet_age')) {
          resolve({success: true, token: 'json-web-token-email-wallet-age'});
        }
        if (emailVerified && (fields === 'mobile')) {
          resolve({success: true, token: 'json-web-token-mobile'});
        } else {
          resolve({success: false});
        }
      } else {
        reject('bad call');
      }
    });
  }
};

let eventListener = {
  callback: null
};

let WalletStore = {
  addEventListener (callback) {
    eventListener.callback = callback;
  }
};

const TX = ({hash, block_height}) => ({
  hash,
  confirmations: block_height - 10 // eslint-disable-line camelcase
});

let stubs = {
  'bitcoin-exchange-client': exchangeMock,
  './wallet': MyWallet,
  './api': API,
  './wallet-store': WalletStore,
  './wallet-transaction': TX
};

let ExchangeDelegate = proxyquire('../src/exchange-delegate', stubs);

describe('ExchangeDelegate', () => {
  describe('class', () => {
    describe('new ExchangeDelegate()', () => {
      it('...', () => {
        pending();
      });
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      trade = {
        _account_index: 0
      };
      delegate = new ExchangeDelegate(MyWallet.wallet);
      delegate.trades = [trade];
    });

    describe('debug', () =>
      it('should set debug', () => {
        delegate.debug = true;
        expect(delegate.debug).toEqual(true);
      })
    );

    describe('getters', () => {
      it('trades should be an array', () => {
        expect(delegate.trades.length).toBeDefined();
      });

      it('labelbase has a default', () => {
        delegate._labelBase = undefined;
        expect(delegate.labelBase).toEqual('Exchange order');
      });

      it('labelbase can be set', () => {
        delegate.labelBase = 'Coinify order';
        expect(delegate.labelBase).toEqual('Coinify order');
      });
    });

    describe('save()', () =>
      it('should call save on external', () => {
        spyOn(MyWallet.wallet.external, 'save');
        delegate.save();
        expect(MyWallet.wallet.external.save).toHaveBeenCalled();
      })
    );

    describe('email()', () => {
      it('should get the users email', () => expect(delegate.email()).toEqual('info@blockchain.com'));

      it("should return null if the user doesn't have an email", () => {
        MyWallet.wallet.accountInfo.email = null;
        expect(delegate.email()).toEqual(null);
      });
    });

    describe('mobile()', () => {
      it('should get the users mobile number', () => expect(delegate.mobile()).toEqual('+1 55512341234'));

      it("should return null if the user doesn't have a mobile number", () => {
        MyWallet.wallet.accountInfo.mobile = null;
        expect(delegate.mobile()).toEqual(null);
      });
    });

    describe('isEmailVerified()', () =>
      it('should be true is users email is verified', () => expect(delegate.isEmailVerified()).toEqual(true))
    );

    describe('isMobileVerified()', () =>
      it('should be true is users mobile is verified', () => expect(delegate.isMobileVerified()).toEqual(true))
    );

    describe('getToken()', () => {
      afterEach(() => {
        emailVerified = true;
        mobileVerified = true;
      });

      it('should get the token', done => {
        let promise = delegate.getToken('partner', {mobile: true});
        expect(promise).toBeResolvedWith('json-web-token-email-mobile', done);
      });

      it('should reject if email is not verified', done => {
        emailVerified = false;
        let promise = delegate.getToken('partner', {mobile: true});
        expect(promise).toBeRejected(done);
      });

      it('should reject if mobile is not verified', done => {
        mobileVerified = false;
        let promise = delegate.getToken('partner', {mobile: true});
        expect(promise).toBeRejected(done);
      });
    });

    describe('getReceiveAddress()', () => {
      it('should get the trades receive address', () => {
        trade._account_index = 0;
        trade._receive_index = 0;
        expect(delegate.getReceiveAddress(trade)).toEqual('0-0');
      });

      it("should return null if trade doesn't have account index", () => {
        trade._account_index = undefined;
        expect(delegate.getReceiveAddress(trade)).toEqual(null);
      });
    });

    describe('reserveReceiveAddress()', () => {
      let account;

      beforeEach(() => {
        spyOn(MyWallet.wallet.labels, 'reserveReceiveAddress').and.callThrough();
        account = MyWallet.wallet.hdwallet.accounts[0];
      });

      it('should call labels.reserveReceiveAddress', () => {
        delegate.reserveReceiveAddress();
        expect(MyWallet.wallet.labels.reserveReceiveAddress).toHaveBeenCalled();
      });

      it('should provide a reusable index in case of gap limit', () => {
        delegate.trades = [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }];
        account.receiveIndex = 19;
        delegate.reserveReceiveAddress();
        expect(MyWallet.wallet.labels.reserveReceiveAddress).toHaveBeenCalledWith(
          0, jasmine.objectContaining({ reusableIndex: 16 })
        );
      });

      describe('.commit()', () => {
        let reservation;

        beforeEach(() => {
          account = MyWallet.wallet.hdwallet.accounts[0];
          account.receiveIndex = 0;
          account.lastUsedReceiveIndex = 0;
          trade = { id: 1, _account_index: 0, _receive_index: 0 };

          reservation = delegate.reserveReceiveAddress();

          spyOn(reservation._reservation, 'commit').and.callThrough();
        });

        it('should label the address', () => {
          reservation.commit(trade);
          expect(reservation._reservation.commit).toHaveBeenCalledWith('Exchange order #1');
        });
      });
    });

    describe('releaseReceiveAddress()', () => {
      let account;

      beforeEach(() => {
        spyOn(MyWallet.wallet.labels, 'releaseReceiveAddress').and.callThrough();
        account = MyWallet.wallet.hdwallet.accounts[0];
        account.receiveIndex = 1;
        trade = { id: 1, receiveAddress: '0-16', _account_index: 0, _receive_index: 0, debug: true };
      });

      it('should gracefully do nothing is account_index is missing', () => {
        trade._account_index = undefined;
        delegate.releaseReceiveAddress(trade);
        expect(MyWallet.wallet.labels.releaseReceiveAddress).not.toHaveBeenCalled();
      });

      it('should remove the label', () => {
        delegate.releaseReceiveAddress(trade);
        expect(MyWallet.wallet.labels.releaseReceiveAddress).toHaveBeenCalledWith(0, 0);
      });

      it('should remove one of multible ids in a label', () => {
        delegate.trades = [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }];
        delegate.releaseReceiveAddress(trade);
        expect(MyWallet.wallet.labels.releaseReceiveAddress).toHaveBeenCalledWith(
          0,
          0,
          jasmine.objectContaining({expectedLabel: 'Exchange order #1'})
        );
      });
    });

    describe('checkAddress()', () => {
      it('should resolve with nothing if no transaction is found ', done => {
        let promise = delegate.checkAddress('address');
        expect(promise).toBeResolvedWith(undefined, done);
      });

      it('should resolve with transaction', done => {
        let promise = delegate.checkAddress('address-with-tx');
        expect(promise).toBeResolvedWith(jasmine.objectContaining({hash: 'hash', confirmations: 1}), done);
      });
    });

    describe('monitorAddress()', () => {
      let e =
        {callback () {}};

      beforeEach(() => spyOn(e, 'callback'));

      it('should add an eventListener', () => {
        spyOn(WalletStore, 'addEventListener');
        delegate.monitorAddress();
        expect(WalletStore.addEventListener).toHaveBeenCalled();
      });

      it('should callback if transaction happens on address', () => {
        delegate.monitorAddress('1abc', e.callback);

        eventListener.callback('on_tx_received', {
          out: [{
            addr: '1abc'
          }]
        });

        expect(e.callback).toHaveBeenCalled();
      });

      it('should callback if transaction happens on a different address', () => {
        e = {callback () {}};

        spyOn(e, 'callback');

        delegate.monitorAddress('1abc', e.callback);

        eventListener.callback('on_tx_received', {
          out: [{
            addr: '1abcdef'
          }]
        });

        expect(e.callback).not.toHaveBeenCalled();
      });
    });

    describe('serializeExtraFields()', () =>
      it('should add receive account and index', () => {
        trade = {
          _account_index: 0,
          _receive_index: 0
        };
        let obj = {};
        delegate.serializeExtraFields(obj, trade);
        expect(obj.account_index).toEqual(0);
        expect(obj.receive_index).toEqual(0);
      })
    );

    describe('deserializeExtraFields()', () =>
      it('should set the trades receive account and index', () => {
        trade = {
        };
        let obj = {
          account_index: 0,
          receive_index: 0
        };
        delegate.deserializeExtraFields(obj, trade);
        expect(trade._account_index).toEqual(0);
        expect(trade._receive_index).toEqual(0);
      })
    );
  });
});
