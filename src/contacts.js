'use strict';

var Bitcoin = require('bitcoinjs-lib');
var Metadata = require('./metadata');
// var assert = require('assert');

var METADATA_TYPE_EXTERNAL = 4;

module.exports = Contacts;

function Contacts (wallet) {
  this._metadata = new Metadata(METADATA_TYPE_EXTERNAL);
  this._list = {};
}

Object.defineProperties(Contacts.prototype, {
  'list': {
    configurable: false,
    get: function () { return this._list; }
  }
});

Contacts.prototype.toJSON = function () {
  return this._list;
};

Contacts.prototype.fetch = function () {
  var Populate = function (object) {
    this._list = object || {};
    return this;
  };
  var fetchFailed = function (e) {
    // Metadata service is down or unreachable.
    return Promise.reject(e);
  };
  return this._metadata.fetch().then(Populate.bind(this)).catch(fetchFailed.bind(this));
};

Contacts.prototype.save = function () {
  if (!this._metadata.existsOnServer) {
    return this._metadata.create(this);
  } else {
    return this._metadata.update(this);
  }
};

Contacts.prototype.wipe = function () {
  this._metadata.update({}).then(this.fetch.bind(this));
  this._list = {};
};

Contacts.prototype.add = function (contactObject) {
  this._list[contactObject.mdid] = contactObject;
  return this.save();
};

Contacts.prototype.get = function (mdid) {
  return this._list[mdid];
};

Contacts.toPubKey = function (contact) {
  return Bitcoin.HDNode.fromBase58(contact.xpub).keyPair;
}

// 18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ

// c.add({
//   name: 'Haskell',
//   surname: 'Curry',
//   company: 'Blockchain.info',
//   email: 'haskell@blockchain.info',
//   mdid: '18gZzsF5T92rT7WpvdZDEdo6KEmE8vu5sJ',
//   xpub: 'xpub68VkNL1CMDV4xn28ZCwMxdCRipqetfegjQ7AhxLtHcpakyc9Zodq9qGB4T4Kso3FaGCetuGAWznGSYKZGDd5iqaauhwdyMkKV4UHHn4nqer',
//   note: 'lambda wolf'
// })

// Contact
//   this.name       = o.name;
//   this.surname    = o.surname;
//   this.company    = o.company;
//   this.email      = o.email;
//   this.mdid       = o.mdid;
//   this.xpub       = o.xpub;
