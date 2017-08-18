let proxyquire = require('proxyquireify')(require);
let exchangeMock = require('./__mocks__/bitcoin-exchange-client.mock');

describe('WalletNetwork', () => {
  const API = {
    retry (f) {
      return f();
    },
    request (action, method, data, headers) {
      console.log(action, method, data, headers);
      return new Promise((resolve, reject) => {
        if (method === 'uuid-generator') {
          if (API.callFail) {
            resolve({});
          } else {
            resolve({uuids: ['1234', '5678']});
          }
        } else if (method === 'wallet') {
          if (data.method === 'recover-wallet') {
            if (data.captcha === 'eH1hs') {
              resolve({success: true, message: 'Sent email'});
            } else {
              resolve({success: false, message: 'Invalid Captcha'});
            }
          } else if (data.method === 'reset-two-factor-form') {
            if (data.kaptcha === 'eH1hs') {
              resolve({success: true, message: 'Request Submitted'});
            } else {
              resolve({success: false, message: 'Invalid Captcha'});
            }
          }
        } else if (method === 'wallet/1234') {
          if (API.callFail) {
            throw ''; // eslint-disable-line no-throw-literal
          } else {
            resolve('done');
          }
        } else if (method === 'wallet/poll-for-session-guid') {
          resolve({guid: '1234'});
        } else if ((action === 'POST') && (method === 'wallet/sessions')) {
          if (API.callFail) {
            throw new Error();
          } else {
            resolve({token: 'token'});
          }
        } else if (method === 'kaptcha.jpg') {
          resolve('image');
        } else {
          reject('bad call');
        }
      });
    },

    securePost () {
      if (API.callFail) {
        return Promise.reject('api call fail');
      } else {
        return Promise.resolve('api call success');
      }
    },

    securePostCallbacks (url, {method}, success, error) {
      if (API.callFail) {
        error('api call fail');
      } else {
        if (method === 'wallet.aes.json') {
          if (API.badChecksum) {
            success({payload: 'hex data'});
          } else {
            success({payload: 'Not modified'});
          }
        }
      }
    }
  };

  const WalletCrypto = {
    encryptWallet () {
      if (WalletCrypto.encryptError) {
        return [];
      } else {
        return ['encrypted'];
      }
    },
    decryptWalletSync () {
      if (WalletCrypto.decryptError) {
        throw Error('');
      } else {
        return 'decrypted';
      }
    },
    sha256 (msg) { return msg; }
  };

  let MyWallet = {
    wallet: {
      defaultPbkdf2Iterations: 10000,
      isUpgradedToHD: true
    }
  };

  let isPolling = false;
  let WalletStore = {
    isPolling () { return isPolling; },
    setIsPolling (val) { isPolling = val; }
  };

  let WalletNetwork = proxyquire('../src/wallet-network', {
    'bitcoin-exchange-client': exchangeMock,
    './api': API,
    './wallet-crypto': WalletCrypto,
    './wallet': MyWallet,
    './wallet-store': WalletStore
  });

  describe('generateUUIDs', () => {
    it('should return two UUIDs', done => {
      let promise = WalletNetwork.generateUUIDs(2);
      expect(promise).toBeResolvedWith(jasmine.objectContaining(['1234', '5678']), done);
    });

    it('should not be resolved if the API call fails', done => {
      API.callFail = true;
      let promise = WalletNetwork.generateUUIDs(2);
      expect(promise).toBeRejectedWith('Could not generate uuids', done);
      API.callFail = false;
    });
  });

  describe('recoverGuid', () => {
    beforeEach(() => spyOn(API, 'request').and.callThrough());

    it('should POST the users email and captcha', done => {
      let promise = WalletNetwork.recoverGuid('token', 'a@b.com', 'eH1hs');
      expect(promise).toBeResolved(done);
      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[2].email).toEqual('a@b.com');
      expect(API.request.calls.argsFor(0)[2].captcha).toEqual('eH1hs');
    });

    it('should resolve if succesful', done => {
      let promise = WalletNetwork.recoverGuid('token', 'a@b.com', 'eH1hs');
      expect(promise).toBeResolvedWith('Sent email', done);
    });
  });

  describe('resendTwoFactorSms', () => {
    beforeEach(() => spyOn(API, 'request').and.callThrough());

    it('should GET with resend_code to true', done => {
      WalletNetwork.resendTwoFactorSms('1234', 'token').then(() => done());
      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[2].resend_code).toEqual(true);
    });

    it('should pass on the session token', (done) => {
      WalletNetwork.resendTwoFactorSms('1234', 'token').then(() => done());
      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[3].sessionToken).toEqual('token');
    });

    it('should not be resolved if the call fails', done => {
      API.callFail = true;
      let promise = WalletNetwork.resendTwoFactorSms('1234', 'token');
      expect(promise).toBeRejectedWith('Could not resend two factor sms', done);
      API.callFail = false;
    });
  });

  describe('requestTwoFactorReset', () => {
    beforeEach(() => spyOn(API, 'request').and.callThrough());

    it('should POST a captcha and other fields', done => {
      let promise = WalletNetwork.requestTwoFactorReset('token', '1234', 'a@b.com', '', '', 'Hi support', 'eH1hs');
      expect(promise).toBeResolved(done);

      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[2].kaptcha).toEqual('eH1hs');
    });

    it('should resolve if succesful', done => {
      let promise = WalletNetwork.requestTwoFactorReset('token', '1234', 'a@b.com', '', '', 'Hi support', 'eH1hs');
      expect(promise).toBeResolvedWith('Request Submitted', done);
    });

    it('should reject if captcha is invalid', done => {
      let promise = WalletNetwork.requestTwoFactorReset('token', '1234', 'a@b.com', '', '', 'Hi support', "can't read");
      expect(promise).toBeRejectedWith('Invalid Captcha', done);
    });
  });

  describe('insertWallet', () => {
    let observers =
      {callback () {}};

    beforeEach(() => spyOn(observers, 'callback'));

    it('should not go through without a GUID', () => {
      try {
        WalletNetwork.insertWallet();
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: GUID missing');
      }
    });

    it('should not go through without a shared key', () => {
      try {
        WalletNetwork.insertWallet('1234');
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: Shared Key missing');
      }
    });

    it('should not go through without a password', () => {
      try {
        WalletNetwork.insertWallet('1234', 'key');
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: Password missing');
      }
    });

    it('should not go through without a callback', () => {
      try {
        WalletNetwork.insertWallet('1234', 'key', 'password', {});
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: decryptWalletProgress must be a function');
      }

      try {
        WalletNetwork.insertWallet('1234', 'key', 'password', {}, 'sdfsdfs');
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: decryptWalletProgress must be a function');
      }
    });

    it('should not be resolved if the encryption fails', done => {
      WalletCrypto.encryptError = true;
      let promise = WalletNetwork.insertWallet('1234', 'key', 'password', 'badcb', observers.callback);
      expect(promise).toBeRejectedWith('Error encrypting the JSON output', done);
      expect(observers.callback).not.toHaveBeenCalled();
    });

    it('should not be resolved if the decryption fails', done => {
      WalletCrypto.decryptError = true;
      let promise = WalletNetwork.insertWallet('1234', 'key', 'password', 'badcb', observers.callback);
      expect(promise).toBeRejectedWith('', done);
      expect(observers.callback).toHaveBeenCalled();
    });

    it('should not be resolved if the api call fails', done => {
      API.callFail = true;
      let promise = WalletNetwork.insertWallet('1234', 'key', 'password', 'badcb', observers.callback);
      expect(promise).toBeRejected(done);
      expect(observers.callback).toHaveBeenCalled();
    });

    it('should be resolved if the api call does not fails', done => {
      let promise = WalletNetwork.insertWallet('1234', 'key', 'password', 'badcb', observers.callback);
      expect(promise).toBeResolved(done);
      expect(observers.callback).toHaveBeenCalled();
    });

    return afterEach(() => {
      WalletCrypto.encryptError = false;
      WalletCrypto.decryptError = false;
      API.callFail = false;
    });
  });

  describe('checkWalletChecksum', () => {
    let observers = {
      success () {},
      error () {}
    };

    beforeEach(() => {
      spyOn(observers, 'success');
      spyOn(observers, 'error');
    });

    it('should not go through without a checksum', () => {
      try {
        WalletNetwork.checkWalletChecksum();
      } catch (e) {
        expect(e.toString()).toEqual('AssertionError: Payload checksum missing');
      }
    });

    it('should go through without callbacks', () => WalletNetwork.checkWalletChecksum('payload_checksum'));

    it('should be able to fail without callbacks', () => {
      API.callFail = true;
      WalletNetwork.checkWalletChecksum('payload_checksum');
    });

    it('should go through with callbacks', () => WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error));

    it('should not be succeed if the api call fails', () => {
      API.callFail = true;
      WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error);
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
    });

    it('should not be succeed if the checksum is bad', () => {
      API.badChecksum = true;
      WalletNetwork.checkWalletChecksum('payload_checksum', observers.success, observers.error);
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
    });

    return afterEach(() => {
      API.callFail = false;
      API.badChecksum = false;
    });
  });

  describe('obtainSessionToken()', () => {
    it('should POST /wallet/sessions', done => {
      let promise = WalletNetwork.obtainSessionToken();
      expect(promise).toBeResolvedWith('token', done);
    });

    it('should fail if network problem', done => {
      API.callFail = true;
      let promise = WalletNetwork.obtainSessionToken();
      expect(promise).toBeRejected(done);
    });

    afterEach(() => { API.callFail = false; });
  });

  describe('fetchWallet', () => {
    beforeEach(() => {
      spyOn(API, 'request').and.callThrough();

      WalletNetwork.fetchWallet(
        '1234',
        'token'
      );
    });

    it('should pass the guid along', () => expect(API.request.calls.argsFor(0)[1]).toEqual('wallet/1234'));

    it('should use an X-Session-ID header', () => expect(API.request.calls.argsFor(0)[3].sessionToken).toEqual('token'));
  });

  describe('fetchWalletWithSharedKey', () => {
    beforeEach(() => {
      spyOn(API, 'request').and.callThrough();

      WalletNetwork.fetchWalletWithSharedKey(
        '1234',
        'shared-key'
      );
    });

    it('should pass the guid along', () => expect(API.request.calls.argsFor(0)[1]).toEqual('wallet/1234'));

    it('should pass the shared key along', () => expect(API.request.calls.argsFor(0)[2]['sharedKey']).toEqual('shared-key'));

    it('should not use an X-Session-ID header', () => expect(API.request.calls.argsFor(0)[3]).toEqual({}));
  });

  describe('fetchWalletWithTwoFactor', () => {
    beforeEach(() => spyOn(API, 'request').and.callThrough());

    it('should pass code (as object) along', () => {
      WalletNetwork.fetchWalletWithTwoFactor(
        '1234',
        'token',
        {type: 5, code: 'BF399'}
      );

      expect(API.request.calls.argsFor(0)[2].payload).toEqual('BF399');
    });

    it('should convert SMS code to upper case', () => {
      WalletNetwork.fetchWalletWithTwoFactor(
        '1234',
        'token',
        {type: 5, code: 'bf399'}
      );

      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[2].payload).toEqual('BF399');
    });

    it('should not convert Yubikey code to upper case', () => {
      WalletNetwork.fetchWalletWithTwoFactor(
        '1234',
        'password',
        {type: 1, code: 'abcdef123'}
      );

      expect(API.request).toHaveBeenCalled();
      expect(API.request.calls.argsFor(0)[2].payload).toEqual('abcdef123');
    });
  });

  describe('pollForSessionGUID', () => {
    beforeEach(() => {
      WalletStore.setIsPolling(false);
      spyOn(API, 'request').and.callThrough();
      WalletNetwork.pollForSessionGUID('token');
    });

    it('should call wallet/poll-for-session-guid', () => expect(API.request.calls.argsFor(0)[1]).toEqual('wallet/poll-for-session-guid'));

    it('should pass the session token', () => expect(API.request.calls.argsFor(0)[3].sessionToken).toEqual('token'));
  });

  describe('getCaptchaImage', () => {
    beforeEach(() => {
      spyOn(WalletNetwork, 'obtainSessionToken').and.callFake(() => Promise.resolve('token'));
      spyOn(API, 'request').and.callThrough();
    });

    it('should create a new session', () => {
      WalletNetwork.getCaptchaImage();
      expect(WalletNetwork.obtainSessionToken).toHaveBeenCalled();
    });

    it('should call kaptcha.jpg', done => {
      let promise = WalletNetwork.getCaptchaImage().then(() => expect(API.request.calls.argsFor(0)[1]).toEqual('kaptcha.jpg'));

      expect(promise).toBeResolved(done);
    });

    it('should pass session token along', done => {
      let promise = WalletNetwork.getCaptchaImage().then(() => expect(API.request.calls.argsFor(0)[3].sessionToken).toEqual('token'));

      expect(promise).toBeResolved(done);
    });
  });
});
