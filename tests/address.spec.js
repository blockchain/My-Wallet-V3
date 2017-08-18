let Bitcoin = require('bitcoinjs-lib');
let exchangeMock = require('./__mocks__/bitcoin-exchange-client.mock');

let proxyquire = require('proxyquireify')(require);

let MyWallet = {
  wallet: {
    sharedKey: 'shared_key',
    pbkdf2_iterations: 5000,
    getHistory: function () {},
    syncWallet: function () {}
  }
};

Bitcoin = {
  ECPair: {
    makeRandom: function (options) {
      let pk;
      pk = options.rng(32);
      return {
        getAddress: function () {
          return 'random_address';
        },
        pub: {},
        d: {
          toBuffer: function () {
            return pk;
          }
        }
      };
    },
    fromWIF: function (wif) {
      return {
        getAddress: function () {
          return `pub_key_for_${wif}`;
        },
        d: {
          toBuffer: function () {
            return `${wif}_private_key_buffer`;
          }
        }
      };
    }
  },
  message: {
    sign: function (keyPair, message) {
      return `${message}_signed`;
    }
  }
};

let Base58 = {
  encode: function (v) {
    return v;
  }
};

let API = {
  getBalances: function (l) {
    let ad1;
    let ad2;
    let o;
    ad1 = l[0];
    ad2 = l[1];
    o = {};
    if (ad1 === 'mini_2') {
      o[ad1] = {
        final_balance: 0
      };
      o[ad2] = {
        final_balance: 10
      };
    } else {
      o[ad1] = {
        final_balance: 10
      };
      o[ad2] = {
        final_balance: 0
      };
    }
    return Promise.resolve(o);
  }
};

let Helpers = {
  isBitcoinAddress: function () {
    return false;
  },
  isKey: function () {
    return true;
  },
  isBitcoinPrivateKey: function () {
    return false;
  },
  privateKeyStringToKey: function (priv, format) {
    return {
      priv,
      getAddress: function () {
        return '1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN';
      }
    };
  }
};

let RNG = {
  run: function (input) {
    if (RNG.shouldThrow) {
      throw new Error('Connection failed');
    }
    return '1111111111111111111111111111111H';
  }
};

let ImportExport = {
  parseBIP38toECPair: function (b58, pass, succ, wrong, error) {
    if (pass === 'correct') {
      return succ('5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU');
    } else if (pass === 'wrong') {
      return wrong();
    } else if (pass === 'fail') {
      return error();
    }
  }
};

let WalletCrypto = {
  decryptSecretWithSecondPassword: function (data, pw) {
    return `${data}_decrypted_with_${pw}`;
  }
};

let stubs = {
  'bitcoin-exchange-client': exchangeMock,
  './wallet': MyWallet,
  './rng.js': RNG,
  './api': API,
  './import-export': ImportExport,
  './wallet-crypto': WalletCrypto,
  './helpers': Helpers,
  'bitcoinjs-lib': Bitcoin,
  'bs58': Base58
};

let Address = proxyquire('../src/address', stubs);

describe('Address', () => {
  let object = {
    'addr': '1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN',
    'priv': 'GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF',
    'label': 'my label',
    'tag': 0,
    'created_time': 0,
    'created_device_name': 'javascript-web',
    'created_device_version': '1.0'
  };

  beforeEach(() => {
    spyOn(MyWallet, 'syncWallet');
    spyOn(MyWallet.wallet, 'getHistory');
  });

  describe('class', () => {
    describe('new Address()', () => {
      it('should create an empty Address with default options', () => {
        let a = new Address();
        expect(a.balance).toEqual(null);
        expect(a.archived).not.toBeTruthy();
        expect(a.active).toBeTruthy();
        expect(a.isWatchOnly).toBeTruthy();
      });

      it('should transform an Object to an Address', () => {
        let a = new Address(object);
        expect(a.address).toEqual(object.addr);
        expect(a.priv).toEqual(object.priv);
        expect(a.label).toEqual(object.label);
        expect(a.created_time).toEqual(object.created_time);
        expect(a.created_device_name).toEqual(object.created_device_name);
        expect(a.created_device_version).toEqual(object.created_device_version);
        expect(a.active).toBeTruthy();
        expect(a.archived).not.toBeTruthy();
        expect(a.isWatchOnly).not.toBeTruthy();
      });
    });

    describe('Address.new()', () => {
      beforeEach(() => {
        spyOn(Bitcoin.ECPair, 'makeRandom').and.callThrough();
        spyOn(RNG, 'run').and.callThrough();
        Helpers.isBitcoinAddress = () => false;
        Helpers.isKey = () => true;
        Helpers.isBitcoinPrivateKey = () => false;
      });

      it('should return an address', () => {
        let a = Address['new']('My New Address');
        expect(a.label).toEqual('My New Address');
      });

      it('should generate a random private key', () => {
        let a = Address['new']('My New Address');
        expect(a.priv).toBe('1111111111111111111111111111111H');
      });

      it('should generate a random address', () => {
        let a = Address['new']('My New Address');
        expect(a.address).toBe('random_address');
      });

      it('should call Bitcoin.ECPair.makeRandom with our RNG', () => {
        Address.new('My New Address');
        expect(Bitcoin.ECPair.makeRandom).toHaveBeenCalled();
        expect(RNG.run).toHaveBeenCalled();
      });

      it('should throw if RNG throws', () => {
        RNG.shouldThrow = true;
        expect(() => Address['new']('My New Address')).toThrow(Error('Connection failed'));
      });
    });
  });

  describe('instance', () => {
    let a;

    beforeEach(() => {
      a = new Address(object);
    });

    describe('Setter', () => {
      it('archived should archive the address and sync wallet', () => {
        a.archived = true;
        expect(a.archived).toBeTruthy();
        expect(a.active).not.toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('archived should unArchive the address and sync wallet', () => {
        a.archived = false;
        expect(a.archived).not.toBeTruthy();
        expect(a.active).toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        expect(MyWallet.wallet.getHistory).toHaveBeenCalled();
      });

      it('archived should throw exception if is non-boolean set', () => {
        let wrongSet;
        wrongSet = () => { a.archived = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('balance should be set and not sync wallet', () => {
        a.balance = 100;
        expect(a.balance).toEqual(100);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('balance should throw exception if is non-Number set', () => {
        let wrongSet;
        wrongSet = () => { a.balance = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('label should be set and sync wallet', () => {
        a.label = 'my label';
        expect(a.label).toEqual('my label');
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('label should be alphanumerical', () => {
        let invalid = () => { a.label = 1; };
        expect(invalid).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('label should be undefined if set to empty string', () => {
        a.label = '';
        expect(a.label).toEqual(void 0);
      });

      it('totalSent must be a number', () => {
        let invalid = () => { a.totalSent = '1'; };
        let valid = () => { a.totalSent = 1; };
        expect(invalid).toThrow();
        expect(a.totalSent).toEqual(null);
        expect(valid).not.toThrow();
        expect(a.totalSent).toEqual(1);
      });

      it('totalReceived must be a number', () => {
        let invalid = () => { a.totalReceived = '1'; };
        let valid = () => { a.totalReceived = 1; };
        expect(invalid).toThrow();
        expect(a.totalReceived).toEqual(null);
        expect(valid).not.toThrow();
        expect(a.totalReceived).toEqual(1);
      });

      it('active shoud toggle archived', () => {
        a.active = false;
        expect(a.archived).toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        a.active = true;
        expect(a.archived).toBeFalsy();
      });

      it('private key is read only', () => {
        expect(() => { a.priv = 'not allowed'; }).toThrow();
        expect(a.priv).toEqual('GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF');
      });

      it('address is read only', () => {
        expect(() => { a.address = 'not allowed'; }).toThrow();
        expect(a.address).toEqual('1HaxXWGa5cZBUKNLzSWWtyDyRiYLWff8FN');
      });
    });

    describe('.signMessage', () => {
      it('should sign a message', () => {
        expect(a.signMessage('message')).toEqual('message_signed');
      });

      it('should sign a message with the second password', () => {
        a._priv = 'encpriv';
        spyOn(WalletCrypto, 'decryptSecretWithSecondPassword');
        expect(a.signMessage('message', 'secpass')).toEqual('message_signed');
        expect(WalletCrypto.decryptSecretWithSecondPassword).toHaveBeenCalledWith('encpriv', 'secpass', 'shared_key', 5000);
      });

      it('should fail when not passed a bad message', () => {
        expect(a.signMessage.bind(a)).toThrow(Error('Expected message to be a string'));
      });

      it('should fail when encrypted and second pw is not provided', () => {
        a._priv = 'encpriv';
        expect(a.signMessage.bind(a, 'message')).toThrow(Error('Second password needed to decrypt key'));
      });

      it('should fail when called on a watch only address', () => {
        a._priv = null;
        expect(a.signMessage.bind(a, 'message')).toThrow(Error('Private key needed for message signing'));
      });

      it('should convert to base64', () => {
        let spy = jasmine.createSpy('toString');
        spyOn(Bitcoin.message, 'sign').and.returnValue({
          toString: spy
        });
        a.signMessage('message');
        expect(spy).toHaveBeenCalledWith('base64');
      });

      it('should try compressed format if the address does not match', () => {
        let keyPair = {
          getAddress () {
            return 'uncomp_address';
          },
          compressed: true
        };
        spyOn(Helpers, 'privateKeyStringToKey').and.returnValue(keyPair);
        a.signMessage('message');
        expect(keyPair.compressed).toEqual(false);
      });
    });

    describe('.encrypt', () => {
      it('should fail when encryption fails', () => {
        let wrongEnc = () => a.encrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = a.priv;
        a.encrypt(() => 'encrypted key');
        expect(a._temporal_priv).toEqual('encrypted key');
        expect(a.priv).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only address', () => {
        a._priv = null;
        a.encrypt(() => 'encrypted key');
        expect(a.priv).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = a.priv;
        a.encrypt(void 0);
        expect(a.priv).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.decrypt', () => {
      it('should fail when decryption fails', () => {
        let wrongEnc = () => a.decrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = a.priv;
        a.decrypt(() => 'decrypted key');
        expect(a._temporal_priv).toEqual('decrypted key');
        expect(a.priv).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only address', () => {
        a._priv = null;
        a.decrypt(() => 'decrypted key');
        expect(a.priv).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = a.priv;
        a.decrypt(void 0);
        expect(a.priv).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.persist', () => {
      it('should do nothing if temporary is empty', () => {
        let originalKey = a.priv;
        a.persist();
        expect(a.priv).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should swap and delete if we have a temporary value', () => {
        a._temporal_priv = 'encrypted key';
        let temp = a._temporal_priv;
        a.persist();
        expect(a.priv).toEqual(temp);
        expect(a._temporal_priv).not.toBeDefined();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('JSON serializer', () => {
      it('should hold: fromJSON . toJSON = id', () => {
        let json = JSON.stringify(a, null, 2);
        let b = JSON.parse(json, Address.reviver);
        expect(a).toEqual(b);
      });

      it('should hold: fromJSON . toJSON = id for watchOnly addresses', () => {
        a._priv = null;
        let json = JSON.stringify(a, null, 2);
        let b = JSON.parse(json, Address.reviver);
        expect(a).toEqual(b);
      });

      it('should not serialize non-expected fields', () => {
        a.rarefield = 'I am an intruder';
        let json = JSON.stringify(a, null, 2);
        let b = JSON.parse(json);
        expect(b.addr).toBeDefined();
        expect(b.priv).toBeDefined();
        expect(b.tag).toBeDefined();
        expect(b.label).toBeDefined();
        expect(b.created_time).toBeDefined();
        expect(b.created_device_name).toBeDefined();
        expect(b.created_device_version).toBeDefined();
        expect(b.rarefield).not.toBeDefined();
        expect(b._temporary_priv).not.toBeDefined();
      });

      it('should not deserialize non-expected fields', () => {
        let json = JSON.stringify(a, null, 2);
        let b = JSON.parse(json);
        b.rarefield = 'I am an intruder';
        let bb = new Address(b);
        expect(bb).toEqual(a);
      });
    });

    describe('.fromString', () => {
      beforeEach(() => {
        Helpers.isBitcoinAddress = candidate => {
          return candidate === 'address';
        };

        Helpers.detectPrivateKeyFormat = candidate => {
          if (candidate === 'unknown_format') {
            return null;
          }
          if (candidate === 'bip_38') {
            return 'bip38';
          }
          if (candidate.indexOf('mini_') === 0) {
            return 'mini';
          }
          return 'sipa';
        };

        let miniAddress = {
          getAddress: function () {
            return this.compressed
              ? 'mini_address'
              : 'mini_address_uncompressed';
          },
          compressed: true
        };

        let miniInvalid = {
          getAddress: function () {
            return 'mini_address';
          },
          compressed: true
        };

        let mini2 = {
          getAddress: function () {
            return this.compressed
              ? 'mini_2'
              : 'mini_2_uncompressed';
          },
          compressed: true
        };

        let validAddress = {
          getAddress: function () {
            return 'address';
          },
          compressed: true
        };

        Helpers.privateKeyStringToKey = (address, format) => {
          if (address === 'mini_address') {
            return miniAddress;
          }
          if (address === 'mini_2') {
            return mini2;
          }
          if (address === 'address') {
            return validAddress;
          }
          if (address === 'mini_invalid') {
            throw miniInvalid;
          }
        };

        spyOn(Address, 'import').and.callFake(address => {
          if (Helpers.isString(address)) {
            return {
              _addr: address
            };
          }
          if (address) {
            return {
              _addr: address.getAddress()
            };
          }
          if (!address) {
            return {
              _addr: address
            };
          }
        });
      });

      it('should not import unknown formats', done => {
        let promise = Address.fromString('unknown_format', null, null);
        expect(promise).toBeRejectedWith('unknown key format', done);
      });

      it('should not import BIP-38 format without a password', done => {
        let promise = Address.fromString('bip_38', null, null, done);
        expect(promise).toBeRejectedWith('needsBip38', done);
      });

      it('should not import BIP-38 format with an empty password', done => {
        let promise = Address.fromString('bip_38', null, '', done);
        expect(promise).toBeRejectedWith('needsBip38', done);
      });

      it('should not import BIP-38 format with a bad password', done => {
        let promise = Address.fromString('bip_38', null, 'wrong', done);
        expect(promise).toBeRejectedWith('wrongBipPass', done);
      });

      it('should not import BIP-38 format if the decryption fails', done => {
        let promise = Address.fromString('bip_38', null, 'fail', done);
        expect(promise).toBeRejectedWith('importError', done);
      });

      it('should import BIP-38 format with a correct password', done => {
        let promise = Address.fromString('bip_38', null, 'correct', done);
        expect(promise).toBeResolved(done);
      });

      it('should import valid addresses string', done => {
        let promise = Address.fromString('address', null, null);
        let match = jasmine.objectContaining({
          _addr: 'address'
        });
        expect(promise).toBeResolvedWith(match, done);
      });

      it('should import private keys using mini format string', done => {
        let promise = Address.fromString('mini_address', null, null);
        let match = jasmine.objectContaining({
          _addr: 'mini_address'
        });
        expect(promise).toBeResolvedWith(match, done);
      });

      it('should import uncompressed private keys using mini format string', done => {
        let promise = Address.fromString('mini_2', null, null);
        let match = jasmine.objectContaining({
          _addr: 'mini_2_uncompressed'
        });
        expect(promise).toBeResolvedWith(match, done);
      });

      it('should not import private keys using an invalid mini format string', done => {
        let promise;
        promise = Address.fromString('mini_invalid', null, null);
        expect(promise).toBeRejected(done);
      });
    });

    describe('Address import', () => {
      beforeEach(() => {
        Helpers.isKey = () => false;
        Helpers.isBitcoinAddress = () => true;
      });

      it('should not import unknown formats', () => {
        Helpers.isBitcoinAddress = () => false;
        expect(() => Address['import']('abcd', null)).toThrow();
      });

      it('should not import invalid addresses', () => {
        Helpers.isBitcoinAddress = () => false;
        expect(() => Address['import']('19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd66', null)).toThrow();
      });

      it('should import WIF keys', () => {
        Helpers.isBitcoinAddress = () => false;
        Helpers.isBitcoinPrivateKey = () => true;
        let addr = Address['import']('5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU', null);
        expect(addr.address).toEqual('pub_key_for_5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU');
      });

      it('should import valid addresses', () => {
        let addr = Address['import']('19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q', null);
        expect(addr.address).toEqual('19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q');
      });
    });

    describe('Address factory', () => {
      beforeEach(() => {
        Helpers.isKey = () => false;
        Helpers.isBitcoinAddress = () => true;
      });

      it('should not touch an already existing object', () => {
        let addr = Address['import']('19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q', null);
        let fromFactory = Address.factory({}, addr);
        expect(fromFactory['19p7ktDbdJnmV4YLC7zQ37RsYczMZJmd6q']).toEqual(addr);
      });
    });

    describe('isEncrypted', () => {
      it('should be false if the address has been encrypted but not persisted', () => {
        expect(a.isEncrypted).toBeFalsy();
        a.encrypt(() => 'ZW5jcnlwdGVk');
        expect(a.isEncrypted).toBeFalsy();
      });

      it('should be true if the address has been encrypted and persisted', () => {
        expect(a.isEncrypted).toBeFalsy();
        a.encrypt(() => 'ZW5jcnlwdGVk');
        a.persist();
        expect(a.isEncrypted).toBeTruthy();
      });
    });

    describe('isUnEncrypted', () => {
      it('should be false if the address has been decrypted but not persisted', () => {
        expect(a.isUnEncrypted).toBeTruthy();
        expect(a.isEncrypted).toBeFalsy();
        a.encrypt(() => 'ZW5jcnlwdGVk');
        a.persist();
        expect(a.isUnEncrypted).toBeFalsy();
        a.decrypt(() => '5KUwyCzLyDjAvNGN4qmasFqnSimHzEYVTuHLNyME63JKfVU4wiU');
        expect(a.isUnEncrypted).toBeFalsy();
      });

      it('should be true if the address has been decrypted and persisted', () => {
        expect(a.isEncrypted).toBeFalsy();
        a.encrypt(() => 'ZW5jcnlwdGVk');
        a.persist();
        expect(a.isUnEncrypted).toBeFalsy();
        a.decrypt(() => 'GFZrKdb4tGWBWrvkjwRymnhGX8rfrWAGYadfHSJz36dF');
        expect(a.isUnEncrypted).toBeFalsy();
        a.persist();
        expect(a.isUnEncrypted).toBeTruthy();
      });
    });
  });
});
