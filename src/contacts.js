'use strict';

const Bitcoin = require('bitcoinjs-lib');
const Metadata = require('./metadata');
const R = require('ramda');
const uuid = require('uuid');
const SharedMetadata = require('./sharedMetadata');
const METADATA_TYPE_EXTERNAL = 4;

class Contact {
  constructor (o) {
    this.id = o.id;
    this.mdid = o.mdid;
    this.name = o.name;
    this.surname = o.surname;
    this.company = o.company;
    this.email = o.email;
    this.xpub = o.xpub;
    this.note = o.note;
    this.trusted = o.trusted;
    this.invitationSent = o.invitationSent;  // I invited somebody
    this.invitationReceived = o.invitationReceived; // Somebody invited me
  }
  get pubKey () {
    return this.xpub ? Bitcoin.HDNode.fromBase58(this.xpub).keyPair : null;
  }
}

Contact.factory = function (o) {
  return new Contact(o);
};

Contact.new = function (o) {
  const id = uuid();
  const namedContact = R.assoc('id', id, o);
  return new Contact(namedContact);
};

Contact.prototype.fetchXPUB = function () {
  return this.mdid
    ? Metadata.read(this.mdid).then((r) => { this.xpub = r.xpub; return r.xpub; })
    : Promise.reject('UNKNOWN_MDID');
};

class Contacts {
  constructor (masterhdnode) {
    this.list = {};
    this._metadata = Metadata.fromMasterHDNode(masterhdnode, METADATA_TYPE_EXTERNAL);
    this._sharedMetadata = SharedMetadata.fromMasterHDNode(masterhdnode);
    this._sharedMetadata.publishXPUB();
  }
}

Contacts.prototype.toJSON = function () {
  return this.list;
};

Contacts.prototype.fetch = function () {
  var Populate = function (o) {
    this.list = o ? R.map(Contact.factory, o) : {};
    return this;
  };
  var fetchFailed = function (e) {
    return Promise.reject(e);
  };
  return this._metadata.fetch().then(Populate.bind(this)).catch(fetchFailed.bind(this));
};

Contacts.prototype.save = function () {
  return this._metadata.update(this);
};

Contacts.prototype.wipe = function () {
  this._metadata.update({}).then(this.fetch.bind(this));
  this.list = {};
};

Contacts.prototype.new = function (object) {
  const c = Contact.new(object);
  this.list = R.assoc(c.id, c, this.list);
  return c;
};

const fromNull = (str) => str || '';
const isContact = (uniqueId) => R.where({id: R.equals(uniqueId)});
const contains = R.curry((substr, key) => R.where(R.objOf(key, R.compose(R.contains(substr), fromNull))));

Contacts.prototype.delete = function (id) {
  this.list = R.reject(isContact(id), this.list);
};

Contacts.prototype.search = function (str) {
  const search = contains(str);
  const predicate = R.anyPass(R.map(search, ['name', 'surname', 'email', 'company', 'note', 'mdid']));
  return R.filter(predicate, this.list);
};

Contacts.prototype.fetchXPUB = function (uuid) {
  const c = this.get(uuid);
  return c.fetchXPUB();
};

Contacts.prototype.get = function (uuid) {
  return R.prop(uuid, this.list);
};

// returns a promise with the invitation and updates my contact list
Contacts.prototype.createInvitation = function (myInfoToShare, contactInfo) {
  // myInfoToShare could be a contact object that will be encoded on the QR
  // contactInfo comes from a form that is filled before pressing invite (I am inviting James bla bla)
  return this._sharedMetadata.createInvitation()
    .then((i) => {
           this.new(R.assoc('invitationSent', i.id, contactInfo))
           return R.assoc('invitationReceived', i.id, myInfoToShare)
         }
    );
};

// returns a promise with the invitation and updates my contact list
Contacts.prototype.readInvitation = function (invitation) {
  // invitation is an object with contact information and mandatory invitationReceived
  // {name: "Biel", invitationReceived: "4d7f9088-4a1e-45f0-bd93-1baba7b0ec58"}
  return this._sharedMetadata.readInvitation(invitation.invitationReceived)
    .then((i) => {
           const c = this.new(R.assoc('mdid', i.mdid, invitation))
           return c;
         }
    );
};

Contacts.prototype.acceptInvitation = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.acceptInvitation(c.invitationReceived)
};

Contacts.prototype.readInvitationSent = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.readInvitation(c.invitationSent)
    .then((i) => {
           c.mdid = i.contact;
           return c;
         }
    );
};

Contacts.prototype.addTrusted = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.addTrusted(c.mdid).then(() => {c.trusted = true; return true;});
};

Contacts.prototype.deleteTrusted = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.deleteTrusted(c.mdid).then(() => {c.trusted = false; return true;});
};

Contacts.prototype.sendMessage = function (uuid, type, message) {
  const c = this.get(uuid);
  return this._sharedMetadata.sendMessage(c, type, message);
}

Contacts.prototype.getMessages = function (onlyNew) {
  const c = this.get(uuid);
  return this._sharedMetadata.getMessages(onlyNew);
}

Contacts.prototype.readMessage = function (messageId) {
  return this._sharedMetadata.getMessage(messageId)
           .then(this._sharedMetadata.readMessage.bind(this._sharedMetadata, this))
}

module.exports = Contacts;


// ffaaaa9d-b54f-40b0-9736-2e39ca9e9ff0
// 4d2c6ade-8397-4d7b-8c74-03113f40487a
