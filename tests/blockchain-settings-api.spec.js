let proxyquire = require('proxyquireify')(require);
let exchangeMock = require('./__mocks__/bitcoin-exchange-client.mock');

let MyWallet = {
  doubleEncrypted: false,
  wallet: {
    validateSecondPassword: function (pass) {
      return pass === 'second password';
    },
    isDoubleEncrypted: function () {
      return MyWallet.doubleEncrypted;
    },
    accountInfo: {
      email: 'a@b.com',
      isEmailVerified: false
    }
  },
  syncWallet: function () {}
};

let API = {
  callFailWithResponseText: false,
  callFailWithoutResponseText: false,
  securePost: function (endpoint, {method}) {
    let promise = {
      then: function (success, error) {
        if (API.callFailWithoutResponseText) {
          error('call failed');
        } else if (API.callFailWithResponseText) {
          error({ responseText: 'call failed' });
        } else {
          success('call succeeded');
        }
      },
      'catch': function () {}
    };
    if (method === 'update-notifications-type') {
      return {
        then: function (success) {
          if (!API.callFailWithoutResponseText && !API.callFailWithResponseText) {
            success();
          }
          return promise;
        }
      };
    } else {
      return promise;
    }
  },
  securePostCallbacks: function (endpoint, data, success, error) {
    if (API.callFailWithoutResponseText) {
      error('call failed');
    } else if (API.callFailWithResponseText) {
      error({ responseText: 'call failed' });
    } else {
      success('call succeeded');
    }
  }
};

let WalletStore = {
  sendEvent: function () {},
  getPassword: function () { return 'password'; },
  setRealAuthType: function () {},
  setSyncPubKeys: function () {}
};

let stubs = {
  'bitcoin-exchange-client': exchangeMock,
  './wallet.js': MyWallet,
  './api': API,
  './wallet-store.js': WalletStore
};

let SettingsAPI = proxyquire('../src/blockchain-settings-api', stubs);

describe('SettingsAPI', () => {
  let observers = {
    success: function () {},
    error: function () {}
  };

  beforeEach(() => {
    spyOn(WalletStore, 'sendEvent');
    spyOn(WalletStore, 'setRealAuthType');
    spyOn(API, 'securePost').and.callThrough();
    spyOn(API, 'securePostCallbacks').and.callThrough();
    spyOn(observers, 'success').and.callThrough();
    spyOn(observers, 'error').and.callThrough();
  });

  describe('boolean settings', () => {
    let booleanSettingsField = [
      {
        func: 'updateIPlockOn',
        endpoint: 'update-ip-lock-on'
      }, {
        func: 'toggleSave2FA',
        endpoint: 'update-never-save-auth-type'
      }
    ];

    booleanSettingsField.forEach(({func, endpoint}) => {
      describe(`${func}`, () => {
        it('should work without any callbacks', () => {
          SettingsAPI[func](true);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 4,
            payload: 'true',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: `${endpoint}-success: call succeeded`
          });
        });

        it('should work with callbacks', () => {
          SettingsAPI[func](false, observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 5,
            payload: 'false',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: `${endpoint}-success: call succeeded`
          });
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func](1, observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 4,
            payload: 'true',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: `${endpoint}-error: call failed`
          });
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
        });
      });
    });

    describe('TOR block', () => {
      it('should work without any callbacks', () => {
        SettingsAPI.updateTorIpBlock(true);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          length: 1,
          payload: '1',
          method: 'update-block-tor-ips'
        }, jasmine.anything(), jasmine.anything());
        expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
          type: 'success',
          message: 'update-block-tor-ips-success: call succeeded'
        });
      });

      it('should work with callbacks', () => {
        SettingsAPI.updateTorIpBlock(false, observers.success, observers.error);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          length: 1,
          payload: '0',
          method: 'update-block-tor-ips'
        }, jasmine.anything(), jasmine.anything());
        expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
          type: 'success',
          message: 'update-block-tor-ips-success: call succeeded'
        });
        expect(observers.success).toHaveBeenCalled();
        expect(observers.error).not.toHaveBeenCalled();
      });

      it('should fail if the API call fails', () => {
        API.callFailWithoutResponseText = true;
        SettingsAPI.updateTorIpBlock(1, observers.success, observers.error);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          length: 1,
          payload: '1',
          method: 'update-block-tor-ips'
        }, jasmine.anything(), jasmine.anything());
        expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
          type: 'error',
          message: 'update-block-tor-ips-error: call failed'
        });
        expect(observers.success).not.toHaveBeenCalled();
        expect(observers.error).toHaveBeenCalled();
      });
    });
  });

  describe('string settings', () => {
    let stringSettingsField = [
      {
        func: 'changeLanguage',
        endpoint: 'update-language'
      }, {
        func: 'updateIPlock',
        endpoint: 'update-ip-lock'
      }, {
        func: 'changeLocalCurrency',
        endpoint: 'update-currency'
      }, {
        func: 'changeBtcCurrency',
        endpoint: 'update-btc-currency'
      }, {
        func: 'changeEmail',
        endpoint: 'update-email'
      }, {
        func: 'changeMobileNumber',
        endpoint: 'update-sms'
      }, {
        func: 'resendEmailConfirmation',
        endpoint: 'update-email'
      }
    ];

    stringSettingsField.forEach(({func, endpoint}) => {
      describe(`${func}`, () => {
        it('should work without any callbacks', () => {
          SettingsAPI[func]('string');
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 6,
            payload: 'string',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: `${endpoint}-success: call succeeded`
          });
        });

        it('should work with callbacks', () => {
          SettingsAPI[func]('string', observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 6,
            payload: 'string',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: `${endpoint}-success: call succeeded`
          });
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func]('string', observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 6,
            payload: 'string',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: `${endpoint}-error: call failed`
          });
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
        });
      });
    });
  });

  describe('code verification settings', () => {
    let codeFields = [
      {
        func: 'verifyMobile',
        endpoint: 'verify-sms'
      }, {
        func: 'verifyEmail',
        endpoint: 'verify-email-code'
      }
    ];

    codeFields.forEach(({func, endpoint}) => ['asder', 'sfdsrsetertetrte'].forEach(code => {
      describe(`${func} with code ${code}`, () => {
        it('should work with callbacks', () => {
          SettingsAPI[func](code, observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: code.length,
            payload: code,
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func](code, observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: code.length,
            payload: code,
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: 'call failed'
          });
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
        });
      });
    }));
  });

  describe('getters', () => {
    let getterFields = [
      {
        func: 'getActivityLogs',
        endpoint: 'list-logs',
        errorMessage: 'Error Downloading Activity Logs'
      }, {
        func: 'getAccountInfo',
        endpoint: 'get-info',
        errorMessage: 'Error Downloading Account Settings'
      }
    ];

    getterFields.forEach(({func, endpoint, errorMessage}) => describe(`${func}`, () => {
      it('should work without callbacks', () => {
        SettingsAPI[func]();
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          method: endpoint,
          format: 'json'
        }, jasmine.anything(), jasmine.anything());
      });

      it('should work with callbacks', () => {
        SettingsAPI[func](observers.success, observers.error);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          method: endpoint,
          format: 'json'
        }, jasmine.anything(), jasmine.anything());
        expect(observers.success).toHaveBeenCalled();
        expect(observers.error).not.toHaveBeenCalled();
      });

      it('should fail if the API call fails', () => {
        API.callFailWithoutResponseText = true;
        SettingsAPI[func](observers.success, observers.error);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          method: endpoint,
          format: 'json'
        }, jasmine.anything(), jasmine.anything());
        expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
          type: 'error',
          message: errorMessage
        });
        expect(observers.success).not.toHaveBeenCalled();
        expect(observers.error).toHaveBeenCalled();
      });

      it('should fail with error message if the API call fails with an error message', () => {
        API.callFailWithResponseText = true;
        SettingsAPI[func](observers.success, observers.error);
        expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
          method: endpoint,
          format: 'json'
        }, jasmine.anything(), jasmine.anything());
        expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
          type: 'error',
          message: 'call failed'
        });
        expect(observers.success).not.toHaveBeenCalled();
        expect(observers.error).toHaveBeenCalled();
      });
    }));
  });

  describe('custom settings', () => {
    let customSettingsFields = [
      {
        func: 'disableAllNotifications',
        endpoint: 'update-notifications-type',
        length: 1,
        payload: 0,
        errorMessage: 'Error Disabling Receive Notifications'
      }, {
        func: 'enableReceiveNotifications',
        endpoint: 'update-notifications-on',
        length: 1,
        payload: 2,
        errorMessage: 'Error Enabling Receive Notifications'
      }, {
        func: 'enableEmailNotifications',
        endpoint: 'update-notifications-type',
        length: 1,
        payload: 1,
        errorMessage: 'Error Enabling Email Notifications'
      }
    ];

    customSettingsFields.forEach(setting => {
      describe(`${setting.func}`, () => {
        it('should work with callbacks', () => {
          SettingsAPI[setting.func](observers.success, observers.error);
          expect(API.securePost).toHaveBeenCalledWith('wallet', {
            length: setting.length,
            payload: setting.payload,
            method: setting.endpoint
          });
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[setting.func](observers.success, observers.error);
          expect(API.securePost).toHaveBeenCalledWith('wallet', {
            length: setting.length,
            payload: setting.payload,
            method: setting.endpoint
          });
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: setting.errorMessage
          });
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
        });

        it('should fail with error message if the API call fails with an error message', () => {
          API.callFailWithResponseText = true;
          SettingsAPI[setting.func](observers.success, observers.error);
          expect(API.securePost).toHaveBeenCalledWith('wallet', {
            length: setting.length,
            payload: setting.payload,
            method: setting.endpoint
          });
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: 'call failed'
          });
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
        });
      });
    });
  });

  describe('updateNotificationsType', () => {
    let method = 'update-notifications-type';
    let vectors = [
      {
        args: [
          {
            email: false,
            sms: false
          }
        ],
        length: 1,
        payload: 0
      }, {
        args: [
          {
            email: true,
            sms: false
          }
        ],
        length: 1,
        payload: 1
      }, {
        args: [
          {
            email: false,
            sms: true
          }
        ],
        length: 2,
        payload: 32
      }, {
        args: [
          {
            email: true,
            sms: true
          }
        ],
        length: 2,
        payload: 33
      }
    ];

    beforeEach(() => {
      spyOn(MyWallet, 'syncWallet');
      spyOn(WalletStore, 'setSyncPubKeys');
    });

    vectors.forEach(v =>
      it(`should send ${v.payload} when email is ${v.email} and sms is ${v.sms}`, () => {
        SettingsAPI.updateNotificationsType.apply(null, v.args);
        expect(API.securePost).toHaveBeenCalledWith('wallet', {
          method,
          length: v.length,
          payload: v.payload
        });
      })
    );

    it('should call syncWallet if successful', () => {
      SettingsAPI.updateNotificationsType({});
      expect(MyWallet.syncWallet).toHaveBeenCalled();
    });

    it('should not call syncWallet if unsuccessful', () => {
      API.callFailWithoutResponseText = true;
      SettingsAPI.updateNotificationsType({});
      expect(MyWallet.syncWallet).not.toHaveBeenCalled();
    });

    it('should set syncPubKeys to true if enabling notifications', () => {
      SettingsAPI.updateNotificationsType({ email: true });
      expect(WalletStore.setSyncPubKeys).toHaveBeenCalledWith(true);
    });

    it('should set syncPubKeys to false if disabling notifications', () => {
      SettingsAPI.updateNotificationsType({});
      expect(WalletStore.setSyncPubKeys).toHaveBeenCalledWith(false);
    });
  });

  describe('updateNotificationsOn', () => {
    let method = 'update-notifications-on';
    let vectors = [
      {
        args: [
          {
            send: true,
            receive: true
          }
        ],
        length: 1,
        payload: 0
      }, {
        args: [
          {
            send: true,
            receive: false
          }
        ],
        length: 1,
        payload: 1
      }, {
        args: [
          {
            send: false,
            receive: true
          }
        ],
        length: 1,
        payload: 2
      }
    ];

    vectors.forEach(v =>
      it(`should send ${v.payload} when email is ${v.email} and sms is ${v.sms}`, () => {
        SettingsAPI.updateNotificationsOn.apply(null, v.args);
        expect(API.securePost).toHaveBeenCalledWith('wallet', {
          method,
          length: v.length,
          payload: v.payload
        });
      })
    );
  });

  describe('alias', () =>
    it('should remove', () => {
      SettingsAPI.removeAlias();
      expect(API.securePost).toHaveBeenCalledWith('wallet', {
        method: 'remove-alias',
        length: 0,
        payload: ''
      });
    })
  );

  describe('password hints', () => {
    let passwordHintFields = [
      {
        func: 'updatePasswordHint1',
        endpoint: 'update-password-hint1'
      }, {
        func: 'updatePasswordHint2',
        endpoint: 'update-password-hint2'
      }
    ];

    passwordHintFields.forEach(({func, endpoint}) =>
      describe(`${func}`, () => {
        it('should not work without error callback', () =>
          expect(() => SettingsAPI[func]('hint', observers.success)).toThrow()
        );

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func]('hint', observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 4,
            payload: 'hint',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: `${endpoint}-error: call failed`
          });
        });

        it('should fail if the hint is not extended ascii', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func]('hįnt', observers.success, observers.error);
          expect(API.securePostCallbacks).not.toHaveBeenCalled();
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalledWith(101);
          expect(WalletStore.sendEvent).not.toHaveBeenCalled();
        });

        it('should fail if the hint is the same as the password', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func]('password', observers.success, observers.error);
          expect(API.securePostCallbacks).not.toHaveBeenCalled();
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalledWith(102);
          expect(WalletStore.sendEvent).not.toHaveBeenCalled();
        });

        it('should fail if the hint is the same as the second password', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func]('second password', observers.success, observers.error);
          expect(API.securePostCallbacks).not.toHaveBeenCalled();
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalledWith(103);
          expect(WalletStore.sendEvent).not.toHaveBeenCalled();
        });

        it('should work otherwise', () => {
          SettingsAPI[func]('hint', observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            length: 4,
            payload: 'hint',
            method: endpoint
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: `${endpoint}-success: call succeeded`
          });
        });
      })
    );
  });

  describe('auth types', () => {
    let authTypeFields = [
      {
        func: 'setTwoFactorEmail',
        authType: 2
      }, {
        func: 'unsetTwoFactor',
        authType: 0
      }, {
        func: 'setTwoFactorSMS',
        authType: 5
      }
    ];

    authTypeFields.forEach(({func, authType}) =>
      describe(`${func}`, () => {
        it('should work without callbacks', () => {
          SettingsAPI[func]();
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: 'update-auth-type-success: call succeeded'
          });
          expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(authType);
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func](observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: 'update-auth-type-error: call failed'
          });
        });

        it('should work with callbacks', () => {
          SettingsAPI[func](observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: 'update-auth-type-success: call succeeded'
          });
          expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(authType);
        });
      })
    );
  });

  describe('confirmTwoFactorGoogleAuthenticator', () => {
    it('should work without callbacks', () => {
      SettingsAPI.confirmTwoFactorGoogleAuthenticator('abc121');
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet?code=abc121', {
        method: 'update-auth-type',
        payload: '4',
        length: 1
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'success',
        message: 'update-auth-type-success: call succeeded'
      });
      expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(4);
    });

    it('should fail if the API call fails', () => {
      API.callFailWithoutResponseText = true;
      SettingsAPI.confirmTwoFactorGoogleAuthenticator('abc121', observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet?code=abc121', {
        method: 'update-auth-type',
        payload: '4',
        length: 1
      }, jasmine.anything(), jasmine.anything());
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'error',
        message: 'update-auth-type-error: call failed'
      });
    });

    it('should work with callbacks', () => {
      SettingsAPI.confirmTwoFactorGoogleAuthenticator('abc121', observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet?code=abc121', {
        method: 'update-auth-type',
        payload: '4',
        length: 1
      }, jasmine.anything(), jasmine.anything());
      expect(observers.success).toHaveBeenCalled();
      expect(observers.error).not.toHaveBeenCalled();
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'success',
        message: 'update-auth-type-success: call succeeded'
      });
      expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(4);
    });
  });

  describe('auth types', () => {
    let authTypeFields = [
      {
        func: 'setTwoFactorEmail',
        authType: 2
      }, {
        func: 'unsetTwoFactor',
        authType: 0
      }, {
        func: 'setTwoFactorSMS',
        authType: 5
      }
    ];

    authTypeFields.forEach(({func, authType}) =>
      describe(`${func}`, () => {
        it('should work without callbacks', () => {
          SettingsAPI[func]();
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: 'update-auth-type-success: call succeeded'
          });
          expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(authType);
        });

        it('should fail if the API call fails', () => {
          API.callFailWithoutResponseText = true;
          SettingsAPI[func](observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).not.toHaveBeenCalled();
          expect(observers.error).toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'error',
            message: 'update-auth-type-error: call failed'
          });
        });

        it('should work with callbacks', () => {
          SettingsAPI[func](observers.success, observers.error);
          expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
            method: 'update-auth-type',
            payload: `${authType}`,
            length: 1
          }, jasmine.anything(), jasmine.anything());
          expect(observers.success).toHaveBeenCalled();
          expect(observers.error).not.toHaveBeenCalled();
          expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
            type: 'success',
            message: 'update-auth-type-success: call succeeded'
          });
          expect(WalletStore.setRealAuthType).toHaveBeenCalledWith(authType);
        });
      })
    );
  });

  describe('enableEmailReceiveNotifications', () => {
    it("shouldn't work without callbacks", () =>
      expect(() => SettingsAPI.enableEmailReceiveNotifications()).toThrow()
    );

    it("shouldn't work without error callback", () =>
      expect(() => SettingsAPI.enableEmailReceiveNotifications(observers.success)).toThrow()
    );

    it('should work with both callbacks set', () => {
      SettingsAPI.enableEmailReceiveNotifications(observers.success, observers.error);
      expect(observers.success).toHaveBeenCalled();
      expect(observers.error).not.toHaveBeenCalled();
      expect(API.securePost).toHaveBeenCalledTimes(2);
    });

    it('should fail if any API call fails', () => {
      API.callFailWithoutResponseText = true;
      SettingsAPI.enableEmailReceiveNotifications(observers.success, observers.error);
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
      expect(WalletStore.sendEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('setTwoFactorGoogleAuthenticator', () => {
    it('should work without callbacks', () => {
      SettingsAPI.setTwoFactorGoogleAuthenticator();
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        method: 'generate-google-secret'
      }, jasmine.anything(), jasmine.anything());
    });

    it('should work with callbacks', () => {
      SettingsAPI.setTwoFactorGoogleAuthenticator(observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        method: 'generate-google-secret'
      }, jasmine.anything(), jasmine.anything());
      expect(observers.success).toHaveBeenCalled();
      expect(observers.error).not.toHaveBeenCalled();
    });

    it('should fail with error message if the API call fails with an error message', () => {
      API.callFailWithResponseText = true;
      SettingsAPI.setTwoFactorGoogleAuthenticator(observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        method: 'generate-google-secret'
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'error',
        message: 'call failed'
      });
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
    });
  });

  describe('setTwoFactorYubiKey', () => {
    it('should not work without callbacks', () =>
      expect(() => SettingsAPI.setTwoFactorYubiKey('cdsfe')).toThrow()
    );

    it('should work with callbacks', () => {
      SettingsAPI.setTwoFactorYubiKey('cdsfd', observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledTimes(2);
      expect(observers.success).toHaveBeenCalled();
      expect(observers.error).not.toHaveBeenCalled();
    });

    it('should fail with error message if the API call fails with an error message', () => {
      API.callFailWithoutResponseText = true;
      SettingsAPI.setTwoFactorYubiKey('cdsfd', observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        method: 'update-yubikey',
        payload: 'cdsfd',
        length: 5
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'error',
        message: 'update-yubikey-error: call failed'
      });
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
    });
  });

  describe('updateLoggingLevel', () => {
    it('should work without any callbacks', () => {
      SettingsAPI.updateLoggingLevel(0);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        length: 1,
        payload: '0',
        method: 'update-logging-level'
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'success',
        message: 'update-logging-level-success: call succeeded'
      });
    });

    it('should work with callbacks', () => {
      SettingsAPI.updateLoggingLevel(1, observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        length: 1,
        payload: '1',
        method: 'update-logging-level'
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'success',
        message: 'update-logging-level-success: call succeeded'
      });
      expect(observers.success).toHaveBeenCalled();
      expect(observers.error).not.toHaveBeenCalled();
    });

    it('should fail if the API call fails', () => {
      API.callFailWithoutResponseText = true;
      SettingsAPI.updateLoggingLevel(2, observers.success, observers.error);
      expect(API.securePostCallbacks).toHaveBeenCalledWith('wallet', {
        length: 1,
        payload: '2',
        method: 'update-logging-level'
      }, jasmine.anything(), jasmine.anything());
      expect(WalletStore.sendEvent).toHaveBeenCalledWith('msg', {
        type: 'error',
        message: 'update-logging-level-error: call failed'
      });
      expect(observers.success).not.toHaveBeenCalled();
      expect(observers.error).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    API.callFailWithoutResponseText = false;
    API.callFailWithResponseText = false;
    MyWallet.doubleEncrypted = false;
  });
});
