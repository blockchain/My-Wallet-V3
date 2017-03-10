var Metadata = require('./metadata');
var Helpers = require('./helpers');
var AddressHD = require('./address-hd');
var BlockchainAPI = require('./api');

var assert = require('assert');

var METADATA_TYPE_LABELS = 4;

class Labels {
  constructor (metadata, wallet, object) {
    this._wallet = wallet;
    this._metadata = metadata;

    // For migration and legacy support, we need to keep a reference:
    this.hdwallet = wallet.hdwallet;

    if (object !== null) {
      // TODO: run upgrade scripts
      // TODO: abort if major version changed
      this._accounts = [];
      for (let accountObject of object.accounts) {
        let accountIndex = object.accounts.indexOf(accountObject);
        let addresses = [];
        for (let addressObject of accountObject) {
          if (addressObject === null) {
            addresses.push(null);
          } else {
            let hdAccount = wallet.hdwallet.accounts[accountIndex];
            let addressIndex = accountObject.indexOf(addressObject);
            addresses.push(new AddressHD(addressObject, hdAccount, addressIndex));
          }
        }
        this._accounts[accountIndex] = addresses;
      }
    } else {
      this.migrate();
    }
  }

  static initMetadata (wallet) {
    var masterhdnode = wallet.hdwallet.getMasterHDNode();
    return Metadata.fromMasterHDNode(masterhdnode, METADATA_TYPE_LABELS);
  }

  toJSON () {
    return {
      version: '1.0.0',
      accounts: this._accounts.map((addresses) => {
        // Remove trailing null values:
        while (addresses[addresses.length - 1] === null || addresses[addresses.length - 1].label === null) {
          addresses.pop();
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
    if (!this._metadata.existsOnServer) {
      return this._metadata.create(this);
    } else {
      // TODO: do not write if minor or major version has increased
      return this._metadata.update(this);
    }
  }

  wipe () {
    this._metadata.update({}).then(this.fetch.bind(this));
  }

  migrate () {
    // TODO: for each wallet account:
    // TODO:   go through address_labels, add entries here and delete in original wallet
    // TODO:   put placeholder entry with just the index
    //     this.save();
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

    // Legacy:
    if (false) { // TODO: check if this is the highest index for this account
      // TODO: modify index of account.address_labels entry.
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

    address.label = label;

    // Legacy:
    if (false) { // TODO: check if this is the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }
    return this.save();
  }

  removeLabel (accountIndex, address) {
    assert(Helpers.isPositiveInteger(accountIndex), 'Account index required');
    assert(this._accounts[accountIndex], `_accounts[${accountIndex}] should exist`);

    let addressIndex = this._accounts[accountIndex].indexOf(address);

    assert(Helpers.isPositiveInteger(addressIndex), 'Address not found');

    address.label = null;

    // Legacy:
    if (false) { // TODO: check if this was the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }

    return this.save();
  }

}

module.exports = Labels;
