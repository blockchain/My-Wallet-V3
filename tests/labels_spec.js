let proxyquire = require('proxyquireify')(require);

fdescribe('Labels', () => {
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

  let e;

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
        e = new Labels(metadata, wallet, mockPayload);
        expect(e.constructor.name).toEqual('Labels');
      });

      it('should deserialize the version', () => {
        e = new Labels(metadata, wallet, mockPayload);
        expect(e.version).toEqual(latestVersion);
      });

      it('should not deserialize non-expected fields', () => {
        mockPayload.non_expected_field = 'I am an intruder';
        e = new Labels(metadata, wallet, mockPayload);
        expect(e._non_expected_field).toBeUndefined();
      });

      it('should call save if migration changes anything', () => {
        mockPayload.version = '0.1.0';
        e = new Labels(metadata, wallet, mockPayload);
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
      e = new Labels(metadata, wallet, mockPayload);
    });

    describe('toJSON', () => {
      beforeEach(() => {
      });

      it('should store version', () => {
        let json = JSON.stringify(e);
        expect(JSON.parse(json)).toEqual(
          jasmine.objectContaining({version: latestVersion}
        ));
      });

      it('should not serialize non-expected fields', () => {
        e.rarefield = 'I am an intruder';
        let json = JSON.stringify(e, null, 2);
        let obj = JSON.parse(json);

        expect(obj.version).toBeDefined();
        expect(obj.rarefield).not.toBeDefined();
      });
    });

    describe('readOnly', () => {
      it('should be true when _readOnly is true', () => {
        e._readOnly = true;
        expect(e.readOnly).toEqual(true);
      });

      it('should be true if KV store doesn\'t work', () => {
        e._readOnly = false;
        e._wallet.isMetadataReady = false;
        expect(e.readOnly).toEqual(true);
      });
    });

    describe('dirty', () => {
      it('should be true when _dirty is true', () => {
        e._dirty = true;
        expect(e.dirty).toEqual(true);
      });
    });
  });
});
