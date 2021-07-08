let proxyquire = require('proxyquireify')(require);
let MyWallet;
let Labels;
let External;
let Address;
let Wallet;
let HDWallet;
let WalletStore;
let BlockchainSettingsAPI;
let BIP39;
let RNG;

describe('Blockchain-Wallet', () => {
  let wallet;
  let object = {
    "guid": "08151b54-5f17-4907-bd29-8b6cdd3096be",
    "sharedKey": "87d15bdd-95a4-4b35-99d4-8a3a21e3e1fc",
    "double_encryption": false,
    "options": {
      "pbkdf2_iterations": 1200,
      "fee_per_kb": 10000,
      "html5_notifications": false,
      "logout_time": 600000
    },
    "address_book": [],
    "tx_notes": {},
    "tx_names": [],
    "keys": [
      {
        'addr': '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv',
        'priv': 'HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH',
        'tag': 0,
        'created_time': 1437494028974,
        'created_device_name': 'javascript_web',
        'created_device_version': '1.0'
      }, {
        'addr': '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9',
        'priv': null
      },
      {
        'addr': '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h',
        'priv': '5KHY1QhUx8BYrdZPV6GcRw5rVKyAHbjZxz9KLYkaoL16JuFBZv8',
        'tag': 2,
        'created_time': 1437494028974,
        'created_device_name': 'javascript_web',
        'created_device_version': '1.0'
      }
    ],
    "paidTo": {},
    "hd_wallets": [
      {
        "seed_hex": "5de57bbf395cec88fd672fc4d9fb3a12",
        "passphrase": "",
        "mnemonic_verified": false,
        "default_account_idx": 0,
        "accounts": [
          {
            "label": "Private Key Wallet",
            "archived": false,
            "xpriv": "xprv9ymnii74qXShFUk1bhXCWaKhGDqrWVmBg2xAvpT2eopuSjkDk79jNu3TGkg6hTQ7P6vby8f5WxGUnR4Nkqwcz1jt68B8TiJc5UkQ9MbwW3s",
            "xpub": "xpub6Cm98DdxftzzTxpUhj4CsiGRpFgLuxV33FsmjCreD9MtKY5NHeTyvhMw82aANb5GWaBGvGcey7skgcY9ZHk42KhyBXr23yYP5QYcAJzVz7D",
            "address_labels": [],
            "cache": {
              "receiveAccount": "xpub6EF6JBiHWFT7Vf4vgnHbUV3Vbc8daYYQ9zKCJ65hePNX44nMtbJeJgbdPyC4jag6yzqcNhiNX3GFN337fF7NcEBQh4MzU4WSgV7hzbuYLK2",
              "changeAccount": "xpub6EF6JBiHWFT7YjnWwdaXQs2gyrrHLrTR8QqGYp7ykcvELkwuiwriWXquG9LqTevaoFbavcwyEXKGTe56H2aQ1j1a9aEiNWboAPJHg29cE3P"
            }
          },
          {
            "label": "Test",
            "archived": false,
            "xpriv": "xprv9ymnii74qXShHEZU4RKW1W5Z85ft86Qw7hoy9i1K69k5kKwSJQikq1gN1f5pvke3f7wJFftJ5uzhBZHFNRzFmuWWxLjWkc62X4JfWrS6rwe",
            "xpub": "xpub6Cm98DdxftzzVidwASrWNe2Hg7WNXZ8nUvjZx6QveVH4d8Gaqx31NozqrupnCxGPqzVcatEJ8aDKfNfUuHxmfKD8dRDZ6NSFtXiWiwtW2Xh",
            "address_labels": [],
            "cache": {
              "receiveAccount": "xpub6DwfzAco4jGLPn84ni1GEmbaZTgPSbSQQKQCxNFfhhPzrxs2nk89gGV3HYWLcGd53DFWpjfwHsD4Gm49bMLv8sBQdN1CeJgxvNBThpDVYrW",
              "changeAccount": "xpub6DwfzAco4jGLU3VVKZCvttrfwdkoaG4JPkEewGr8TuPfxmPLST6U6DtZjRp9caJgPxw4rpUkFdgdd4tRjh4V8bbEvBN9xcRREyNU8yrt43T"
            }
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    MyWallet = {
      syncWallet (success, error) {
        if (success) {
          return success();
        }
      },
      get_history () {},
      wallet: {
        labels: null
      }
    };

    Labels = () => {
      return {mock: 'labels'};
    };

    External = {
      fetch: () => {
        return Promise.resolve({mock: 'external'});
      }
    };

    Address = {
      new (label) {
        if (Address.shouldThrow) {
          throw new Error('');
        }
        let addr = {
          label,
          encrypt () {
            return {
              persist () {}
            };
          }
        };
        spyOn(addr, 'encrypt').and.callThrough();
        return addr;
      }
    };

    HDWallet = {
      new (cipher) {
        if (HDWallet.shouldThrow) {
          throw new Error('');
        }
        return {
          newAccount () {}
        };
      }
    };

    let Helpers = {
      isInstanceOf (candidate, theClass) {
        return (candidate.label !== undefined) || (typeof (candidate) === 'object');
      }
    };

    let walletStoreTxs = [];
    WalletStore = {
      pushTransaction (tx) { return walletStoreTxs.push(tx); },
      getTransactions () { return walletStoreTxs; },
      getTransaction (hash) {
        return walletStoreTxs.filter(tx => tx.hash === hash)[0];
      },
      setSyncPubKeys (boolean) {}
    };

    BlockchainSettingsAPI = {
      shouldFail: false,
      enableEmailReceiveNotifications (success, error) {
        if (BlockchainSettingsAPI.shouldFail) {
          return error();
        } else {
          return success();
        }
      },

      disableAllNotifications (success, error) {
        if (BlockchainSettingsAPI.shouldFail) {
          return error();
        } else {
          return success();
        }
      }

    };

    BIP39 = {
      generateMnemonic (str, rng, wlist) {
        let mnemonic = 'bicycle balcony prefer kid flower pole goose crouch century lady worry flavor';
        let seed = rng(32);
        return seed === 'random' ? mnemonic : 'failure';
      }
    };
    RNG = {
      run (input) {
        if (RNG.shouldThrow) {
          throw new Error('Connection failed');
        }
        return 'random';
      }
    };

    let stubs = {
      './wallet': MyWallet,
      './labels': Labels,
      './external': External,
      './address.js': Address,
      './helpers': Helpers,
      './hd-wallet': HDWallet,
      './wallet-store': WalletStore,
      './blockchain-settings-api': BlockchainSettingsAPI,
      'bip39': BIP39,
      './rng.js': RNG
    };

    Wallet = proxyquire('../src/blockchain-wallet', stubs);

    spyOn(MyWallet, 'syncWallet').and.callThrough();
    spyOn(MyWallet, 'get_history').and.callThrough();
  });

  describe('Constructor', () => {
    it('should create an empty Wallet with default options', () => {
      wallet = new Wallet();
      expect(wallet.double_encryption).toBeFalsy();
      expect(wallet._totalSent).toEqual(0);
      expect(wallet._totalReceived).toEqual(0);
      expect(wallet._finalBalance).toEqual(0);
    });

    it('should transform an Object to a Wallet', () => {
      wallet = new Wallet(object);

      expect(wallet._guid).toEqual(object.guid);
      expect(wallet._sharedKey).toEqual(object.sharedKey);
      expect(wallet._double_encryption).toEqual(object.double_encryption);
      expect(wallet._dpasswordhash).toEqual(object.dpasswordhash);
      expect(wallet._pbkdf2_iterations).toEqual(object.options.pbkdf2_iterations);
      expect(wallet._logout_time).toEqual(object.options.logout_time);
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      wallet = new Wallet(object);
    });

    describe('Setter', () => {
      it('guid is read only', () => {
        expect(() => { wallet.guid = 'not allowed'; }).toThrow();
        expect(wallet.guid).not.toEqual('not allowed');
      });

      it('sharedKey is read only', () => {
        expect(() => { wallet.sharedKey = 'not allowed'; }).toThrow();
        expect(wallet.sharedKey).not.toEqual('not allowed');
      });

      it('isDoubleEncrypted is read only', () => {
        expect(() => { wallet.isDoubleEncrypted = 'not allowed'; }).toThrow();
        expect(wallet.isDoubleEncrypted).not.toEqual('not allowed');
      });

      it('dpasswordhash is read only', () => {
        expect(() => { wallet.dpasswordhash = 'not allowed'; }).toThrow();
        expect(wallet.dpasswordhash).not.toEqual('not allowed');
      });

      it('fee_per_kb should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.fee_per_kb = 'asdf'; };
        expect(wrongSet).toThrow();
      });

      it('fee_per_kb should throw expection if set to high', () => {
        let invalid = () => { wallet.fee_per_kb = 100000000; };
        expect(invalid).toThrow();
      });

      it('fee_per_kb should be set to the value sent', () => {
        let valid = () => { wallet.fee_per_kb = 10000; };
        expect(valid).not.toThrow();
        expect(wallet.fee_per_kb).toEqual(10000);
      });

      it('pbkdf2_iterations is read only', () => {
        expect(() => { wallet.pbkdf2_iterations = 'not allowed'; }).toThrow();
        expect(wallet.pbkdf2_iterations).not.toEqual('not allowed');
      });

      it('totalSent should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.totalSent = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('totalReceived should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.totalReceived = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('finalBalance should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.finalBalance = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('numberTxTotal should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.numberTxTotal = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('addresses is read only', () => {
        expect(() => { wallet.addresses = 'not allowed'; }).toThrow();
        expect(wallet.addresses).not.toEqual('not allowed');
      });

      it('activeAddresses is read only', () => {
        expect(() => { wallet.activeAddresses = 'not allowed'; }).toThrow();
        expect(wallet.activeAddresses).not.toEqual('not allowed');
      });

      it('key is read only', () => {
        expect(() => { wallet.key = 'not allowed'; }).toThrow();
        expect(wallet.key).not.toEqual('not allowed');
      });

      it('activeKey is read only', () => {
        expect(() => { wallet.activeKey = 'not allowed'; }).toThrow();
        expect(wallet.activeKey).not.toEqual('not allowed');
      });

      it('keys is read only', () => {
        expect(() => { wallet.keys = 'not allowed'; }).toThrow();
        expect(wallet.keys).not.toEqual('not allowed');
      });

      it('activeKeys is read only', () => {
        expect(() => { wallet.activeKeys = 'not allowed'; }).toThrow();
        expect(wallet.activeKeys).not.toEqual('not allowed');
      });

      it('hdwallet is read only', () => {
        expect(() => { wallet.hdwallet = 'not allowed'; }).toThrow();
        expect(wallet.hdwallet).not.toEqual('not allowed');
      });

      it('isUpgradedToHD is read only', () => {
        expect(() => { wallet.isUpgradedToHD = 'not allowed'; }).toThrow();
        expect(wallet.isUpgradedToHD).not.toEqual('not allowed');
      });

      it('balanceActiveLegacy is read only', () => {
        expect(() => { wallet.balanceActiveLegacy = 'not allowed'; }).toThrow();
        expect(wallet.balanceActiveLegacy).not.toEqual('not allowed');
      });

      it('addressBook is read only', () => {
        expect(() => { wallet.addressBook = 'not allowed'; }).toThrow();
        expect(wallet.addressBook).not.toEqual('not allowed');
      });

      it('logoutTime should throw exception if is non-number set', () => {
        let wrongSet = () => { wallet.logoutTime = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('logoutTime should throw exception if is out of range set', () => {
        let wrongSet = () => { wallet.logoutTime = 59000; };
        expect(wrongSet).toThrow();
      });

      it('logoutTime should throw exception if is out of range set', () => {
        let wrongSet = () => { wallet.logoutTime = 86400002; };
        expect(wrongSet).toThrow();
      });

      it('logoutTime should be set and sync', () => {
        wallet.logoutTime = 100000;
        expect(wallet.logoutTime).toEqual(100000);
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });
    });

    describe('Getter', () => {
      it('guid', () => expect(wallet.guid).toEqual(object.guid));

      it('sharedKey', () => expect(wallet.sharedKey).toEqual(object.sharedKey));

      it('isDoubleEncrypted', () => expect(wallet.isDoubleEncrypted).toEqual(object.double_encryption));

      it('dpasswordhash', () => expect(wallet.dpasswordhash).toEqual(object.dpasswordhash));

      it('pbkdf2_iterations', () => expect(wallet.pbkdf2_iterations).toEqual(object.options.pbkdf2_iterations));

      it('totalSent', () => {
        wallet.totalSent = 101;
        expect(wallet.totalSent).toEqual(101);
      });

      it('totalReceived', () => {
        wallet.totalReceived = 101;
        expect(wallet.totalReceived).toEqual(101);
      });

      it('finalBalance', () => {
        wallet.finalBalance = 101;
        expect(wallet.finalBalance).toEqual(101);
      });

      it('numberTxTotal', () => {
        wallet.numberTxTotal = 101;
        expect(wallet.numberTxTotal).toEqual(101);
      });

      it('addresses', () => expect(wallet.addresses).toEqual(['1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9', '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h']));

      it('activeAddresses', () => expect(wallet.activeAddresses).toEqual(['1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv', '12C5rBJ7Ev3YGBCbJPY6C8nkGhkUTNqfW9']));

      it('keys', () => {
        let ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv';
        expect(wallet.keys[0].address).toEqual(ad);
      });

      it('key', () => {
        let ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv';
        expect(wallet.key(ad).address).toEqual(ad);
      });

      it('activeKeys', () => expect(wallet.activeKeys.length).toEqual(2));

      it('activeKey', () => {
        let ad = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv';
        expect(wallet.activeKey(ad).address).toEqual(ad);

        let archived = '1H8Cwvr3Vq9rJBGEoudG1AeyeAezr38j8h';
        expect(wallet.activeKey(archived)).toEqual(null);
      });

      it('hdwallet', () => expect(wallet.hdwallet).toBeDefined());

      it('isUpgradedToHD', () => expect(wallet.isUpgradedToHD).toBeTruthy());

      it('balanceActiveLegacy with active', () => {
        wallet.keys[0].balance = 101;
        expect(wallet.balanceActiveLegacy).toEqual(101);
      });

      it('balanceActiveLegacy without active', () => {
        wallet.keys[0].balance = 101;
        wallet.keys[0]._tag = 2;
        expect(wallet.balanceActiveLegacy).toEqual(0);
      });

      it('defaultPbkdf2Iterations', () => expect(wallet.defaultPbkdf2Iterations).toEqual(5000));

      it('spendableActiveAddresses', () => expect(wallet.spendableActiveAddresses.length).toEqual(1));
    });

    xdescribe('loadMetadata', () => {
      it('should set labels', (done) => {
        let checks = () => {
          expect(wallet.labels).toEqual({mock: 'labels'});
        };
        wallet.loadMetadata().then(checks).then(done);
      });

      it('should set external', (done) => {
        let checks = () => {
          expect(wallet.external).toEqual({mock: 'external'});
        };
        wallet.loadMetadata().then(checks).then(done);
      });
    });

    describe('Method', () => {
      it('.containsLegacyAddress should find address', () => {
        let adr = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCv';
        expect(wallet.containsLegacyAddress(adr)).toBeTruthy();
      });

      it('.containsLegacyAddress should find key', () => {
        let key = wallet.keys[0];
        expect(wallet.containsLegacyAddress(key)).toBeTruthy();
      });

      it('.containsLegacyAddress should not find address or key', () => {
        let adr = '1ASqDXsKYqcx7dkKZ74bKBBggpd5HDtjCXXX';
        let find1 = wallet.containsLegacyAddress(adr);
        expect(find1).toBeFalsy();
      });

      it('.importLegacyAddress', () => pending());

      describe('.new', () => {
        var cb;

        beforeEach(() => {
          cb = {
            success () { },
            error () { }
          };
          spyOn(cb, 'success');
          spyOn(cb, 'error');
        });

        it('should successCallback', () => {
          Wallet.new('GUID', 'SHARED-KEY', 'lawn couch clay slab oxygen vicious denial couple ski alley spawn wisdom', undefined, 'ACC-LABEL', cb.success, cb.error);
          expect(cb.success).toHaveBeenCalled();
        });

        describe('(error control)', () =>

          it('should errorCallback if HD seed generation fail', () => {
            HDWallet.shouldThrow = true;
            Wallet.new('GUID', 'SHARED-KEY', 'ACC-LABEL', undefined, undefined, cb.success, cb.error);
            expect(cb.error).toHaveBeenCalled();
          })
        );
      });

      describe('.newLegacyAddress', () => {
        let callbacks = {
          success () {},
          error () {}
        };

        beforeEach(() => {
          spyOn(callbacks, 'success');
          spyOn(callbacks, 'error');
        });

        describe('without second password', () => {
          it('should add the address and sync', () => {
            wallet.newLegacyAddress('label');
            let newAdd = wallet.keys[wallet.keys.length - 1];
            expect(newAdd).toBeDefined();
            expect(MyWallet.syncWallet).toHaveBeenCalled();
          });

          it('should successCallback', () => {
            wallet.newLegacyAddress('label', null, callbacks.success, callbacks.error);
            expect(callbacks.success).toHaveBeenCalled();
          });

          it('should errorCallback if Address.new throws', () => {
            // E.g. when there is a network error RNG throws,
            // which in turn causes Address.new to throw.
            Address.shouldThrow = true;
            wallet.newLegacyAddress('label', null, callbacks.success, callbacks.error);
            expect(callbacks.error).toHaveBeenCalled();
          });
        });

        describe('with second password', () => {
          beforeEach(() => {
            wallet._double_encryption = true;
          });

          it('should require the 2nd pwd', () => expect(() => wallet.newLegacyAddress('label')).toThrow());

          it('should call encrypt', () => {
            wallet.newLegacyAddress('label', '1234');
            let newAdd = wallet.keys[wallet.keys.length - 1];
            expect(newAdd.encrypt).toHaveBeenCalled();
          });

          it('should add the address and sync', () => {
            wallet.newLegacyAddress('label', '1234');
            let newAdd = wallet.keys[wallet.keys.length - 1];
            expect(newAdd).toBeDefined();
            expect(MyWallet.syncWallet).toHaveBeenCalled();
          });
        });
      });

      it('.validateSecondPassword', () => {
        wallet.encrypt('batteryhorsestaple');
        expect(wallet.isDoubleEncrypted).toBeTruthy();
        expect(wallet.validateSecondPassword('batteryhorsestaple')).toBeTruthy();
      });

      describe('.encrypt', () => {
        let cb = {
          success () {},
          error () {},
          encrypting () {},
          syncing () {}
        };

        beforeEach(() => {
          spyOn(cb, 'success');
          spyOn(cb, 'error');
          spyOn(cb, 'encrypting');
          spyOn(cb, 'syncing');
        });

        it('should encrypt a non encrypted wallet', () => {
          wallet.encrypt('batteryhorsestaple', cb.success, cb.error, cb.encrypting, cb.syncing);
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          expect(cb.success).toHaveBeenCalled();
          expect(cb.syncing).toHaveBeenCalled();
          expect(cb.encrypting).toHaveBeenCalled();
          expect(cb.error).not.toHaveBeenCalled();
        });

        it('should not encrypt an already encrypted wallet', () => {
          wallet.encrypt('batteryhorsestaple');
          wallet.encrypt('batteryhorsestaple', cb.success, cb.error, cb.encrypting, cb.syncing);
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          expect(cb.success).not.toHaveBeenCalled();
          expect(cb.syncing).not.toHaveBeenCalled();
          expect(cb.encrypting).toHaveBeenCalled();
          expect(cb.error).not.toHaveBeenCalled();
        });
      });

      describe('.decrypt', () => {
        let cb = {
          success () {},
          error () {},
          decrypting () {},
          syncing () {}
        };

        beforeEach(() => {
          spyOn(cb, 'success');
          spyOn(cb, 'error');
          spyOn(cb, 'decrypting');
          spyOn(cb, 'syncing');
        });

        it('should decrypt an encrypted wallet', () => {
          wallet.encrypt('batteryhorsestaple');
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          wallet.decrypt('batteryhorsestaple', cb.success, cb.error, cb.decrypting, cb.syncing);
          expect(cb.success).toHaveBeenCalled();
          expect(cb.syncing).toHaveBeenCalled();
          expect(cb.decrypting).toHaveBeenCalled();
          expect(cb.error).not.toHaveBeenCalled();
          expect(wallet.isDoubleEncrypted).toBeFalsy();
          expect(MyWallet.syncWallet).toHaveBeenCalled();
        });

        it('should not decrypt an already decrypted wallet', () => {
          expect(wallet.isDoubleEncrypted).toBeFalsy();
          wallet.decrypt('batteryhorsestaple', cb.success, cb.error, cb.decrypting, cb.syncing);
          expect(cb.success).not.toHaveBeenCalled();
          expect(cb.syncing).not.toHaveBeenCalled();
          expect(cb.decrypting).toHaveBeenCalled();
          expect(cb.error).not.toHaveBeenCalled();
        });
      });

      it('.restoreHDWallet', () => pending());

      describe('.upgradeToV3', () => {
        let cb = {
          success () {},
          error () {}
        };

        beforeEach(() => {
          spyOn(cb, 'success');
          spyOn(cb, 'error');
          spyOn(wallet, 'newAccount').and.callFake(() => {});
          spyOn(BIP39, 'generateMnemonic').and.callThrough();
          spyOn(RNG, 'run').and.callThrough();
          spyOn(wallet, 'loadMetadata').and.callFake(() => {});
        });

        it('should successCallback', () => {
          wallet.upgradeToV3('ACC-LABEL', null, cb.success, cb.error);
          expect(cb.success).toHaveBeenCalled();
        });

        it('should call BIP39.generateMnemonic with our RNG', () => {
          wallet.upgradeToV3('ACC-LABEL', null, cb.success, cb.error);
          expect(BIP39.generateMnemonic).toHaveBeenCalled();
          expect(RNG.run).toHaveBeenCalled();
        });

        it('should call loadMetadata', () => {
          wallet.upgradeToV3('ACC-LABEL', null, cb.success, cb.error);
          expect(wallet.loadMetadata).toHaveBeenCalled();
        });

        it('should throw if RNG throws', () => {
          // E.g. because there was a network failure.
          // This assumes BIP39.generateMnemonic does not rescue a throw
          // inside the RNG
          RNG.shouldThrow = true;
          wallet.upgradeToV3('ACC-LABEL', null, cb.success, cb.error);
          expect(cb.error).toHaveBeenCalledWith(Error('Connection failed'));
        });
      });

      describe('.newAccount', () => {
        let cb =
          {success () {}};

        beforeEach(() => spyOn(cb, 'success'));

        it("should do nothing for a wallet that hasn't been upgraded", () => {
          wallet = new Wallet();
          expect(wallet.newAccount('Coffee fund')).toBeFalsy();
        });

        it('should use the first hdwallet if no index is provided', () => {
          expect(wallet.newAccount('Coffee fund')).toEqual(wallet._hd_wallets[0].lastAccount);
          expect(MyWallet.syncWallet).toHaveBeenCalled();
        });

        it('should call the success callback if provided', () => {
          wallet.newAccount('Coffee fund', undefined, 0, cb.success);
          expect(cb.success).toHaveBeenCalled();
          expect(MyWallet.syncWallet).toHaveBeenCalled();
        });

        xit('should not call syncWallet if nosave is set to true', () => {
          wallet.newAccount('Coffee fund', undefined, 0, cb.success, true);
          expect(MyWallet.syncWallet).not.toHaveBeenCalled();
        });

        it('should work with encrypted wallets', () => {
          wallet.encrypt('batteryhorsestaple');
          wallet.newAccount('Coffee fund', 'batteryhorsestaple', 0, cb.success);
          expect(cb.success).toHaveBeenCalled();
          expect(MyWallet.syncWallet).toHaveBeenCalled();
        });
      });

      describe('addressbook label', () =>

        it('should be set, persisted and deleted', () => {
          expect(wallet.getAddressBookLabel('1hash')).toEqual(undefined);

          wallet.addAddressBookEntry('1hash', 'Rent payment');
          expect(MyWallet.syncWallet).toHaveBeenCalled();

          expect(wallet.getAddressBookLabel('1hash')).toEqual('Rent payment');

          wallet.removeAddressBookEntry('1hash');
          expect(MyWallet.syncWallet).toHaveBeenCalled();

          expect(wallet.getAddressBookLabel('hash')).toEqual(undefined);
        })
      );

      describe('notes', () => {
        it('should be set, persisted and deleted', () => {
          expect(wallet.getNote('hash')).toEqual(undefined);

          wallet.setNote('hash', 'Rent payment');
          expect(MyWallet.syncWallet).toHaveBeenCalled();

          expect(wallet.getNote('hash')).toEqual('Rent payment');

          wallet.deleteNote('hash');
          expect(MyWallet.syncWallet).toHaveBeenCalled();

          expect(wallet.getNote('hash')).toEqual(undefined);
        });
      });

      describe('.getMnemonic', () => {
        it('should return the mnemonic if the wallet is not encrypted', () => expect(wallet.getMnemonic()).toEqual('fuel cloth used increase solution dutch void tourist shadow sound soldier chalk'));

        it('should fail to return the mnemonic if the wallet is encrypted and the provided password is wrong', () => {
          wallet.encrypt('test');
          expect(() => wallet.getMnemonic('nottest')).toThrow();
        });

        it('should return the mnemonic if the wallet is encrypted', () => {
          wallet.encrypt('test');
          expect(wallet.getMnemonic('test')).toEqual('fuel cloth used increase solution dutch void tourist shadow sound soldier chalk');
        });
      });

      describe('.changePbkdf2Iterations', () => {
        it('should be change the number of iterations when called correctly', () => {
          wallet.changePbkdf2Iterations(10000, null);
          expect(MyWallet.syncWallet).toHaveBeenCalled();
          expect(wallet.pbkdf2_iterations).toEqual(10000);
        });

        xit('should do nothing when called with the number of iterations it already has', () => {
          wallet.changePbkdf2Iterations(5000, null);
          expect(MyWallet.syncWallet).not.toHaveBeenCalled();
        });

        it('should work with a double encrypted wallet', () => {
          wallet.encrypt('batteryhorsestaple');
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          wallet.changePbkdf2Iterations(10000, 'batteryhorsestaple');
          expect(MyWallet.syncWallet).toHaveBeenCalled();
          wallet.decrypt('batteryhorsestaple');
          expect(wallet.pbkdf2_iterations).toEqual(10000);
        });
      });

      describe('.getPrivateKeyForAddress', () => {
        it('should work for non double encrypted wallets', () => {
          expect(wallet.isDoubleEncrypted).toBeFalsy();
          expect(wallet.getPrivateKeyForAddress(wallet.keys[0])).toEqual('HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH');
        });

        it('should work for double encrypted wallets', () => {
          wallet.encrypt('batteryhorsestaple');
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          expect(wallet.getPrivateKeyForAddress(wallet.keys[0], 'batteryhorsestaple')).toEqual('HUFhy1SvLBzzdAYpwD3quUN9kxqmm9U3Y1ZDdwBhHjPH');
        });

        it('should return null for watch-only addresses in non double encrypted wallets', () => {
          expect(wallet.isDoubleEncrypted).toBeFalsy();
          expect(wallet.keys[1].isWatchOnly).toBeTruthy();
          expect(wallet.getPrivateKeyForAddress(wallet.keys[1])).toEqual(null);
        });

        it('should return null for watch-only addresses in for double encrypted wallets', () => {
          wallet.encrypt('batteryhorsestaple');
          expect(wallet.isDoubleEncrypted).toBeTruthy();
          expect(wallet.keys[1].isWatchOnly).toBeTruthy();
          expect(wallet.getPrivateKeyForAddress(wallet.keys[1], 'batteryhorsestaple')).toEqual(null);
        });
      });
    });

    describe('_updateWalletInfo()', () => {
      let multiaddr = { // eslint-disable-line no-unused-vars
        wallet: {
          total_sent: 1,
          total_received: 0,
          final_balance: 0,
          n_tx: 1
        },
        addresses: [
          {
            address: '1CzYCAAi46b8CFiybd3CcGbUykCAeqaocj',
            n_tx: 1,
            total_received: 0,
            total_sent: 1,
            final_balance: 0
          }
        ],
        txs: [
          {
            hash: '1234'
          }
        ],
        info: {
          latest_block: 300000
        }
      };
      beforeEach(() => spyOn(WalletStore, 'pushTransaction').and.callThrough());

      it('should add a new transaction', () =>
        // should watch for txlist pushtxs
        pending()
      );
        // wallet._updateWalletInfo(multiaddr)
        // expect(WalletStore.pushTransaction).toHaveBeenCalled()

      it('should not add a duplicate transaction', () => pending());
    });
        // missing mocks and probably this should be tested on txList object
        // wallet._updateWalletInfo(multiaddr)
        // wallet._updateWalletInfo(multiaddr)
        // expect(wallet.txList.fetched).toEqual(1)

    describe('JSON serialization', () =>
      it('should hold: fromJSON . toJSON = id', () => {
        wallet._labels = null;
        let json1 = JSON.stringify(wallet, null, 2);
        let rwall = JSON.parse(json1, Wallet.reviver);
        let json2 = JSON.stringify(rwall, null, 2);
        expect(json1).toEqual(json2);
      })
    );

    describe('notifications', () => {
      let cb = {
        success () {},
        error () {}
      };

      beforeEach(() => {
        spyOn(cb, 'success');
        spyOn(cb, 'error');
        spyOn(WalletStore, 'setSyncPubKeys');
        BlockchainSettingsAPI.shouldFail = false;
      });

      describe('.enableNotifications', () =>

        it('should require success and error callbacks', () => {
          expect(() => wallet.enableNotifications()).toThrow();
          expect(() => wallet.enableNotifications(cb.success)).toThrow();
          expect(() => wallet.enableNotifications(cb.success, cb.error)).not.toThrow();
        })
      );

      describe('.disableNotifications', () =>

        it('should require success and error callbacks', () => {
          expect(() => wallet.disableNotifications()).toThrow();
          expect(() => wallet.disableNotifications(cb.success)).toThrow();
          expect(() => wallet.disableNotifications(cb.success, cb.error)).not.toThrow();
        })
      );
    });
  });
});
