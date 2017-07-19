const EthWallet = require('../../src/eth/eth-wallet');

class MetadataMock {
  update () {
    return Promise.resolve(null);
  }
  fetch () {
    return Promise.resolve(null);
  }
}

class BlockchainWalletMock {
  constructor () {
    this.hdwallet = {
      seedHex: 'b90ea8ac99ff3d3368eca05d061f068cc66d42636d6558940a6d4275000c89b6d44a83b43c9798fc06f6213f424438a086ed14e3a7ce9d2841c2f06f5297da51'
    };
  }
  metadata (type) {
    return new MetadataMock();
  }
}

describe('EthWallet', () => {
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

    beforeEach(() => {
      let wallet = new BlockchainWalletMock();
      eth = EthWallet.fromBlockchainWallet(wallet);
      eth.createAccount();
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
        expect(eth.defaultAccount.label).toEqual('My Ethereum Wallet');
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
        expect(account.label).toEqual('My Ethereum Wallet 2');
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

    describe('.toJSON', () => {
      it('should serialize to json', () => {
        eth.createAccount('New');
        eth.setDefaultAccountIndex(1);
        eth.setTxNote('<hash>', 'my note');
        let json = JSON.stringify(eth.toJSON());
        expect(json).toEqual('{"default_account_idx":1,"accounts":[{"label":"My Ethereum Wallet","archived":false,"priv":"6c7a48436661d678c17dc4ef39862767c3d5cb54b3d22dd065c4b963e1e28924"},{"label":"New","archived":false,"priv":"bd94a5572e6c9aa9ca499834f080519a3def23ebab41ff9b3d8db16c467375df"}],"tx_notes":{"<hash>":"my note"}}');
      });
    });
  });
});
