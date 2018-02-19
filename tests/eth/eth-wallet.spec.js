const WalletCrypto = require('../../src/wallet-crypto');
const EthWallet = require('../../src/eth/eth-wallet');
const EthAccount = require('../../src/eth/eth-account');
const EthSocket = require('../../src/eth/eth-socket');
const BlockchainWalletMock = require('../__mocks__/blockchain-wallet.mock');

// cache constants for test performance
describe('EthWallet', () => {
  const wsUrl = 'wss://ws.blockchain.com/eth/inv';

  describe('static', () => {
    it('should be given the correct defaults', () => {
      let eth = new EthWallet('', null);
      expect(eth.defaultAccountIdx).toEqual(0);
      expect(eth.accounts).toEqual([]);
    });

    describe('.fromBlockchainWallet', () => {
      it('should initialize correctly', () => {
        let wallet = new BlockchainWalletMock();
        spyOn(wallet, 'metadata');
        EthWallet.fromBlockchainWallet(wallet);
        expect(wallet.metadata).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('instance', () => {
    let eth;
    let wallet;

    beforeEach(() => {
      wallet = new BlockchainWalletMock();
      eth = EthWallet.fromBlockchainWallet(wallet);
      eth.connect(wsUrl);
      eth.createAccount();
    });

    describe('getters', () => {
      it('should have: wei', () => {
        expect(eth.wei.toString()).toEqual('0');
      });

      it('should have: balance', () => {
        expect(eth.balance).toEqual('0');
      });

      it('should have: defaultAccountIdx', () => {
        expect(eth.defaultAccountIdx).toEqual(0);
      });

      it('should have: defaultAccount', () => {
        expect(eth.defaultAccount).toEqual(eth.accounts[eth.defaultAccountIdx]);
      });

      it('should have: accounts', () => {
        expect(eth.accounts).toEqual([jasmine.any(EthAccount)]);
      });

      it('should have: activeAccounts', () => {
        expect(eth.activeAccounts).toEqual([jasmine.any(EthAccount)]);
      });

      it('should have: latestBlock', () => {
        expect(eth.latestBlock).toEqual(null);
      });

      it('should have: defaults', () => {
        expect(eth.defaults).toEqual({ GAS_PRICE: 21, GAS_LIMIT: 21000 });
      });
    });

    describe('.getApproximateBalance()', () => {
      it('should get the balance at 8 decimals', () => {
        eth.defaultAccount.setData({ balance: '12345678900000000' });
        expect(eth.getApproximateBalance(8)).toEqual('0.01234568');
      });
    });

    describe('.getAccount', () => {
      it('should get the first account', () => {
        expect(eth.getAccount(0)).toEqual(eth.defaultAccount);
      });

      it('should fail if the account index is out of range', () => {
        let getAccount = () => eth.getAccount(1);
        expect(getAccount).toThrow();
      });
    });

    describe('.setAccountLabel', () => {
      it('should set the account label', () => {
        expect(eth.defaultAccount.label).toEqual('My Ether Wallet');
        eth.setAccountLabel(0, 'Renamed');
        expect(eth.defaultAccount.label).toEqual('Renamed');
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.setAccountLabel(0, 'Renamed');
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.archiveAccount', () => {
      beforeEach(() => {
        eth.createAccount();
      });

      it('should archive an account', () => {
        let account = eth.getAccount(1);
        eth.archiveAccount(account);
        expect(account.archived).toEqual(true);
      });

      it('should prevent archiving the default account', () => {
        let archiveAccount = () => eth.archiveAccount(eth.defaultAccount);
        expect(archiveAccount).toThrow();
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.archiveAccount(eth.getAccount(1));
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.unarchiveAccount', () => {
      beforeEach(() => {
        eth.createAccount();
        eth.archiveAccount(eth.getAccount(1));
      });

      it('should unarchive an account', () => {
        let account = eth.getAccount(1);
        expect(account.archived).toEqual(true);
        eth.unarchiveAccount(account);
        expect(account.archived).toEqual(false);
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.unarchiveAccount(eth.getAccount(1));
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.createAccount', () => {
      it('should create a new account', () => {
        eth.createAccount();
        let account = eth.getAccount(1);
        expect(account.label).toEqual('My Ether Wallet 2');
      });

      it('should create with a custom label', () => {
        eth.createAccount('Custom');
        let account = eth.getAccount(1);
        expect(account.label).toEqual('Custom');
      });

      it('should add the account to the wallet', () => {
        eth.createAccount();
        let account = eth.getAccount(1);
        expect(account).toEqual(eth.getAccount(1));
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.createAccount();
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.getTxNote', () => {
      beforeEach(() => {
        eth.setTxNote('<hash>', 'my note');
      });

      it('should return a tx note', () => {
        expect(eth.getTxNote('<hash>')).toEqual('my note');
      });

      it('should return null if hash not found', () => {
        expect(eth.getTxNote('unknown')).toEqual(null);
      });
    });

    describe('.setTxNote', () => {
      it('should set a tx note', () => {
        eth.setTxNote('<hash>', 'my note');
        expect(eth.getTxNote('<hash>')).toEqual('my note');
      });

      it('should fail if the note is not a string', () => {
        let setTxNote = () => eth.setTxNote('<hash>', 7);
        expect(setTxNote).toThrow();
      });

      it('should fail if the note is undefined', () => {
        let setTxNote = () => eth.setTxNote('<hash>');
        expect(setTxNote).toThrow();
      });

      it('should remove a note when passed an empty string', () => {
        eth.setTxNote('<hash>', 'my note');
        expect(eth.getTxNote('<hash>')).toEqual('my note');
        eth.setTxNote('<hash>', '');
        expect(eth.getTxNote('<hash>')).toEqual(null);
      });

      it('should update account txs', () => {
        spyOn(eth.defaultAccount, 'updateTxs');
        eth.setTxNote('<hash>', 'my note');
        expect(eth.defaultAccount.updateTxs).toHaveBeenCalledWith(eth);
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.setTxNote('<hash>', 'my note');
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.setDefaultAccountIndex', () => {
      beforeEach(() => {
        eth.createAccount();
      });

      it('should set the default index', () => {
        eth.setDefaultAccountIndex(1);
        expect(eth.defaultAccountIdx).toEqual(1);
      });

      it('should fail to set to a negative index', () => {
        let setIdx = () => eth.setDefaultAccountIndex(-1);
        expect(setIdx).toThrow();
      });

      it('should fail to set to an out of bounds index', () => {
        let setIdx = () => eth.setDefaultAccountIndex(2);
        expect(setIdx).toThrow();
      });

      it('should not sync if the index did not change', () => {
        spyOn(eth, 'sync');
        eth.setDefaultAccountIndex(eth.defaultAccountIdx);
        expect(eth.sync).not.toHaveBeenCalled();
      });

      it('should sync after', () => {
        spyOn(eth, 'sync');
        eth.setDefaultAccountIndex(1);
        expect(eth.sync).toHaveBeenCalled();
      });
    });

    describe('.setLatestBlock', () => {
      it('should set the latest block', () => {
        eth.setLatestBlock(123);
        expect(eth.latestBlock).toEqual(123);
      });

      it('should tell the wallet eth accounts to update txs', () => {
        spyOn(eth, 'updateTxs');
        eth.setLatestBlock(123);
        expect(eth.updateTxs).toHaveBeenCalled();
      });
    });

    describe('.connect', () => {
      beforeEach(() => {
        delete eth._socket;
      });

      it('should connect the initialize the socket', () => {
        eth.connect(wsUrl);
        expect(eth._socket).toBeDefined();
        expect(eth._socket.constructor).toEqual(EthSocket);
      });

      it('should only create the socket once', () => {
        eth.connect(wsUrl);
        let s = eth._socket;
        eth.connect(wsUrl);
        expect(eth._socket).toEqual(s);
      });

      it('should start listening for new blocks', () => {
        spyOn(EthSocket, 'blockMessageHandler').and.callThrough();
        eth.connect(wsUrl);
        eth._socket.emit('open');
        expect(EthSocket.blockMessageHandler).toHaveBeenCalledWith(eth);
      });
    });

    describe('.updateTxs', () => {
      it('should tell the eth accounts to update txs', () => {
        spyOn(eth.defaultAccount, 'updateTxs');
        eth.updateTxs();
        expect(eth.defaultAccount.updateTxs).toHaveBeenCalledWith(eth);
      });
    });

    describe('.getPrivateKeyForAccount', () => {
      const correctKey = '19ee4f0ce2f780022b4bb14f489e5c9feb281d24d26a68d576851437b941a596';

      it('should get the correct private key', () => {
        let priv = eth.getPrivateKeyForAccount(eth.defaultAccount);
        expect(priv.toString('hex')).toEqual(correctKey);
      });

      it('should get the correct private key when encrypted', () => {
        wallet.isDoubleEncrypted = true;
        let priv = eth.getPrivateKeyForAccount(eth.defaultAccount, 'correct');
        expect(priv.toString('hex')).toEqual(correctKey);
      });

      it('should fail when encrypted and passed the wrong secpass', () => {
        wallet.isDoubleEncrypted = true;
        let get = () => eth.getPrivateKeyForAccount(eth.defaultAccount, 'wrong');
        expect(get).toThrow();
      });
    });

    describe('.getPrivateKeyForLegacyAccount', () => {
      const legacyKey = '5f72fb06a622711c6480e4fea91993eed4bb7b5834da35033a0400261528185e';

      beforeEach(() => {
        let addr = EthAccount.privateKeyToAddress('0x' + legacyKey);
        eth._legacyAccount = new EthAccount({ addr });
      });

      it('should get the correct private key', () => {
        let priv = eth.getPrivateKeyForLegacyAccount();
        expect(priv.toString('hex')).toEqual(legacyKey);
      });

      it('should get the correct private key when encrypted', () => {
        wallet.isDoubleEncrypted = true;
        let priv = eth.getPrivateKeyForLegacyAccount('correct');
        expect(priv.toString('hex')).toEqual(legacyKey);
      });

      it('should fail when encrypted and passed the wrong secpass', () => {
        wallet.isDoubleEncrypted = true;
        let get = () => eth.getPrivateKeyForLegacyAccount('wrong');
        expect(get).toThrow();
      });
    });

    describe('.deriveChild', () => {
      it('should fail if wallet is encrypted and pw is missing', () => {
        wallet.isDoubleEncrypted = true;
        let derive = () => eth.deriveChild(0);
        expect(derive).toThrow();
      });
    });

    describe('.fromMew', () => {
      let valid = '{"version":3,"id":"cb22a4b1-31cc-4c67-9982-588102d7b5d8","address":"5d6987a4992f02d014abc98603c19337fb88390c","crypto":{"ciphertext":"3d8131e34f5a613ed00ef4e4b8ebc4e46ddc04b45b31af97141e7cbd74ff7b1c","cipherparams":{"iv":"9b48c1d947065c4e755512294bef381b"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"581e0240a516b7df92d6bf171fbe43a9a5849a29126743b9cf0c65f2d35afd66","n":8192,"r":8,"p":1},"mac":"dd9dc3cfc79d462a36a096e6d46960f47aa7c491cfd3f940678fb76d7a6aec0e"}}';

      it('should check if json is an object', () => {
        let fromMew = () => eth.fromMew('version: 3, kdf: scrypt');
        expect(fromMew).toThrow(new Error('Not a supported file type'));
      });
      it('should check the wallet version', () => {
        let fromMew = () => eth.fromMew({version: 2});
        expect(fromMew).toThrow(new Error('Not a supported wallet. Please use a valid wallet version.'));
      });
      it('should check key derivation scheme', () => {
        let fromMew = () => eth.fromMew({ version: 3, crypto: {'ciphertext': '3d8131e34f5a613ed00ef4e4b8ebc4e46ddc04b45b31af97141e7cbd74ff7b1c', 'cipherparams': {'iv': '9b48c1d947065c4e755512294bef381b'}, 'cipher': 'aes-128-ctr', 'kdf': 'bcrypt', 'kdfparams': {'dklen': 32, 'salt': '581e0240a516b7df92d6bf171fbe43a9a5849a29126743b9cf0c65f2d35afd66', 'n': 8192, 'r': 8, 'p': 1}, 'mac': 'dd9dc3cfc79d462a36a096e6d46960f47aa7c491cfd3f940678fb76d7a6aec0e'}, address: '5d6987a4992f02d014abc98603c19337fb88390c', id: '123' });
        expect(fromMew).toThrow(new Error('Unsupported key derivation scheme'));
      });
      it('should check object keys', () => {
        let fromMew = () => eth.fromMew({ version: 3, crypto: {}, address: '5d6987a4992f02d014abc98603c19337fb88390c', 'ids': '123' });
        expect(fromMew).toThrow(new Error('File is malformatted'));
      });
      it('should call WalletCrypto.scrypt if kdf type is scrypt', () => {
        spyOn(WalletCrypto, 'scrypt');
        let fromMew = () => eth.fromMew(JSON.parse(valid), 'password123', () => {});
        fromMew();
        expect(WalletCrypto.scrypt).toHaveBeenCalled();
      });
    });

    describe('.toJSON', () => {
      it('should serialize to json', () => {
        eth.createAccount('New');
        eth.setDefaultAccountIndex(1);
        eth.setTxNote('<hash>', 'my note');
        let json = JSON.stringify(eth.toJSON());
        expect(json).toEqual('{"has_seen":false,"default_account_idx":1,"accounts":[{"label":"My Ether Wallet","archived":false,"correct":true,"addr":"0x5532f8B7d3f80b9a0892a6f5F665a77358544acD"},{"label":"New","archived":false,"correct":true,"addr":"0x91C29C839c8d2B01f249e64DAB3B70DDdE896277"}],"tx_notes":{"<hash>":"my note"},"last_tx":null,"last_tx_timestamp":null}');
      });
    });
  });
});
