var Metadata = require('./metadata');

var METADATA_TYPE_ADDRESSES = 4;

class Addresses {
  constructor (wallet) {
    var masterhdnode = wallet.hdwallet.getMasterHDNode();
    this._metadata = Metadata.fromMasterHDNode(masterhdnode, METADATA_TYPE_ADDRESSES);

    // For migration and legacy support, we need to keep a reference:
    this.hd_wallet = wallet.hd_wallet;
  }

  toJSON () {
    return {
      version: '1.0.0',
      labels: this._labels
    };
  }

  fetch () {
    var Populate = function (object) {
      this.loaded = true;
      if (object !== null) {
        // TODO: run upgrade scripts
        // TODO: abort if major version changed
        this._labels = object.labels; // TODO: integrity check
      } else {
        this.migrate();
      }
      return this;
    };
    var fetchFailed = function (e) {
      // Metadata service is down or unreachable.
      this.loaded = false;
      return Promise.reject(e);
    };
    return this._metadata.fetch().then(Populate.bind(this)).catch(fetchFailed.bind(this));
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
    // TODO: for each wallet account:
    // TODO:   go through address_labels, add entries here and delete in original wallet
    // TODO:   put placeholder entry with just the index
  }

  maxLabeledReceiveIndex (accountIndex) {
    // TODO
  }

  addLabel (accountIndex, addressIndex, label) {
    // TODO: check if it already exists
    this._labels.push({acc: accountIndex, addr: addressIndex, label: label});

    // Legacy:
    if (false) { // TODO: check if this is the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }
    this.save();
  }

  removeLabel (accountIndex, addressIndex) {
    // TODO
    // Legacy:
    if (false) { // TODO: check if this was the highest index for this account
      // TODO: modify index of account.address_labels entry.
    }
    this.save();
  }

}

module.exports = Addresses;
