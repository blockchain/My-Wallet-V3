'use strict';

const Bitcoin = require('bitcoinjs-lib');
const Metadata = require('./metadata');
// individual imports to reduce bundle size
const assoc = require('ramda/src/assoc');
const prop = require('ramda/src/prop');
const map = require('ramda/src/map');
const uuid = require('uuid');
const FacilitatedTx = require('./facilitatedTx');

class Contact {
  constructor (o) {
    this.id = o.id;
    this.mdid = o.mdid;
    this.name = o.name;
    this.xpub = o.xpub;
    this.trusted = o.trusted;
    this.invitationSent = o.invitationSent;  // I invited somebody
    this.invitationReceived = o.invitationReceived; // Somebody invited me
    this.facilitatedTxList = o.facilitatedTxList ? map(FacilitatedTx.factory, o.facilitatedTxList) : {};
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
  const namedContact = assoc('id', id, o);
  return new Contact(namedContact);
};

Contact.prototype.fetchXPUB = function () {
  return this.mdid
    ? Metadata.read(this.mdid).then((r) => { this.xpub = r.xpub; return r.xpub; })
    : Promise.reject('UNKNOWN_MDID');
};

// create and add a request payment request to that contact facilitated tx list
Contact.prototype.RPR = function (intendedAmount, id, role, note, lastUpdated) {
  const rpr = FacilitatedTx.RPR(intendedAmount, id, role, note, lastUpdated);
  this.facilitatedTxList = assoc(id, rpr, this.facilitatedTxList);
  return rpr;
};

// create and/or add a payment request to that contact facilitated tx list
Contact.prototype.PR = function (intendedAmount, id, role, address, note, lastUpdated) {
  var existingTx = prop(id, this.facilitatedTxList);
  if (existingTx) {
    existingTx.address = address;
    existingTx.state = FacilitatedTx.WAITING_PAYMENT;
    return existingTx;
  } else {
    const pr = FacilitatedTx.PR(intendedAmount, id, role, address, note, lastUpdated);
    this.facilitatedTxList = assoc(id, pr, this.facilitatedTxList);
    return pr;
  }
};

// modify the state of facilitated tx to broadcasted
Contact.prototype.PRR = function (txHash, id) {
  var existingTx = prop(id, this.facilitatedTxList);
  existingTx.tx_hash = txHash;
  existingTx.state = FacilitatedTx.PAYMENT_BROADCASTED;
  return existingTx;
};

module.exports = Contact;
