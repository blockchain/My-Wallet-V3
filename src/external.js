var Metadata = require('./metadata');

var METADATA_TYPE_EXTERNAL = 3;

module.exports = External;

function External (metadata, wallet, object) {
  this._receivedObject = object
  this._wallet = wallet;
  this._metadata = metadata;
}

External.prototype.toJSON = function () {
  if (this._receivedObject !== null) {
    return this._receivedObject
  }
  return undefined
};

External.initMetadata = function (wallet) {
  return Metadata.fromMetadataHDNode(wallet._metadataHDNode, METADATA_TYPE_EXTERNAL);
};

External.fromJSON = function (wallet, json, magicHash) {
  var success = (payload) => {
    return new External(metadata, wallet, payload);
  };
  var metadata = External.initMetadata(wallet);
  return metadata.fromObject(json, magicHash).then(success);
};

External.fetch = function (wallet) {
  var metadata = External.initMetadata(wallet);

  var fetchSuccess = function (payload) {
    return new External(metadata, wallet, payload);
  };

  var fetchFailed = function (e) {
    // Metadata service is down or unreachable.
    return Promise.reject(e);
  };
  return metadata.fetch().then(fetchSuccess).catch(fetchFailed);
};

External.prototype.save = function () {
  if (this.toJSON() === undefined) {
    console.info('Not saving before any exchange account is created.');
    return Promise.resolve();
  }

  if (!this._metadata.existsOnServer) {
    return this._metadata.create(this);
  } else {
    return this._metadata.update(this);
  }
};