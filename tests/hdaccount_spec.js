let proxyquire = require('proxyquireify')(require);
let MyWallet;
let HDAccount;

// TODO: use more mocks, this file takes 7 seconds to run
describe('HDAccount', () => {
  let account, object;

  let maxLabeledReceiveIndex = -1;

  beforeEach(() => {
    object = {
      'label': 'My great wallet',
      'archived': false,
      'xpriv': 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E',
      'xpub': 'xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq',
      'address_labels': [{'index': 3, 'label': 'Hello'}],
      'cache': {
        'receiveAccount': 'xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP',
        'changeAccount': 'xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m'
      }
    };

    MyWallet = {
      syncWallet () {},
      wallet: {
        getHistory () {},
        labels: {
          maxLabeledReceiveIndex: () => maxLabeledReceiveIndex
        }
      }
    };

    spyOn(MyWallet, 'syncWallet');
    spyOn(MyWallet.wallet, 'getHistory');
  });

  describe('Constructor', () => {
    describe('without arguments', () => {
      beforeEach(() => {
        let KeyRing = () => ({init () {}});
        let KeyChain = {};
        let stubs = { './wallet': MyWallet, './keyring': KeyRing, './keychain': KeyChain };
        HDAccount = proxyquire('../src/hd-account', stubs);
      });

      it('should create an empty HDAccount with default options', () => {
        account = new HDAccount();
        expect(account.balance).toEqual(null);
        expect(account.archived).not.toBeTruthy();
        expect(account.active).toBeTruthy();
        expect(account.receiveIndex).toEqual(0, 'Unexpected receive index');
        expect(account.changeIndex).toEqual(0, 'Unexpected change index');
      });

      it('should create an HDAccount from AccountMasterKey', () => {
        let accountZero = {
          toBase58 () { return 'accountZeroBase58'; },
          neutered () {
            return {
              toBase58 () { return 'accountZeroNeuteredBase58'; }
            };
          }
        };

        let a = HDAccount.fromAccountMasterKey(accountZero, 0, 'label');

        expect(a.label).toEqual('label');
        expect(a._xpriv).toEqual('accountZeroBase58');
        expect(a._xpub).toEqual('accountZeroNeuteredBase58');
      });

      it('should create an HDAccount from Wallet master key', () => {
        let masterkey = {
          deriveHardened (i) {
            return {
              deriveHardened (j) {
                return {
                  deriveHardened (k) {
                    return {
                      toBase58 () {
                        return `m/${i}/${j}/${k}`;
                      },
                      neutered () {
                        return {toBase58 () {}};
                      }
                    };
                  }
                };
              }
            };
          }
        };

        let a = HDAccount.fromWalletMasterKey(masterkey, 0, 'label');

        expect(a._xpriv).toEqual('m/44/0/0');
        expect(a.label).toEqual('label');
      });
    });

    it('should transform an Object to an HDAccount', () => {
      let stubs = { './wallet': MyWallet };
      HDAccount = proxyquire('../src/hd-account', stubs);
      account = new HDAccount(object);
      expect(account.extendedPublicKey).toEqual(object.xpub);
      expect(account.extendedPrivateKey).toEqual(object.xpriv);
      expect(account.label).toEqual(object.label);
      expect(account.archived).toEqual(object.archived);
      expect(account.receiveIndex).toEqual(0);
      expect(account.changeIndex).toEqual(0);
      expect(account.n_tx).toEqual(0);
      expect(account.balance).toEqual(null);
      expect(account.keyRing).toBeDefined();
      expect(account.receiveAddress).toBeDefined();
      expect(account.changeAddress).toBeDefined();
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      let stubs = { './wallet': MyWallet };
      HDAccount = proxyquire('../src/hd-account', stubs);
      account = new HDAccount(object);
    });

    describe('JSON serializer', () => {
      it('should hold: fromJSON . toJSON = id', () => {
        let json1 = JSON.stringify(account, null, 2);
        let racc = JSON.parse(json1, HDAccount.reviver);
        let json2 = JSON.stringify(racc, null, 2);
        expect(json1).toEqual(json2);
      });

      describe('labeled_addresses', () => {
        it('should resave original if KV store is read-only', () => {
          expect(account.toJSON()).toEqual(jasmine.objectContaining({
            address_labels: [{
              index: 3,
              label: 'Hello'
            }]
          }));
        });
      });
    });

    describe('Setter', () => {
      it('active shoud toggle archived', () => {
        account.active = false;
        expect(account.archived).toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        account.active = true;
        expect(account.archived).toBeFalsy();
      });

      it('archived should archive the account and sync wallet', () => {
        account.archived = true;
        expect(account.archived).toBeTruthy();
        expect(account.active).not.toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('archived should throw exception if is non-boolean set', () => {
        let wrongSet = () => { account.archived = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('archived should call MyWallet.sync.getHistory when set to false', () => {
        account.archived = false;
        expect(MyWallet.wallet.getHistory).toHaveBeenCalled();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('balance should be set and not sync wallet', () => {
        account.balance = 100;
        expect(account.balance).toEqual(100);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('balance should throw exception if is non-Number set', () => {
        let wrongSet = () => { account.balance = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('n_tx should be set and not sync wallet', () => {
        account.n_tx = 100;
        expect(account.n_tx).toEqual(100);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('n_tx should throw exception if is non-Number set', () => {
        let wrongSet = () => { account.n_tx = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('label should be set and sync wallet', () => {
        account.label = 'my label';
        expect(account.label).toEqual('my label');
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('label should be valid', () => {
        let test = () => { account.label = 0; };
        expect(test).toThrow();
      });

      it('xpriv is read only', () => {
        let wrongSet = () => { account.extendedPrivateKey = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('xpub is read only', () => {
        let wrongSet = () => { account.extendedPublicKey = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('receiveAddress is read only', () => {
        let wrongSet = () => { account.receiveAddress = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('changeAddress is read only', () => {
        let wrongSet = () => { account.changeAddress = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('index is read only', () => {
        let wrongSet = () => { account.index = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('KeyRing is read only', () => {
        let wrongSet = () => { account.keyRing = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('lastUsedReceiveIndex must be an integer or null', () => {
        let invalid = () => { account.lastUsedReceiveIndex = '1'; };
        let valid = () => { account.lastUsedReceiveIndex = 1; };
        expect(invalid).toThrow();
        expect(account.lastUsedReceiveIndex).toEqual(null);
        expect(valid).not.toThrow();
        expect(account.lastUsedReceiveIndex).toEqual(1);
      });

      it('receiveIndex is max(used, labeled) + 1', () => {
        account.lastUsedReceiveIndex = 2;
        expect(account.receiveIndex).toEqual(3);

        maxLabeledReceiveIndex = 3;
        expect(account.receiveIndex).toEqual(4);
      });

      it('receiveIndex falls back to legacy labels if Labels doesn\'t work', () => {
        maxLabeledReceiveIndex = 3;
        MyWallet.wallet.labels = null;
        account.lastUsedReceiveIndex = 2;
        expect(account.receiveIndex).toEqual(4);
      });

      it('changeIndex must be a number', () => {
        let invalid = () => { account.changeIndex = '1'; };
        let valid = () => { account.changeIndex = 1; };
        expect(invalid).toThrow();
        expect(account.changeIndex).toEqual(0);
        expect(valid).not.toThrow();
        expect(account.changeIndex).toEqual(1);
      });

      it('changeIndex must be a positive number', () => {
        let invalid = () => { account.changeIndex = -534.234; };
        expect(invalid).toThrow();
        expect(account.changeIndex).toEqual(0);
      });
    });

    describe('Getter', () => {
    });

    describe('Labeled addresses', () => {
      describe('getLabels()', () => {
        it('should return a copy of _address_labels', () => {
          expect(account.getLabels()).toEqual(account._address_labels);
        });
        it('should sort _address_labels by index', () => {
          account._address_labels = [{index: 1, label: 'One'}, {index: 0, label: 'Zero'}];
          expect(account.getLabels()).toEqual([{index: 0, label: 'Zero'}, {index: 1, label: 'One'}]);
        });
      });

      describe('addLabel()', () => {
        it('should push a label entry', () => {
          let before = account._address_labels.length;
          account.addLabel(2, 'New Label');
          expect(account._address_labels.length).toEqual(before + 1);
        });
      });

      describe('setLabel()', () => {
        it('should update existing label entry', () => {
          account.setLabel(3, 'Updated Label');
          expect(account._address_labels[0].label).toEqual('Updated Label');
        });

        it('should push a label entry if none exists', () => {
          let before = account._address_labels.length;
          account.setLabel(2, 'New Label');
          expect(account._address_labels.length).toEqual(before + 1);
        });
      });

      describe('removeLabel()', () => {
        it('should remove a label entry', () => {
          let before = account._address_labels.length;
          account.removeLabel(3);
          expect(account._address_labels.length).toEqual(before - 1);
        });
      });
    });

    describe('.encrypt', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should fail and don\'t sync when encryption fails', () => {
        let wrongEnc = () => account.encrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.encrypt(() => 'encrypted key');
        expect(account._temporal_xpriv).toEqual('encrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account._xpriv = null;
        account.encrypt(() => 'encrypted key');
        expect(account.extendedPrivateKey).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = account.extendedPrivateKey;
        account.encrypt(undefined);
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.decrypt', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should fail and don\'t sync when decryption fails', () => {
        let wrongEnc = () => account.decrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.decrypt(() => 'decrypted key');
        expect(account._temporal_xpriv).toEqual('decrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account._xpriv = null;
        account.decrypt(() => 'decrypted key');
        expect(account.extendedPrivateKey).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = account.extendedPrivateKey;
        account.decrypt(undefined);
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.persist', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should do nothing if temporary is empty', () => {
        let originalKey = account.extendedPrivateKey;
        account.persist();
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should swap and delete if we have a temporary value', () => {
        account._temporal_xpriv = 'encrypted key';
        let temp = account._temporal_xpriv;
        account.persist();
        expect(account.extendedPrivateKey).toEqual(temp);
        expect(account._temporal_xpriv).not.toBeDefined();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.fromExtPublicKey', () => {
      it('should import a correct key', () => {
        account = HDAccount.fromExtPublicKey('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8', 0, 'New account');
        expect(account._xpriv).toEqual(null);
        expect(account.label).toEqual('New account');
      });

      it('should not import a truncated key', () => expect(() => HDAccount.fromExtPublicKey('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGh', 0, 'New account')).toThrowError('Invalid checksum'));
    });

    describe('.fromExtPrivateKey', () => {
      it('should import a correct key', () => {
        account = HDAccount.fromExtPrivateKey('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi', undefined, 'Another new account');
        expect(account.label).toEqual('Another new account');
        expect(account._xpub).toEqual('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8');
        expect(account.isEncrypted).toBeFalsy();
        expect(account.isUnEncrypted).toBeTruthy();
        expect(account.index).toEqual(null);
      });

      it('should not import a truncated key', () => expect(() => HDAccount.fromExtPrivateKey('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6', undefined, 'Another new account')).toThrowError('Invalid checksum'));
    });

    describe('.factory', () =>
      it('should not touch already instanciated objects', () => {
        let fromFactory = HDAccount.factory(account);
        expect(account).toEqual(fromFactory);
      })
    );
  });
});
