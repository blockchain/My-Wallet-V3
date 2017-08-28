const BIP39 = require('bip39');
const Bitcoin = require('bitcoinjs-lib');
const EthWallet = require('../../src/eth/eth-wallet');
const EthAccount = require('../../src/eth/eth-account');
const EthSocket = require('../../src/eth/eth-socket');

class MetadataMock {
  update () {
    return Promise.resolve(null);
  }
  fetch () {
    return Promise.resolve(null);
  }
}

// cache constants for test performance
const seedHex = '17eb336a2a3bc73dd4d8bd304830fe32';
const mnemonic = BIP39.entropyToMnemonic(seedHex);
const masterhex = BIP39.mnemonicToSeed(mnemonic);
const masterHdNode = Bitcoin.HDNode.fromSeedBuffer(masterhex);

class BlockchainWalletMock {
  constructor () {
    this.hdwallet = {
      // mnemonic: 'blood flower surround federal round page fat bless core dose display govern',
      // masterSeedHex: '265c86692394fab95d0efc4385b89679d8daef5c9975e1f2b1f1eb4300bc10ad81d4d117c323591d543f6e54aa9d4560cad424bc66bb2bb61dc14285a508dad7',
      seedHex,
      getMasterHex (seedHex, cipher = x => x) {
        return cipher(masterhex);
      },
      getMasterHDNode (cipher = x => x) {
        return cipher(masterHdNode);
      }
    };
    this.isDoubleEncrypted = false;
  }
  metadata (type) {
    return new MetadataMock();
  }
  createCipher (secPass) {
    return (x) => {
      if (secPass !== 'correct') {
        throw new Error('Second password incorrect');
      }
      return x;
    };
  }
}

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
        let account = eth.createAccount();
        expect(account.label).toEqual('My Ether Wallet 2');
      });

      it('should create with a custom label', () => {
        let account = eth.createAccount('Custom');
        expect(account.label).toEqual('Custom');
      });

      it('should add the account to the wallet', () => {
        let account = eth.createAccount();
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

    describe('.toJSON', () => {
      it('should serialize to json', () => {
        eth.createAccount('New');
        eth.setDefaultAccountIndex(1);
        eth.setTxNote('<hash>', 'my note');
        let json = JSON.stringify(eth.toJSON());
        expect(json).toEqual('{"has_seen":false,"default_account_idx":1,"accounts":[{"label":"My Ether Wallet","archived":false,"addr":"0x5532f8B7d3f80b9a0892a6f5F665a77358544acD"},{"label":"New","archived":false,"addr":"0x91C29C839c8d2B01f249e64DAB3B70DDdE896277"}],"tx_notes":{"<hash>":"my note"},"last_tx":null}');
      });
    });
  });
});
