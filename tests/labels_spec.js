let proxyquire = require('proxyquireify')(require);

describe('Labels', () => {
  const latestVersion = '1.0.0';

  const defaultInitialPayload = {
    version: latestVersion,
    accounts: [[]]
  };

  let mockPayload;

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

  let AddressHD = (obj) => {
    return {
      constructor: {
        name: 'AddressHD'
      },
      label: obj === null ? null : obj.label,
      toJSON: () => {
        if (obj && obj.label !== null) {
          return {label: obj.label};
        } else {
          return null;
        }
      }
    };
  };

  let stubs = {
    './metadata': Metadata,
    './address-hd': AddressHD
  };

  let Labels = proxyquire('../src/labels', stubs);

  let wallet;

  let l;

  beforeEach(() => {
    mockPayload = {
      version: latestVersion,
      accounts: [[null, {label: 'Hello'}]]
    };

    wallet = {
      hdwallet: {
        accounts: [{
          index: 0,
          receiveAddressAtIndex: (index) => `0-${index}`,
          receiveIndex: 2,
          lastUsedReceiveIndex: 1
        }]
      },
      isMetadataReady: true
    };
  });

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

      it('should require syncWallet function', () => {
        expect(() => {
          l = new Labels(metadata, wallet, mockPayload);
        }).toThrow();
      });

      it('should transform an Object to Labels', () => {
        l = new Labels(metadata, wallet, mockPayload, () => {});
        expect(l.constructor.name).toEqual('Labels');
      });

      it('should deserialize the version', () => {
        l = new Labels(metadata, wallet, mockPayload, () => {});
        expect(l.version).toEqual(latestVersion);
      });

      it('should not deserialize non-expected fields', () => {
        mockPayload.non_expected_field = 'I am an intruder';
        l = new Labels(metadata, wallet, mockPayload, () => {});
        expect(l._non_expected_field).toBeUndefined();
      });

      it('should call save if migration changes anything', () => {
        mockPayload.version = '0.1.0';
        l = new Labels(metadata, wallet, mockPayload, () => {});
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
    let metadata;
    beforeEach(() => {
      metadata = {
        existsOnServer: true,
        create: () => Promise.resolve(),
        update: () => Promise.resolve()
      };
      spyOn(Labels.prototype, 'migrateIfNeeded').and.callFake((object) => object);
      l = new Labels(metadata, wallet, mockPayload, () => {});
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

      it('should store labels', () => {
        let json = JSON.stringify(l);
        let res = JSON.parse(json);
        expect(res.accounts[0].length).toEqual(2);
        expect(res.accounts[0][1].label).toEqual('Hello');
      });

      it('should remove trailing null values', () => {
        l._accounts[0].push(AddressHD(null));
        let json = JSON.stringify(l);
        let res = JSON.parse(json);
        expect(res.accounts[0].length).toEqual(2);
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
      it('should be true if something changed', () => {
        expect(l.dirty).toEqual(false);
        l._accounts.push([]);
        expect(l.dirty).toEqual(true);
      });
    });

    describe('save()', () => {
      beforeEach(() => {
        spyOn(metadata, 'create').and.callThrough();
        spyOn(metadata, 'update').and.callThrough();
        l._accounts.push([]); // Create a change to mark object dirty
      });

      it('should create a new metadata entry the first time', (done) => {
        l._metadata.existsOnServer = false;
        const checks = () => {
          expect(l._metadata.create).toHaveBeenCalled();
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should update existing metadata entry', (done) => {
        const checks = () => {
          expect(l._metadata.update).toHaveBeenCalled();
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should not save if read-only', (done) => {
        l._readOnly = true;
        const checks = () => {
          expect(l._metadata.update).not.toHaveBeenCalled();
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should not save if not dirty', (done) => {
        l._accounts.pop(); // Undo change, so object is not dirty
        const checks = () => {
          expect(l._metadata.update).not.toHaveBeenCalled();
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should result in !dirty', (done) => {
        const checks = () => {
          expect(l.dirty).toEqual(false);
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should remain dirty if read-only', (done) => {
        l._readOnly = true;

        const checks = () => {
          expect(l.dirty).toEqual(true);
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should sync MyWallet if needed', (done) => {
        spyOn(l, '_syncWallet').and.callFake(() => Promise.resolve());

        l._walletNeedsSync = true;
        const checks = () => {
          expect(l._syncWallet).toHaveBeenCalled();
          expect(l._walletNeedsSync).toEqual(false);
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });

      it('should not sync MyWallet if not needed', (done) => {
        spyOn(l, '_syncWallet').and.callFake(() => Promise.resolve());

        expect(l._walletNeedsSync).toEqual(false);

        const checks = () => {
          expect(l._syncWallet).not.toHaveBeenCalled();
        };
        let promise = l.save().then(checks);
        expect(promise).toBeResolved(done);
      });
    });

    describe('migrateIfNeeded()', () => {
      beforeEach(() => {
        Labels.prototype.migrateIfNeeded.and.callThrough(); // Remove spy
      });

      describe('first time', () => {
        it('should create an initial payload', () => {
          let res = l.migrateIfNeeded(null);
          expect(res).toEqual(defaultInitialPayload);
        });

        it('should also replace empty object with initial payload', () => {
          let res = l.migrateIfNeeded({});
          expect(res).toEqual(defaultInitialPayload);
        });

        describe('wallet without existing labels', () => {
          beforeEach(() => {
            l._wallet.hdwallet.accounts = [{address_labels_backup: undefined}];
          });

          it('should create a placeholder for each account', () => {
            l._wallet.hdwallet.accounts.push([]);
            let res = l.migrateIfNeeded(null);
            expect(res.accounts.length).toEqual(2);
          });

          it('should not trigger a wallet sync', () => {
            l.migrateIfNeeded(null);
            expect(l._walletNeedsSync).toEqual(false);
          });
        });

        describe('wallet with existing labels', () => {
          beforeEach(() => {
            l._wallet.hdwallet.accounts = [{_address_labels_backup: [
              {index: 1, label: 'Hello'}
            ]}];
          });

          it('should import labels', () => {
            let res = l.migrateIfNeeded(null);
            expect(res).toEqual(mockPayload);
          });

          it('should create a placeholder for each account', () => {
            l._wallet.hdwallet.accounts.push([]);
            let res = l.migrateIfNeeded({});
            expect(res.accounts.length).toEqual(2);
          });

          it('should trigger a wallet sync', () => {
            l.migrateIfNeeded(null);
            expect(l._walletNeedsSync).toEqual(true);
          });

          it('should not trigger a wallet sync if read-only', () => {
            l._readOnly = true;
            l.migrateIfNeeded(null);
            expect(l._walletNeedsSync).toEqual(false);
          });
        });
      });

      describe('no version change', () => {
        it('should not change anything', () => {
          let res = l.migrateIfNeeded(mockPayload);
          expect(res).toEqual(mockPayload);
        });
      });

      // describe('version 1.0.0', () => {
      //   it('should upgrade to 1.1.0', () => {
      //     let oldPayload = {
      //       version: '1.0.0',
      //       accounts: [[null, {label: 'Hello'}]]
      //     };
      //     let res = l.migrateIfNeeded(oldPayload);
      //     expect(res).toEqual(mockPayload);
      //   });
      // });

      describe('unrecognized new major version', () => {
        it('should throw', () => {
          let v = latestVersion.split('.').map((i) => parseInt(i));
          v[0] += 1;
          let newVersion = v.join('.');
          expect(() => { l.migrateIfNeeded({version: newVersion}); }).toThrow(
            Error('LABELS_UNSUPPORTED_MAJOR_VERSION')
          );
        });
      });

      describe('unrecognized new minor version', () => {
        it('should switch to readOnly', () => {
          let v = latestVersion.split('.').map((i) => parseInt(i));
          v[1] += 1;
          let newVersion = v.join('.');
          l.migrateIfNeeded({version: newVersion});
          expect(l.readOnly).toEqual(true);
        });
      });

      describe('unrecognized new patch version', () => {
        let res;
        let mockPayLoadNewVersion;

        beforeEach(() => {
          let v = latestVersion.split('.').map((i) => parseInt(i));
          v[2] += 1;
          mockPayLoadNewVersion = JSON.parse(JSON.stringify(mockPayload));
          mockPayLoadNewVersion.version = v.join('.');

          res = l.migrateIfNeeded(mockPayLoadNewVersion);
        });

        it('should not modify the payload', () => {
          expect(res).toEqual(mockPayLoadNewVersion);
        });

        it('should not switch to read-only', () => {
          expect(l.readOnly).toEqual(false);
        });

        it('should downgrade the payload if saved', (done) => {
          const checks = () => {
            expect(l.version).toEqual(latestVersion);
          };

          let promise = l.save().then(checks);
          expect(promise).toBeResolved(done);
        });
      });
    });

    describe('reserveReceiveAddress()', () => {
      let account;

      beforeEach(() => {
        account = wallet.hdwallet.accounts[0];
      });

      it('should return the first available address', () => {
        expect(l.reserveReceiveAddress(0).receiveAddress).toEqual('0-2');
      });

      it('should check if reusableIndex is null or integer if present', () => {
        expect(() => {
          l.reserveReceiveAddress(0, {reusableIndex: 0});
        }).not.toThrow();

        expect(() => {
          l.reserveReceiveAddress(0, {reusableIndex: null});
        }).not.toThrow();

        expect(() => {
          l.reserveReceiveAddress(0, {reusableIndex: -1});
        }).toThrow();
      });

      it('should fail if GAP limit is reached and no reusable index is given', () => {
        account.receiveIndex = 25;
        expect(() => {
          l.reserveReceiveAddress(0);
        }).toThrow(Error('gap_limit'));
      });

      describe('.commit()', () => {
        let reservation;
        beforeEach(() => {
          reservation = l.reserveReceiveAddress(0);
          spyOn(l, 'setLabel');
        });

        it('should label the address', () => {
          reservation.commit('Exchange order #1');
          expect(l.setLabel).toHaveBeenCalledWith(0, 2, 'Exchange order #1');
        });

        it('should append label if reusableIndex is present and gap limit reached', () => {
          account.lastUsedReceiveIndex = 0;
          account.receiveIndex = 20;

          spyOn(l, 'getLabel').and.returnValue('Exchange order #1');

          reservation = l.reserveReceiveAddress(0, {reusableIndex: 1});

          reservation.commit('Exchange order #2');
          expect(l.getLabel).toHaveBeenCalledWith(0, 1);
          expect(l.setLabel).toHaveBeenCalledWith(0, 1, 'Exchange order #1, Exchange order #2');
        });
      });
    });

    describe('setLabel()', () => {
      it('should call save()', () => {
        spyOn(l, 'save');
        l.setLabel(0, 1, 'Updated Label');
        expect(l.save).toHaveBeenCalled();
      });

      it('should not call save() if label is unchanged', () => {
        spyOn(l, 'save');
        l.setLabel(0, 1, 'Hello');
        expect(l.save).not.toHaveBeenCalled();
      });

      it('should normally not sync MyWallet', () => {
        l.setLabel(0, 1, 'Updated Label');
        expect(l._walletNeedsSync).toEqual(false);
      });

      it('should sync MyWallet if highest labeled index', () => {
        l.setLabel(0, 2, 'New Label');
        expect(l._walletNeedsSync).toEqual(true);
      });
    });

    describe('addLabel()', () => {
      it('should call save()', () => {
        spyOn(l, 'save').and.callThrough();
        l.addLabel(0, 15, 'New Label');
        expect(l.save).toHaveBeenCalled();
      });

      it('should sync MyWallet', () => {
        l.addLabel(0, 15, 'New Label');
        expect(l._walletNeedsSync).toEqual(true);
      });
    });

    describe('removeLabel()', () => {
      it('should call save()', () => {
        spyOn(l, 'save');
        l.removeLabel(0, 1);
        expect(l.save).toHaveBeenCalled();
      });

      it('should normally not sync MyWallet', () => {
        l.removeLabel(0, 0);
        expect(l._walletNeedsSync).toEqual(false);
      });

      it('should sync MyWallet if highest labeled index', () => {
        l.removeLabel(0, 1, 'New Label');
        expect(l._walletNeedsSync).toEqual(true);
      });
    });

    describe('releaseReceiveAddress()', () => {
      let addressHD = {
        constructor: {
          name: 'AddressHD'
        }
      };

      beforeEach(() => {
        spyOn(l, 'removeLabel');
        spyOn(l, 'setLabel');
        spyOn(l, 'getAddress').and.returnValue(addressHD);
      });

      it('should remove the label', () => {
        l.releaseReceiveAddress(0, 1);
        expect(l.removeLabel).toHaveBeenCalledWith(0, addressHD);
      });

      it('should remove one of multible ids in a label', () => {
        addressHD.label = 'Exchange Order #1, Exchange Order #2';
        l.releaseReceiveAddress(0, 2, {expectedLabel: 'Exchange Order #2'});
        expect(l.setLabel).toHaveBeenCalledWith(0, addressHD, 'Exchange Order #1');
      });

      it('should deal with comma', () => {
        addressHD.label = 'Exchange Order #2, Exchange Order #1';
        l.releaseReceiveAddress(0, 2, {expectedLabel: 'Exchange Order #2'});
        expect(l.setLabel).toHaveBeenCalledWith(0, addressHD, 'Exchange Order #1');
      });

      it('should not touch existing label when in doubt, for multible ids in a label', () => {
        addressHD.label = 'Exchange Order #1, Customized Order #2 label';
        l.releaseReceiveAddress(0, 2, {expectedLabel: 'Exchange Order #2'});
        expect(l.setLabel).not.toHaveBeenCalled();

        l.releaseReceiveAddress(0, 2);
        expect(l.setLabel).not.toHaveBeenCalled();
      });
    });
  });
});
