'use strict';

module.exports = Block;

function Block (object) {
  var obj = object || {};
  this._hash = obj.hash || 'emptyBlock';
  this._time = obj.time || 0;
  this._blockIndex = obj.blockIndex || 0;
  this._height = obj.height || 0;
}

Object.defineProperties(Block.prototype, {
  'hash': {
    configurable: false,
    get: function () { return this._hash; }
  },
  'time': {
    configurable: false,
    get: function () { return this._time; }
  },
  'blockIndex': {
    configurable: false,
    get: function () { return this._blockIndex; }
  },
  'height': {
    configurable: false,
    get: function () { return this._height; }
  }
});

Block.prototype.toJSON = function () {
  return {
    hash: this.hash,
    time: this.time,
    blockIndex: this.blockIndex,
    height: this.height
  };
};

Block.fromJSON = function (json) {
  // block height is the only property we require
  if (json == null || json.height == null) {
    return null;
  } else {
    return new Block(json);
  }
};
