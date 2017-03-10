var Metadata = require('./metadata');
var Helpers = require('./helpers');
var AddressHD = require('./address-hd');
var BlockchainAPI = require('./api');

var assert = require('assert');

var METADATA_TYPE_LABELS = 4;

class Labels {
  constructor (metadata, wallet, object) {
    this._readOnly = false; // Default
    this._dirty = true;
    this._wallet = wallet;
    this._metadata = metadata;

    let before = JSON.stringify(object);
    object = this.migrateIfNeeded(object);

    this.init(object);

    if (JSON.stringify(object) !== before) {
      this.save();
    } else {
      this._dirty = false;
    }
  }

  get readOnly () {
    return this._readOnly || !this._wallet.isMetadataReady;
  }

  get dirty () {
    return this._dirty;
  }

  init (object) {
    this._accounts = [];
    for (let accountObject of object.accounts) {
      let accountIndex = object.accounts.indexOf(accountObject);
      let addresses = [];
      for (let addressObject of accountObject) {
        if (addressObject === null) {
          addresses.push(null);
        } else {
          let hdAccount = this._wallet.hdwallet.accounts[accountIndex];
          let addressIndex = accountObject.indexOf(addressObject);
          addresses.push(new AddressHD(addressObject, hdAccount, addressIndex));
        }
      }
      this._accounts[accountIndex] = addresses;
    }
  }

  static initMetadata (wallet) {
    return Metadata.fromMasterHDNode(wallet._metadataHDNode, METADATA_TYPE_LABELS);
  }

  toJSON () {
    return {
      version: '1.0.0',
      accounts: this._accounts.map((addresses) => {
        if (addresses.length > 1) {
          // Remove trailing null values:
          while (addresses[addresses.length - 1] === null || addresses[addresses.length - 1].label === null) {
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
    var metadata = Labels.initMetadata(wallet);

    var fetchSuccess = function (payload) {
      return new Labels(metadata, wallet, payload);
    };

    var fetchFailed = function (e) {
      // Metadata service is down or unreachable.
      return Promise.reject(e);
    };
    return metadata.fetch().then(fetchSuccess).catch(fetchFailed);
  }

  save () {
    if (this.readOnly) {
      console.info('Labels KV store is read-only, not saving');
      return Promise.resolve();
    }
    if (!this._metadata.existsOnServer) {
      return this._metadata.create(this).then(() => {
        this._dirty = false;
      });
    } else {
      return this._metadata.update(this).then(() => {
        this._dirty = false;
      });
    }
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
      if (this._wallet.hdwallet.accounts[0]._address_labels_backup) {
        console.info('Migrate address labels from wallet to KV-Store v1.0.0');
      } else {
        // This is a new wallet
      }

      if (!this._wallet.isMetadataReady) {
        // 2nd password is enabled and we can't write to the KV store
        this._readOnly = true;
      }

      object = {
        version: '1.0.0',
        accounts: []
      };

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
    let addresses = labeledAddresses.map((a) => a.address);

    if (addresses.length === 0) return Promise.resolve();

    BlockchainAPI.getBalances(addresses).then((data) => {
      for (let labeledAddress of labeledAddresses) {
        if (data[labeledAddress.address]) {
          labeledAddress.used = data[labeledAddress.address].n_tx > 0;
        }
      }
    });

    return Promise.resolve();
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
    if (!this._accounts[accountIndex]) return null;

    if (options.includeUnlabeled) {
      // Add null entries up to the current receive index
      let receiveIndex = this._wallet.hdwallet.accounts[accountIndex].receiveIndex;
      for (let i = 0; i < receiveIndex; i++) {
        if (!this._accounts[accountIndex][i]) {
          this._accounts[accountIndex][i] = new AddressHD(null,
                        this._wallet.hdwallet.accounts[accountIndex],
                        i);
        }
      }
    }

    return this._accounts[accountIndex].filter((a) => a !== null);
  }

  maxLabeledReceiveIndex (accountIndex) {
    if (!this._accounts[accountIndex]) return -1;
    let labeledAddresses = this._accounts[accountIndex].filter(a => a && a.label);
    if (labeledAddresses.length === 0) return -1;
    return this._accounts[accountIndex].indexOf(labeledAddresses.reverse()[0]);
  }

  getLabel (accountIndex, addressIndex) {
    if (!this._accounts[accountIndex]) {
      return null;
    }

    const entry = this._accounts[accountIndex][addressIndex];

    if (!entry) {
      return null;
    }

    return entry.label;
  }

  addLabel (accountIndex, label, maxGap) {
    assert(Helpers.isPositiveInteger(accountIndex), 'specify accountIndex');
    assert(Helpers.isString(label), 'specify label');
    assert(maxGap <= 20, 'Max gap must be less than 20');

    maxGap = maxGap || 20;

    let receiveIndex = this._wallet.hdwallet.accounts[accountIndex].receiveIndex;
    let lastUsedReceiveIndex = this._wallet.hdwallet.accounts[accountIndex].lastUsedReceiveIndex;

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    } else if (receiveIndex - lastUsedReceiveIndex >= maxGap) {
      // Exceeds BIP 44 unused address gap limit
      return Promise.reject('GAP');
    }

    if (!this._accounts[accountIndex]) {
      this._accounts[accountIndex] = [];
    }

    let addr = this._accounts[accountIndex][receiveIndex];
    if (!addr) {
      addr = new AddressHD(null,
                           this._wallet.hdwallet.accounts[accountIndex],
                           receiveIndex);
      addr.used = false;
      this._accounts[accountIndex][receiveIndex] = addr;
    }

    addr.label = label;

    this._dirty = true;

    return this.save().then(() => {
      return addr;
    });
  }

  setLabel (accountIndex, address, label) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(this._accounts[accountIndex], `_accounts[${accountIndex}] should exist`);

    let addressIndex = this._accounts[accountIndex].indexOf(address);

    assert(Helpers.isPositiveInteger(addressIndex), 'Address not found');

    if (!Helpers.isValidLabel(label)) {
      return Promise.reject('NOT_ALPHANUMERIC');
    }

    if (address.label === label) {
      return Promise.resolve();
    }

    address.label = label;

    this._dirty = true;

    return this.save();
  }

  removeLabel (accountIndex, address) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(this._accounts[accountIndex], `_accounts[${accountIndex}] should exist`);

    let addressIndex = this._accounts[accountIndex].indexOf(address);

    assert(Helpers.isPositiveInteger(addressIndex), 'Address not found');

    address.label = null;

    this._dirty = true;

    return this.save();
  }

}

module.exports = Labels;
