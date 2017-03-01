var Metadata = require('./metadata');

var METADATA_TYPE_LABELS = 4;

class Labels {
  constructor (metadata, wallet, object) {
    this._wallet = wallet;
    this._metadata = metadata;

    // For migration and legacy support, we need to keep a reference:
    this.hd_wallet = wallet.hd_wallet;

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
