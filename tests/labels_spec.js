let proxyquire = require('proxyquireify')(require);

describe('Labels', () => {
  const latestVersion = '1.0.0';

  let mockPayload = {
    version: latestVersion,
    accounts: [[null, {label: 'Hello'}]]
  };

  let Metadata = {
    fromMasterHDNode (n, masterhdnode) {
      return {
        create () {},
        fetch () {
          return Promise.resolve(mockPayload);
        }
      };
    }
  };

  let AddressHD = () => {};

  let stubs = {
    './metadata': Metadata,
    './address-hd': AddressHD
  };

  let Labels = proxyquire('../src/labels', stubs);

  let wallet = {
    hdwallet: {
      accounts: [
        {}
      ]
    }
  };

  let l;

  describe('class', () => {
    let metadata = {};

    // Includes helper method init(), but not migrateIfNeeded()
    describe('new Labels()', () => {
      beforeEach(() => {
        spyOn(Labels.prototype, 'migrateIfNeeded').and.callFake((object) => {
          if (object && object.version === '0.1.0') {
            object.version = latestVersion;
          }
          return object;
        });
        spyOn(Labels.prototype, 'save').and.returnValue(true);
      });

      it('should transform an Object to Labels', () => {
        l = new Labels(metadata, wallet, mockPayload);
        expect(l.constructor.name).toEqual('Labels');
      });

      it('should deserialize the version', () => {
        l = new Labels(metadata, wallet, mockPayload);
        expect(l.version).toEqual(latestVersion);
      });

      it('should not deserialize non-expected fields', () => {
        mockPayload.non_expected_field = 'I am an intruder';
        l = new Labels(metadata, wallet, mockPayload);
        expect(l._non_expected_field).toBeUndefined();
      });

      it('should call save if migration changes anything', () => {
        mockPayload.version = '0.1.0';
        l = new Labels(metadata, wallet, mockPayload);
        expect(Labels.prototype.save).toHaveBeenCalled();
      });
    });

    // Includes helper function initMetadata()
    describe('fetch()', () => {
    });

    // Includes helper function initMetadata()
    describe('fromJSON()', () => {
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      let metadata = {};
      l = new Labels(metadata, wallet, mockPayload);
    });

    describe('toJSON', () => {
      beforeEach(() => {
      });

      it('should store version', () => {
        let json = JSON.stringify(l);
        expect(JSON.parse(json)).toEqual(
          jasmine.objectContaining({version: latestVersion}
        ));
      });

      it('should not serialize non-expected fields', () => {
        l.rarefield = 'I am an intruder';
        let json = JSON.stringify(l, null, 2);
        let obj = JSON.parse(json);

        expect(obj.version).toBeDefined();
        expect(obj.rarefield).not.toBeDefined();
      });
    });

    describe('readOnly', () => {
      it('should be true when _readOnly is true', () => {
        l._readOnly = true;
        expect(l.readOnly).toEqual(true);
      });

      it('should be true if KV store doesn\'t work', () => {
        l._readOnly = false;
        l._wallet.isMetadataReady = false;
        expect(l.readOnly).toEqual(true);
      });
    });

    describe('dirty', () => {
      it('should be true when _dirty is true', () => {
        l._dirty = true;
        expect(l.dirty).toEqual(true);
      });
    });

    // describe('reserveReceiveAddress()', () => {
    //   it('should return the first available address', () => {
    //     expect(delegate.reserveReceiveAddress().receiveAddress).toEqual('0-0');
    //   });
    //
    //   it('should fail if gap limit', () => {
    //     MyWallet.wallet.hdwallet.accounts[0].receiveIndex = 19;
    //     MyWallet.wallet.hdwallet.accounts[0].lastUsedReceiveIndex = 0;
    //     delegate.trades = [];
    //     expect(() => delegate.reserveReceiveAddress()).toThrow(new Error('gap_limit'));
    //   });
    //
    //   describe('.commit()', () => {
    //     let account;
    //
    //     beforeEach(() => {
    //       account = MyWallet.wallet.hdwallet.accounts[0];
    //       account.receiveIndex = 0;
    //       account.lastUsedReceiveIndex = 0;
    //       trade = { id: 1, _account_index: 0, _receive_index: 0 };
    //     });
    //
    //     it('should label the address', () => {
    //       delegate.trades = [];
    //       let reservation = delegate.reserveReceiveAddress();
    //       reservation.commit(trade);
    //       expect(account.getLabelForReceivingAddress(0)).toEqual('Exchange order #1');
    //     });
    //
    //     it('should allow custom label prefix for each exchange', () => {
    //       delegate.trades = [];
    //       delegate.labelBase = 'Coinify order';
    //       let reservation = delegate.reserveReceiveAddress();
    //       reservation.commit(trade);
    //       expect(account.getLabelForReceivingAddress(0)).toEqual('Coinify order #1');
    //     });
    //
    //     it('should append to existing label if at gap limit', () => {
    //       delegate.trades = [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }];
    //       account.receiveIndex = 19;
    //       let reservation = delegate.reserveReceiveAddress();
    //       reservation.commit(trade);
    //       expect(account.getLabelForReceivingAddress(16)).toEqual('Exchange order #0, #1');
    //     });
    //   });
    // });
    //
    // describe('releaseReceiveAddress()', () => {
    //   let account;
    //
    //   beforeEach(() => {
    //     account = MyWallet.wallet.hdwallet.accounts[0];
    //     account.receiveIndex = 1;
    //     trade = { id: 1, receiveAddress: '0-16', _account_index: 0, _receive_index: 0 };
    //   });
    //
    //   it('should remove the label', () => {
    //     account.labels[0] = 'Coinify order #1';
    //     delegate.releaseReceiveAddress(trade);
    //     expect(account.labels[0]).not.toBeDefined();
    //   });
    //
    //   it('should remove one of multible ids in a label', () => {
    //     account.labels[0] = 'Coinify order #0, 1';
    //     delegate.trades = [{ id: 0, _receive_index: 16, receiveAddress: '0-16', state: 'completed' }];
    //     delegate.releaseReceiveAddress(trade);
    //     expect(account.labels[0]).toEqual('Coinify order #0');
    //   });
    // });
  });
});
