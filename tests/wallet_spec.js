let proxyquire = require('proxyquireify')(require);

let walletStoreGuid;
let walletStoreEncryptedWalletData;
let WalletStore = {
  setGuid (guid) {
    walletStoreGuid = guid;
  },
  getGuid () {
    return walletStoreGuid;
  },
  setRealAuthType () {},
  setSyncPubKeys () {},
  setLanguage () {},
  setEncryptedWalletData (data) {
    walletStoreEncryptedWalletData = data;
  },
  getEncryptedWalletData () { return walletStoreEncryptedWalletData || 'encrypted'; }
};

let BlockchainSettingsAPI = {
  changeLanguage () {},
  changeLocalCurrency () {}
};

let WalletCrypto = {
  decryptWallet () {}
};

let hdwallet = {
  guid: '1234',
  sharedKey: 'shared',
  scanBip44 () {
    return {
      then (cb) {
        cb();
        return {
          catch () {}
        };
      }
    };
  }
};

let WalletSignup = {
  generateNewWallet (inputedPassword, inputedEmail, mnemonic, bip39Password, firstAccountName, successCallback, errorCallback) {
    successCallback(hdwallet);
  }
};

const API = {
  securePostCallbacks () {},
  request (action, method, data, withCred) {}
};

const WalletNetwork = {
  insertWallet () {
    console.log(WalletNetwork.failInsertion);
    if (WalletNetwork.failInsertion) {
      return new Promise((resolve, reject) => reject());
    } else {
      return new Promise(resolve => resolve());
    }
  },

  establishSession (token) {
    return {
      then (cb) {
        if (token !== 'token') {
          token = 'new_token';
        }
        cb(token);
        return {
          catch (cb) {}
        };
      }
    };
  },

  fetchWallet (guid, sessionToken, needsTwoFactorCode, authorizationRequired) {
    return {
      then (cb) {
        if (guid === 'wallet-2fa') {
          needsTwoFactorCode(1);
        } else if (guid === 'wallet-email-auth') {
          authorizationRequired().then(() =>
            // WalletNetwork proceeds with login and then calls success:
            cb({guid, payload: 'encrypted'})
          );
        } else if (guid === 'wallet-email-auth-2fa') {
          authorizationRequired().then(() =>
            // WalletNetwork proceeds with login and now asks for 2FA:
            needsTwoFactorCode(1)
          );
        } else {
          WalletStore.setGuid(guid);
          WalletStore.setEncryptedWalletData('encrypted');
          cb({guid, payload: 'encrypted'});
        }
        return {
          catch (cb) {}
        };
      }
    };
  },

  fetchWalletWithSharedKey (guid) {
    return {
      then (cb) {
        WalletStore.setGuid(guid);
        WalletStore.setEncryptedWalletData('encrypted');
        cb({guid, payload: 'encrypted'});
        return {
          catch (cb) {}
        };
      }
    };
  },

  fetchWalletWithTwoFactor (guid, sessionToken, twoFactorCode) {
    return {
      then (cb) {
        WalletStore.setGuid(guid);
        WalletStore.setEncryptedWalletData('encrypted');
        cb({guid, payload: 'encrypted'});
        return {
          catch (cb) {}
        };
      }
    };
  },

  pollForSessionGUID (token) {
    return {
      then (cb) {
        cb();
        return {
          catch (cb) {}
        };
      }
    };
  }
};

let BIP39 = {
  generateMnemonic (str, rng, wlist) {
    let mnemonic = 'bicycle balcony prefer kid flower pole goose crouch century lady worry flavor';
    let seed = rng(32);
    return seed === 'random' ? mnemonic : 'failure';
  }
};

const RNG = {
  run (input) {
    if (RNG.shouldThrow) {
      throw new Error('Connection failed');
    }
    return 'random';
  }
};

let stubs = {
  './wallet-store': WalletStore,
  './wallet-crypto': WalletCrypto,
  './wallet-signup': WalletSignup,
  './api': API,
  './wallet-network': WalletNetwork,
  'bip39': BIP39,
  './rng': RNG,
  './blockchain-settings-api': BlockchainSettingsAPI
};

let MyWallet = proxyquire('../src/wallet', stubs);

describe('Wallet', () => {
  let callbacks;

  beforeEach(() => {
    WalletStore.setGuid(undefined);
    return WalletStore.setEncryptedWalletData(undefined);
  });

  describe('makePairingCode()', () => {
    let success;
    let error;

    beforeEach(() => {
      MyWallet.wallet = {
        guid: 'wallet-guid',
        sharedKey: 'shared-key'
      };
      spyOn(API, 'securePostCallbacks').and.callFake((_a, _b, cb) => cb('enc-phrase'));
      spyOn(WalletStore, 'getPassword').and.returnValue('pw');
      spyOn(WalletCrypto, 'encrypt').and.callFake(d => `(enc:${d})`);
      success = jasmine.createSpy('pairing code success');
      error = jasmine.createSpy('pairing code error');
    });

    it('should make a pairing code', () => {
      MyWallet.makePairingCode(success, error);
      expect(success).toHaveBeenCalledWith('1|wallet-guid|(enc:shared-key|7077)');
      expect(error).not.toHaveBeenCalled();
    });

    it('should call WalletCrypto.encrypt with the encryption phrase', () => {
      MyWallet.makePairingCode(success, error);
      expect(WalletCrypto.encrypt).toHaveBeenCalledWith('shared-key|7077', 'enc-phrase', 10);
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    callbacks = {
      success () {},
      needsTwoFactorCode () {},
      wrongTwoFactorCode () {},
      authorizationRequired () {},
      otherError () {},
      newSessionToken () {}
    };

    beforeEach(() => {
      spyOn(MyWallet, 'didFetchWallet').and.callFake(obj =>
        ({
          then (cb) {
            obj.encrypted = undefined;
            cb(obj);
            return {
              catch (cb) {}
            };
          }
        })
      );

      spyOn(MyWallet, 'initializeWallet').and.callFake((inputedPassword, didDecrypt, didBuildHD) =>
        ({
          then (cb) {
            if (inputedPassword === 'password') {
              cb();
            }
            return {
              catch (cb) {
                if (inputedPassword !== 'password') {
                  return cb('WRONG_PASSWORD');
                }
              }
            };
          }
        })
      );

      spyOn(callbacks, 'success');
      spyOn(WalletNetwork, 'establishSession').and.callThrough();
      spyOn(callbacks, 'wrongTwoFactorCode');
      spyOn(API, 'request').and.callThrough();
      spyOn(callbacks, 'authorizationRequired').and.callFake(cb => cb());
    });

    describe('with a shared key', () => {
      it('should not not use a session token', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sharedKey: 'shared-key'
          },
          callbacks
        );

        expect(promise).toBeResolved(done);
        expect(WalletNetwork.establishSession).not.toHaveBeenCalled();
      });

      it('should return the guid', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sharedKey: 'shared-key'
          },
          callbacks
        );

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: '1234'}), done);
      });
    });

    describe('without shared key', () => {
      it('should use a session token', () => {
        MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null
          },
          callbacks
        );

        expect(WalletNetwork.establishSession).toHaveBeenCalled();
      });

      it('should return guid', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null
          },
          callbacks
        );

        expect(promise).toBeResolvedWith(jasmine.objectContaining(
          {guid: '1234'}
        ), done);
      });

      it('should reuse an existing session token if provided', () => {
        MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );

        expect(WalletNetwork.establishSession).toHaveBeenCalledWith('token');
      });

      it('should not reuse a null token', () => {
        MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sessionToken: undefined
          },
          callbacks
        );

        expect(WalletNetwork.establishSession).not.toHaveBeenCalledWith(null);
      });

      it('should announce a new session token', () => {
        spyOn(callbacks, 'newSessionToken');

        MyWallet.login(
          'wallet-2fa',
          'password',
          {
            twoFactor: null,
            sessionToken: null
          },
          callbacks
        );
        expect(callbacks.newSessionToken).toHaveBeenCalledWith('new_token');
      });

      it('should ask for 2FA if applicable and include method', () => {
        spyOn(callbacks, 'needsTwoFactorCode');

        MyWallet.login(
          'wallet-2fa',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );
        expect(callbacks.needsTwoFactorCode).toHaveBeenCalledWith(1);
      });
    });

    describe('email authoritzation', () => {
      let promise;

      beforeEach(() => {
        spyOn(WalletNetwork, 'pollForSessionGUID').and.callThrough();

        promise = MyWallet.login(
          'wallet-email-auth',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );
      });

      it('should notify user if applicable', () => expect(callbacks.authorizationRequired).toHaveBeenCalled());

      it('should start polling to check for authoritzation, using token', () => expect(WalletNetwork.pollForSessionGUID).toHaveBeenCalledWith('token'));

      it('should continue login after request is approved', done =>
        expect(promise).toBeResolvedWith(jasmine.objectContaining(
          {guid: 'wallet-email-auth'}
        ), done)
      );
    });

    describe('email authoritzation and 2FA', () => {
      beforeEach(() => {
        spyOn(WalletNetwork, 'pollForSessionGUID').and.callThrough();

        MyWallet.login(
          'wallet-email-auth-2fa',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );
      });

      it('should start polling to check for authoritzation, using token', () => expect(WalletNetwork.pollForSessionGUID).toHaveBeenCalledWith('token'));

      it('should ask for 2FA after email auth', done =>
        spyOn(callbacks, 'needsTwoFactorCode').and.callFake(method => {
          expect(method).toEqual(1);
          done();
        })
      );
    });

    describe('with 2FA', () => {
      beforeEach(() => spyOn(WalletNetwork, 'fetchWalletWithTwoFactor').and.callThrough());

      it('should return guid', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: {type: 5, code: 'BF399'},
            sessionToken: 'token'
          },
          callbacks
        );

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: '1234'}), done);
      });

      it('should call WalletNetwork.fetchWalletWithTwoFactor with the code and session token', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: {type: 5, code: 'BF399'},
            sessionToken: 'token'
          },
          callbacks
        );

        expect(promise).toBeResolved(done);
        expect(WalletNetwork.fetchWalletWithTwoFactor).toHaveBeenCalled();
        expect(WalletNetwork.fetchWalletWithTwoFactor.calls.argsFor(0)[2]).toEqual(
          {type: 5, code: 'BF399'}
        );
        expect(WalletNetwork.fetchWalletWithTwoFactor.calls.argsFor(0)[1]).toEqual('token');
      });

      it('should not call fetchWalletWithTwoFactor() when null', done => {
        let promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: '1234'}), done);
        expect(WalletNetwork.fetchWalletWithTwoFactor).not.toHaveBeenCalled();
      });
    });

    describe('wrong password', () => {
      let promise;

      beforeEach(() => {
        spyOn(WalletNetwork, 'fetchWallet').and.callThrough();

        promise = MyWallet.login(
          '1234',
          'wrong_password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );
      });

      it('should fetch the wallet and throw an error', done => {
        expect(promise).toBeRejectedWith('WRONG_PASSWORD', done);
        expect(WalletNetwork.fetchWallet).toHaveBeenCalled();
      });

      it('should not fetch wallet again at the next attempt', done => {
        // Second attempt:
        promise = MyWallet.login(
          '1234',
          'password',
          {
            twoFactor: null,
            sessionToken: 'token'
          },
          callbacks
        );

        expect(promise).toBeResolvedWith(jasmine.objectContaining({guid: '1234'}), done);
        expect(WalletNetwork.fetchWallet.calls.count()).toEqual(1);
      });
    });
  }); // First attempt only

  describe('didFetchWallet', () => {
    beforeEach(() => spyOn(WalletStore, 'setEncryptedWalletData').and.callThrough());

    it('should resolve', done => {
      let promise = MyWallet.didFetchWallet({payload: ''});
      expect(promise).toBeResolved(done);
    });

    it('should update the wallet store', () => {
      MyWallet.didFetchWallet({payload: 'encrypted'});
      expect(WalletStore.setEncryptedWalletData).toHaveBeenCalled();
    });

    it("should not update the wallet store if there's no payload", () => {
      MyWallet.didFetchWallet({});
      MyWallet.didFetchWallet({payload: ''});

      expect(WalletStore.setEncryptedWalletData).not.toHaveBeenCalled();
    });

    it("should not update the wallet store if payload is 'Not modified'", () => {
      MyWallet.didFetchWallet({payload: 'Not modified'});

      expect(WalletStore.setEncryptedWalletData).not.toHaveBeenCalled();
    });
  });

  describe('initializeWallet', () => {
    beforeEach(() =>
      spyOn(MyWallet, 'decryptAndInitializeWallet').and.callFake(() => {
        MyWallet.wallet = {
          loadExternal () {
            return Promise.resolve();
          },
          incStats () {
            return Promise.reject();
          },
          saveGUIDtoMetadata () {
            return Promise.reject();
          }
        };
        return Promise.resolve();
      })
    );

    it('should call decryptAndInitializeWallet()', done => {
      let check = () => expect(MyWallet.decryptAndInitializeWallet).toHaveBeenCalled();

      let promise = MyWallet.initializeWallet().then(check);
      expect(promise).toBeResolved(done);
    });

    it('should initialize wallet with stats failure', done => {
      let promise = MyWallet.initializeWallet();
      expect(promise).toBeResolved(done);
    });

    it('should initialize wallet with saveGUID failure', done => {
      let promise = MyWallet.initializeWallet();
      expect(promise).toBeResolved(done);
    });
  });

  describe('decryptAndInitializeWallet', () => {
    beforeEach(() => spyOn(WalletCrypto, 'decryptWallet'));

    it('should call WalletCrypto.decryptWallet', () => {
      MyWallet.decryptAndInitializeWallet(() => {}, () => {});
      expect(WalletCrypto.decryptWallet).toHaveBeenCalled();
    });
  });

  describe('recoverFromMnemonic', () => {
    beforeEach(() => {
      spyOn(WalletSignup, 'generateNewWallet').and.callThrough();
      spyOn(WalletStore, 'unsafeSetPassword');
    });

    it('should generate a new wallet', () => {
      MyWallet.recoverFromMnemonic('a@b.com', 'secret', 'nuclear bunker sphaghetti monster dim sum sauce', undefined, () => {});
      expect(WalletSignup.generateNewWallet).toHaveBeenCalled();
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[0]).toEqual('secret');
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[1]).toEqual('a@b.com');
      expect(WalletSignup.generateNewWallet.calls.argsFor(0)[2]).toEqual('nuclear bunker sphaghetti monster dim sum sauce');
    });

    it('should call unsafeSetPassword', () => {
      MyWallet.recoverFromMnemonic('a@b.com', 'secret', 'nuclear bunker sphaghetti monster dim sum sauce', undefined, () => {});
      expect(WalletStore.unsafeSetPassword).toHaveBeenCalledWith('secret');
    });

    it('should pass guid, shared key, password and session token upon success', done => {
      let obs = {
        success () {}
      };
      spyOn(obs, 'success').and.callThrough();

      MyWallet.recoverFromMnemonic('a@b.com', 'secret', 'nuclear bunker sphaghetti monster dim sum sauce', undefined, obs.success);

      let result = () => {
        expect(obs.success).toHaveBeenCalledWith({ guid: '1234', sharedKey: 'shared', password: 'secret', sessionToken: 'new_token' });
        done();
      };

      setTimeout(result, 1);
    });

    it('should scan address space', () => {
      spyOn(hdwallet, 'scanBip44').and.callThrough();
      MyWallet.recoverFromMnemonic('a@b.com', 'secret', 'nuclear bunker sphaghetti monster dim sum sauce', undefined, () => {});
      expect(hdwallet.scanBip44).toHaveBeenCalled();
    });
  });

  describe('createNewWallet', () => {
    beforeEach(() => {
      spyOn(BIP39, 'generateMnemonic').and.callThrough();
      spyOn(RNG, 'run').and.callThrough();
    });

    it('should call BIP39.generateMnemonic with our RNG', () => {
      MyWallet.createNewWallet();
      expect(BIP39.generateMnemonic).toHaveBeenCalled();
      expect(RNG.run).toHaveBeenCalled();
    });

    it('should call errorCallback if RNG throws', done => {
      // E.g. because there was a network failure.
      // This assumes BIP39.generateMnemonic does not rescue a throw
      // inside the RNG

      let observers =
        {error () { done(); }};

      spyOn(observers, 'error').and.callThrough();

      RNG.shouldThrow = true;
      MyWallet.createNewWallet('a@b.com', '1234', 'My Wallet', 'en', 'usd', observers.success, observers.error);
      expect(observers.error).toHaveBeenCalledWith('Connection failed');

      RNG.shouldThrow = false;
    });

    describe('when the wallet insertion fails', () => {
      let observers = null;

      beforeEach(done => {
        observers = {
          success () { done(); },
          error () { done(); }
        };

        spyOn(observers, 'success').and.callThrough();
        spyOn(observers, 'error').and.callThrough();

        WalletNetwork.failInsertion = true;
        return MyWallet.createNewWallet('a@b.com', '1234', 'My Wallet', 'en', 'usd', observers.success, observers.error);
      });

      it('should fail', () => {
        expect(observers.success).not.toHaveBeenCalled();
        expect(observers.error).toHaveBeenCalled();
      });

      afterEach(() => { WalletNetwork.failInsertion = false; });
    });
  });
});
