let proxyquire = require('proxyquireify')(require);
let MyWallet;
let HDAccountV4;

// TODO: use more mocks, this file takes 7 seconds to run
describe('HDAccountV4', () => {
  let account, object;

  let maxLabeledReceiveIndex = -1;

  beforeEach(() => {
    object = {
      "label": "Private Key Wallet",
      "archived": false,
      "default_derivation": "bech32",
      "derivations": [
        {
          "type": "legacy",
          "purpose": 44,
          "xpriv": "xprv9xrdr5KSDuFjMRZsFtYo7kzBLqX5wabxLkrVZab6iLEN2fmwRFuTyBYXrz93QaxXAivmseXpaxLWX1nnTwCao93MARAGMA8kvNwRaWvmEcn",
          "xpub": "xpub6BqzFarL4Gp2ZueLMv5oUtvutsMaM3Kohyn6MxziGfmLuU75xoDiWys1iGnrQwqQT3PJRAkE2ZPyoPSLq8GVVStSi8DnCAxDKXUttnfH2Wu",
          'address_labels': [{ 'index': 3, 'label': 'Hello legacy' }],
          "cache": {
            "receiveAccount": "xpub6EvRwUVEmxMkYReJ2d1korWa9R2AriQhXeyJB55ns4G6mmF7JoBPABuSS9FLti5B3Ddk6XJ4HU2sXW5AGDYZLPVMEXLaM4pNLhZ8DFVgEnN",
            "changeAccount": "xpub6EvRwUVEmxMka4otnrSt8ssFxNWcNb5pDc479E9H1zKxwMTFz9BRxkHdiFYG4EmLafU4bzj6w713haUibQ5qF4atDYYEnLXa44CCWE6KAg3"
          }
        },
        {
          "type": "bech32",
          "purpose": 84,
          "xpriv": "xprv9zLDGVY4mCN8Sb5j21Kp3dd87muJnudZkDDV17JFGMuYicNbhtcJtbZH3ZaZCZAvFqJvVMqtiTEQrXo21UygzyXUkVRXbKcLTgLwxUMe4xz",
          "xpub": "xpub6DKZg14xbZvRf5AC82rpQmZrfojoCNMR7S95oVhrphSXbQhkFRvZSPsktqgL3j74h9MhQwCy8DKrgr24JbZA9kTYHXUmEpU8DHHhKHLnAvP",
          'address_labels': [{ 'index': 4, 'label': 'Hello bech32' }],
          "cache": {
            "receiveAccount": "xpub6EySek8QXBddHiR5aRwi1qf5G2SaRkcWK1vyGGiYxYcdfdKso99UfiuX4YW4m5Bd9D1oNyxZxDuz8yLRNadNBGjFivskxnSzpa5H25JMYRR",
            "changeAccount": "xpub6EySek8QXBddJjr1GHeTJTSakdZX4RCo2bDBdfccyNjmKAMPRRM8ZBTk3qS6x1we2CyDLCGopQFY234LvvEAKLw3AFVSfo2gvjXR2hjwNJa"
          }
        }
      ],
      "index": 0
    };

    MyWallet = {
      syncWallet() { },
      wallet: {
        getHistory() { },
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
        let KeyRing = () => ({ init() { } });
        let KeyChain = {};
        let stubs = { './wallet': MyWallet, './keyring': KeyRing, './keychain': KeyChain };
        HDAccountV4 = proxyquire('../src/hd-account-v4', stubs);
      });

      it('should create an empty HDAccountV4 with default options', () => {
        account = new HDAccountV4();
        expect(account.balance).toEqual(0);
        expect(account.archived).not.toBeTruthy();
        expect(account.active).toBeTruthy();
        expect(account.receiveIndex).toEqual(0);
        expect(account.changeIndex).toEqual(0);
      });

      it('should create an HDAccountV4 from Wallet master key', () => {
        let masterkey = {
          deriveHardened(i) {
            return {
              deriveHardened(j) {
                return {
                  deriveHardened(k) {
                    return {
                      toBase58() {
                        return `m/${i}/${j}/${k}`;
                      },
                      neutered() {
                        return { toBase58() { } };
                      }
                    };
                  }
                };
              }
            };
          }
        };

        let account = HDAccountV4.fromWalletMasterKey(masterkey, 0, 'label');

        expect(account.label).toEqual('label')
        expect(account.derivations.length).toEqual(2)
        expect(account.derivations[0].type).toEqual('legacy')
        expect(account.derivations[0]._xpriv).toEqual('m/44/0/0')
        expect(account.derivations[0]._purpose).toEqual(44)
        expect(account.derivations[1].type).toEqual('bech32')
        expect(account.derivations[1]._xpriv).toEqual('m/84/0/0')
        expect(account.derivations[1]._purpose).toEqual(84)
      });
    });

    it('should transform an Object to an HDAccountV4', () => {
      let stubs = { './wallet': MyWallet };
      HDAccountV4 = proxyquire('../src/hd-account-v4', stubs);
      account = new HDAccountV4(object);

      expect(account.label).toEqual(object.label)
      expect(account.archived).toEqual(object.archived);
      expect(account.derivations.length).toEqual(2)
      expect(account.derivations.length).toEqual(object.derivations.length)
      expect(account.derivations[0].type).toEqual(object.derivations[0].type)
      expect(account.derivations[0]._xpriv).toEqual(object.derivations[0].xpriv)
      expect(account.derivations[0]._purpose).toEqual(object.derivations[0].purpose)
      expect(account.derivations[1].type).toEqual(object.derivations[1].type)
      expect(account.derivations[1]._xpriv).toEqual(object.derivations[1].xpriv)
      expect(account.derivations[1]._purpose).toEqual(object.derivations[1].purpose)


      expect(account.extendedPublicKey).toEqual(object.derivations[1].xpub);
      expect(account.extendedPrivateKey).toEqual(object.derivations[1].xpriv);
      expect(account.receiveIndex).toEqual(5);
      expect(account.changeIndex).toEqual(0);
      expect(account.n_tx).toEqual(0);
      expect(account.balance).toEqual(0);
      expect(account.receiveAddress).toBeDefined()
      expect(account.changeAddress).toBeDefined()
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      let stubs = { './wallet': MyWallet };
      HDAccountV4 = proxyquire('../src/hd-account-v4', stubs);
      account = new HDAccountV4(object);
    });

    describe('JSON serializer', () => {
      it('should hold: fromJSON . toJSON = id', () => {
        let json1 = JSON.stringify(account, null, 2);
        let racc = JSON.parse(json1, HDAccountV4.reviver);
        let json2 = JSON.stringify(racc, null, 2);
        expect(json1).toEqual(json2);
      });

      it('toJSON() has the expected behaviour', () => {
        let json1 = JSON.stringify(account, null, 2);
        let result = JSON.parse(json1);
        expect(result).toContain(object);
      });

      describe('labeled_addresses', () => {
        it('should resave original if KV store is read-only', () => {
          let json1 = JSON.stringify(account);
          let result = JSON.parse(json1);
          expect(result.derivations).toContain(jasmine.objectContaining({
            address_labels: [{
              index: 4,
              label: 'Hello bech32'
            }]
          }))
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

      it('label should be set and sync wallet', () => {
        account.label = 'my label';
        expect(account.label).toEqual('my label');
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('label should be valid', () => {
        let test = () => { account.label = 0; };
        expect(test).toThrow();
      });

      it('balance is read only', () => {
        let wrongSet = () => { account.balance = 1; };
        expect(wrongSet).toThrow();
      });

      it('n_tx is read only', () => {
        let wrongSet = () => { account.n_tx = 1; };
        expect(wrongSet).toThrow();
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
        let wrongSet = () => { account.index = 1; };
        expect(wrongSet).toThrow();
      });

      it('lastUsedReceiveIndex is read only', () => {
        let wrongSet = () => { account.lastUsedReceiveIndex = 1; };
        expect(wrongSet).toThrow();
      });

      it('receiveIndex is read only', () => {
        let wrongSet = () => { account.receiveIndex = 1; };
        expect(wrongSet).toThrow();
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

    describe('Labeled addresses', () => {
      describe('getLabels()', () => {
        it('should return a copy of default derivation._address_labels', () => {
          expect(account.getLabels()).toEqual(account.derivations[1]._address_labels);
        });
        it('should sort _address_labels by index', () => {
          account.derivations[1]._address_labels = [{ index: 1, label: 'One' }, { index: 0, label: 'Zero' }];
          expect(account.getLabels()).toEqual([{ index: 0, label: 'Zero' }, { index: 1, label: 'One' }]);
        });
      });
    });

    describe('.encrypt', () => {
      beforeEach(() => { account = new HDAccountV4(object); });

      it('should fail and don\'t sync when encryption fails', () => {
        let wrongEnc = () => account.encrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.encrypt(() => 'encrypted key');
        expect(account.derivations[0]._temporal_xpriv).toEqual('encrypted key');
        expect(account.derivations[1]._temporal_xpriv).toEqual('encrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account.derivations[0]._xpriv = null;
        account.derivations[1]._xpriv = null;
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
      beforeEach(() => { account = new HDAccountV4(object); });

      it('should fail and don\'t sync when decryption fails', () => {
        let wrongEnc = () => account.decrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.decrypt(() => 'decrypted key');
        expect(account.derivations[0]._temporal_xpriv).toEqual('decrypted key');
        expect(account.derivations[1]._temporal_xpriv).toEqual('decrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account.derivations[0]._xpriv = '0';
        account.derivations[1]._xpriv = null;
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
      beforeEach(() => { account = new HDAccountV4(object); });

      it('should do nothing if temporary is empty', () => {
        let originalKey = account.extendedPrivateKey;
        account.persist();
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should swap and delete if we have a temporary value', () => {
        account.derivations[0]._temporal_xpriv = 'encrypted key 0';
        account.derivations[1]._temporal_xpriv = 'encrypted key 1';
        account.persist();
        expect(account.extendedPrivateKey).toEqual('encrypted key 1');
        expect(account.derivations[0]._temporal_xpriv).not.toBeDefined();
        expect(account.derivations[1]._temporal_xpriv).not.toBeDefined();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.factory', () =>
      it('should not touch already instanciated objects', () => {
        let fromFactory = HDAccountV4.factory(account);
        expect(account).toEqual(fromFactory);
      })
    );
  });
});
