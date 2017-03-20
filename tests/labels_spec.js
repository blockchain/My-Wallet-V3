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

  let wallet;

  let l;

  beforeEach(() => {
    wallet = {
      hdwallet: {
        accounts: [{
          index: 0,
          receiveAddressAtIndex: (index) => `0-${index}`,
          receiveIndex: 2,
          lastUsedReceiveIndex: 1
        }]
      }
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
