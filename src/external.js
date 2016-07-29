'use strict';

var Coinify = require('./coinify/coinify');
var Metadata = require('./metadata');
var METADATA_TYPE_EXTERNAL = 3;

module.exports = External;

function External () {
  this._metadata = new Metadata(METADATA_TYPE_EXTERNAL);
  this._coinify = null;
}

Object.defineProperties(External.prototype, {
  'coinify': {
    configurable: false,
    get: function () { return this._coinify; }
  }
});

External.prototype.toJSON = function () {
  var external = {
    coinify: this._coinify
  };
  return external;
};

External.prototype.fetchOrCreate = function () {
  var createOrPopulate = function (object) {
    if (object === null) { // entry non exitent
      this._coinify = Coinify.new(this);
      return this._metadata.create(this);
    } else {
      this._coinify = object.coinify ? new Coinify(object.coinify, this) : undefined;
      return this;
    }
  };
  return this._metadata.fetch().then(createOrPopulate.bind(this));
};

External.prototype.save = function () {
  return this._metadata.update(this);
};
