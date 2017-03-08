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
    this.hd_wallet = wallet.hd_wallet;

    this._cache = {};

    if (object !== null) {
      // TODO: run upgrade scripts
      // TODO: abort if major version changed
      this._accounts = object.accounts || []; // TODO: integrity check
      this._account_names = object.account_names || []; // TODO: integrity check
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
      accounts: this._accounts,
      account_names: this._account_names
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
    this._labels = [];
    this._account_names = [];
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

    return this._accounts[accountIndex].map((currentValue, index) => {
      let key = `address_hd_${accountIndex}_${index}`;
      if (!this._cache[key]) {
        if (currentValue === null) {
          if (options.includeUnlabeled) {
            this._cache[key] = new AddressHD(null,
                                            this._wallet.hdwallet.accounts[accountIndex],
                                            index);
          } else {
            return null;
          }
        } else {
          this._cache[key] = new AddressHD(currentValue,
                                          this._wallet.hdwallet.accounts[accountIndex],
                                          index);
        }
      }
      return this._cache[key];
    });
  }

  maxLabeledReceiveIndex (accountIndex) {
    // TODO
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

  addLabel (accountIndex, addressIndex, label) {
    // TODO: check if it already exists
    if (!this._accounts[accountIndex]) {
      this._accounts[accountIndex] = [];
    }
    this._accounts[accountIndex][addressIndex] = {label: label};

    // Legacy:
    if (false) { // TODO: check if this is the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }
    this.save();
  }

  removeLabel (accountIndex, addressIndex) {
    this._accounts[accountIndex][addressIndex] = undefined;
    // Legacy:
    if (false) { // TODO: check if this was the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }
    this.save();
  }

}

module.exports = Labels;
