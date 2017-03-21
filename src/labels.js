var Metadata = require('./metadata');
var Helpers = require('./helpers');
var AddressHD = require('./address-hd');
var BlockchainAPI = require('./api');

var assert = require('assert');

var METADATA_TYPE_LABELS = 4;

class Labels {
  constructor (metadata, wallet, object) {
    this._readOnly = false; // Default
    this._wallet = wallet;
    this._metadata = metadata;

    this._before = JSON.stringify(object);

    object = this.migrateIfNeeded(object);

    this.init(object);

    this.save(); // Only saves if migration changed something
  }

  get readOnly () {
    return this._readOnly || !this._wallet.isMetadataReady;
  }

  get dirty () {
    return this._before !== JSON.stringify(this);
  }

  get version () {
    return this._version;
  }

  init (object) {
    this._version = object.version;
    this._accounts = [];
    for (let accountObject of object.accounts) {
      let accountIndex = object.accounts.indexOf(accountObject);
      let hdAccount = this._wallet.hdwallet.accounts[accountIndex];
      let receiveIndex = hdAccount.receiveIndex;
      let addresses = [];

      for (let addressObject of accountObject) {
        if (addressObject === null) {
          addresses.push(null); // Placeholder, will be replaced below
        } else {
          let addressIndex = accountObject.indexOf(addressObject);
          addresses.push(new AddressHD(addressObject, hdAccount, addressIndex));
        }
      }

      // Add null entries up to the current receive index
      for (let i = 0; i < receiveIndex; i++) {
        if (!addresses[i]) {
          addresses[i] = new AddressHD(null,
                        hdAccount,
                        i);
        }
      }
      this._accounts[accountIndex] = addresses;
    }
    if (!this._wallet.isMetadataReady) {
      // 2nd password is enabled and we can't write to the KV store
      this._readOnly = true;
    }
  }

  static initMetadata (wallet) {
    return Metadata.fromMasterHDNode(wallet._metadataHDNode, METADATA_TYPE_LABELS);
  }

  toJSON () {
    return {
      version: this.version,
      accounts: this._accounts.map((addresses) => {
        if (addresses.length > 1) {
          addresses = Helpers.deepClone(addresses);
          // Remove trailing null values:
          while (!addresses[addresses.length - 1] || addresses[addresses.length - 1].label === null) {
            addresses.pop();
          }
        }
        return addresses;
      })
    };
  }

  static fromJSON (wallet, json, magicHash) {
    var success = (payload) => {
      return new Labels(metadata, wallet, payload);
    };
    var metadata = Labels.initMetadata(wallet);
    return metadata.fromObject(JSON.parse(json), magicHash).then(success);
  }

  static fetch (wallet) {
    var metadata = wallet.isMetadataReady ? Labels.initMetadata(wallet) : null;

    var fetchSuccess = function (payload) {
      return new Labels(metadata, wallet, payload);
    };

    var fetchFailed = function (e) {
      // Metadata service is down or unreachable.
      return Promise.reject(e);
    };

    if (wallet.isMetadataReady) {
      return metadata.fetch().then(fetchSuccess).catch(fetchFailed);
    } else {
      return Promise.resolve(null).then(fetchSuccess);
    }
  }

  save () {
    if (!this.dirty) {
      return Promise.resolve();
    }
    if (this.readOnly) {
      console.info('Labels KV store is read-only, not saving');
      return Promise.resolve();
    }
    let promise;
    if (!this._metadata.existsOnServer) {
      promise = this._metadata.create(this);
    } else {
      promise = this._metadata.update(this);
    }
    return promise.then(() => {
      this._before = JSON.stringify(this);
    });
  }

  wipe () {
    this._metadata.update(null).then(() => { console.log('Wipe complete. Reload browser.'); });
  }

  migrateIfNeeded (object) {
    let major;
    let minor;
    let patch;

    if (object && object.version) {
      major = parseInt(object.version.split('.')[0]);
      minor = parseInt(object.version.split('.')[1]);
      patch = parseInt(object.version.split('.')[2]);
    }

    // First time, migrate from wallet payload if needed
    if (object === null || Helpers.isEmptyObject(object)) {
      object = {
        version: '1.0.0',
        accounts: []
      };

      if (this._wallet.hdwallet.accounts[0]._address_labels_backup) {
        console.info('Migrate address labels from wallet to KV-Store v1.0.0');

        for (let account of this._wallet.hdwallet.accounts) {
          let labels = [];
          for (let label of account._address_labels_backup || []) {
            labels[label.index] = {label: label.label};
          }
          // Set undefined entries to null:
          for (let i = 0; i < labels.length; i++) {
            if (!labels[i]) {
              labels[i] = null;
            }
          }
          object.accounts.push(labels);
        }
      } else {
        // This is a new wallet, create placeholders for each account:
        object.accounts = this._wallet.hdwallet.accounts.map(() => []);
      }
    } else if (major > 1) {
      // Payload contains unsuppored new major version, abort:
      throw new Error('LABELS_UNSUPPORTED_MAJOR_VERSION');
    } else if (major === 1 && minor > 0) {
      // New minor version can safely be used in read-only mode:
      this._readOnly = true;
    } else if (major === 1 && minor === 0 && patch > 0) {
      // New patch version can safely to be used.
    }

    // Run (future) migration scripts:
    // switch (object.version) {
    //   case '1.0.0':
    //     // Migrate from 1.0.1 to e.g. 1.0.2 or 1.1.0:
    //     // ...
    //     object.version = '1.0.1';
    //     // falls through
    //   case '1.0.1':
    //     // Migrate from 1.0.1 to e.g. 1.0.2 or 1.1.0:
    //     // ...
    //     object.version = '1.0.2';
    //     // falls through
    //   default:
    // }
    return object;
  }

  // Goes through all labeled addresses and checks which ones have transactions.
  // This result will be cached in the future. Although we obtain the balance,
  // this is an implementation detail and we don't save it.
  checkIfUsed (accountIndex) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    let labeledAddresses = this.all(accountIndex).filter((a) => a !== null);
    let addresses = labeledAddresses.filter((a) => a.label).map((a) => a.address);

    if (addresses.length === 0) return Promise.resolve();

    return BlockchainAPI.getBalances(addresses).then((data) => {
      for (let labeledAddress of labeledAddresses) {
        if (data[labeledAddress.address]) {
          labeledAddress.used = data[labeledAddress.address].n_tx > 0;
        }
      }
    });
  }

  fetchBalance (hdAddresses) {
    assert(Array.isArray(hdAddresses), 'hdAddresses missing');
    for (let addressHD of hdAddresses) {
      assert(addressHD.constructor.name === 'AddressHD', 'AddressHD required');
    }
    let addresses = hdAddresses.filter((a) => a.balance === null)
               .map((a) => a.address);

    if (addresses.length === 0) return Promise.resolve();

    return BlockchainAPI.getBalances(addresses).then((data) => {
      for (let a of hdAddresses) {
        if (data[a.address]) {
          a.used = data[a.address].n_tx > 0;
          a.balance = data[a.address].final_balance;
        }
      }
    });
  }

  all (accountIndex, options = {}) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    return this._accounts[accountIndex] || [];
  }

  // returns Int or null
  maxLabeledReceiveIndex (accountIndex) {
    if (!this._accounts[accountIndex]) return null;
    let labeledAddresses = this._accounts[accountIndex].filter(a => a && a.label);
    if (labeledAddresses.length === 0) return null;
    const indexOf = this._accounts[accountIndex].indexOf(labeledAddresses[labeledAddresses.length - 1]);
    return indexOf > -1 ? indexOf : null;
  }

  // Side-effect: adds a new entry if there is a new account or receive index.
  getAddress (accountIndex, receiveIndex) {
    if (!this._accounts[accountIndex]) {
      if (this._wallet.hdwallet.accounts.length > accountIndex) {
        this._accounts[accountIndex] = [];
      } else {
        return null;
      }
    }

    var entry = this._accounts[accountIndex][receiveIndex];

    if (!entry) {
      entry = new AddressHD(null,
                           this._wallet.hdwallet.accounts[accountIndex],
                           receiveIndex);
      entry.used = null;
      this._accounts[accountIndex][receiveIndex] = entry;
    }

    return entry;
  }

  getLabel (accountIndex, addressIndex) {
    let entry = this.getAddress(accountIndex, addressIndex);
    return entry.label;
  }

  addLabel (accountIndex, maxGap, label) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    assert(Helpers.isString(label), 'specify label');
    assert(Helpers.isPositiveInteger(maxGap) && maxGap <= 20, 'Max gap must be less than 20');

    if (this.readOnly) return Promise.reject('KV_LABELS_READ_ONLY');

    let receiveIndex = this._wallet.hdwallet.accounts[accountIndex].receiveIndex;
    let lastUsedReceiveIndex = this._wallet.hdwallet.accounts[accountIndex].lastUsedReceiveIndex;

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    } else if (receiveIndex - lastUsedReceiveIndex >= maxGap) {
      // Exceeds BIP 44 unused address gap limit
      return Promise.reject('GAP');
    }

    let addr = this.getAddress(accountIndex, receiveIndex);

    addr.label = label;
    addr.used = false;

    return this.save().then(() => {
      return addr;
    });
  }

  // address: either an AddressHD object or a receive index Integer
  setLabel (accountIndex, address, label) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(this._accounts[accountIndex], `_accounts[${accountIndex}] should exist`);
    assert(
      Helpers.isPositiveInteger(address) ||
      (address.constructor && address.constructor.name === 'AddressHD'),
    'address should be AddressHD instance or Int');

    if (this.readOnly) return Promise.reject('KV_LABELS_READ_ONLY');

    if (Helpers.isPositiveInteger(address)) {
      let receiveIndex = address;
      address = this.getAddress(accountIndex, receiveIndex);
    } else {
      let receiveIndex = this._accounts[accountIndex].indexOf(address);
      assert(Helpers.isPositiveInteger(receiveIndex), 'Address not found');
    }

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    }

    if (address.label === label) {
      return Promise.resolve();
    }

    address.label = label;

    return this.save();
  }

  removeLabel (accountIndex, address) {
    if (this.readOnly) return Promise.reject('KV_LABELS_READ_ONLY');
    assert(address.constructor && address.constructor.name === 'AddressHD', 'address should be AddressHD instance');

    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(this._accounts[accountIndex], `_accounts[${accountIndex}] should exist`);

    let addressIndex = this._accounts[accountIndex].indexOf(address);

    assert(Helpers.isPositiveInteger(addressIndex), 'Address not found');

    address.label = null;

    return this.save();
  }

  // options:
  //   Int || null reusableIndex: allow reuse in case of the gap limit
  reserveReceiveAddress (accountIndex, options = {}) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    if (options.reusableIndex !== undefined) {
      assert(
        options.reusableIndex === null ||
        Helpers.isPositiveInteger(options.reusableIndex),
      'not an integer');
    }

    var self = this;
    var account = this._wallet.hdwallet.accounts[accountIndex];

    let receiveIndex = account.receiveIndex;
    var originalLabel; // In case of address reuse

    // Respect the GAP limit:
    if (receiveIndex - account.lastUsedReceiveIndex >= 20) {
      receiveIndex = options.reusableIndex;
      if (receiveIndex == null) throw new Error('gap_limit');
      originalLabel = this.getLabel(accountIndex, receiveIndex);
    }

    var receiveAddress = account.receiveAddressAtIndex(receiveIndex);

    //   String label: will be appended in case of reuse
    function commitAddressLabel (label = '') {
      if (originalLabel) label = `${originalLabel}, ${label}`;

      self.setLabel(accountIndex, receiveIndex, label);
    }

    return {
      receiveIndex: receiveIndex,
      receiveAddress: receiveAddress,
      commit: commitAddressLabel
    };
  }

  releaseReceiveAddress (accountIndex, receiveIndex, options = {}) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(Helpers.isPositiveInteger(receiveIndex), 'Receive index required');

    if (options.expectedLabel !== undefined) {
      assert(
        options.expectedLabel === null ||
        Helpers.isString(options.expectedLabel),
      'not a string');
    }

    let address = this.getAddress(accountIndex, receiveIndex);

    if (options.expectedLabel) {
      if (address.label.includes(options.expectedLabel)) {
        const firstEntry = address.label.indexOf(options.expectedLabel) === 0;
        this.setLabel(
          accountIndex,
          address,
          firstEntry
            ? address.label.replace(options.expectedLabel + ', ', '')
            : address.label.replace(', ' + options.expectedLabel, '')
        );
      } else {
        // Don't touch the label
      }
    } else {
      // Remove label
      this.removeLabel(accountIndex, address);
    }
  }
}

module.exports = Labels;
