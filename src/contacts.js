'use strict';

const MyWallet = require('./wallet');
const Metadata = require('./metadata');
const R = require('ramda');
const uuid = require('uuid');
const SharedMetadata = require('./sharedMetadata');
const FacilitatedTx = require('./facilitatedTx');
const Contact = require('./contact');
const METADATA_TYPE_EXTERNAL = 4;

// messages types
const REQUEST_PAYMENT_REQUEST_TYPE = 0;
const PAYMENT_REQUEST_TYPE = 1;
const PAYMENT_REQUEST_RESPONSE_TYPE = 2;
const DECLINE_RESPONSE_TYPE = 3;
const CANCEL_RESPONSE_TYPE = 4;

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
Contacts.prototype.readInvitation = function (invitation) {
  // invitation is an object with contact information and mandatory invitationReceived
  // {name: "Biel", invitationReceived: "4d7f9088-4a1e-45f0-bd93-1baba7b0ec58"}
  return this._sharedMetadata.readInvitation(invitation.invitationReceived)
    .then((i) => {
      const c = this.new(R.assoc('mdid', i.mdid, invitation));
      // contact.RPR.bind(contact,
      //         message.payload.intended_amount,
      //         message.payload.id,
      //         FacilitatedTx.RPR_RECEIVER,
      //         message.payload.note)
      return c;
    });
};

Contacts.prototype.acceptInvitation = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.acceptInvitation(c.invitationReceived);
};

Contacts.prototype.readInvitationSent = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.readInvitation(c.invitationSent)
    .then((i) => {
      c.mdid = i.contact;
      return c;
    });
};

Contacts.prototype.addTrusted = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.addTrusted(c.mdid)
    .then(() => { c.trusted = true; return true; });
};

Contacts.prototype.deleteTrusted = function (uuid) {
  const c = this.get(uuid);
  return this._sharedMetadata.deleteTrusted(c.mdid)
    .then(() => { c.trusted = false; return true; });
};

Contacts.prototype.sendMessage = function (uuid, type, message) {
  const c = this.get(uuid);
  return this._sharedMetadata.sendMessage(c, type, message);
};

Contacts.prototype.getMessages = function (onlyNew) {
  return this._sharedMetadata.getMessages(onlyNew);
};

Contacts.prototype.readMessage = function (messageId) {
  return this._sharedMetadata.getMessage(messageId)
    .then(this._sharedMetadata.readMessage.bind(this._sharedMetadata, this));
};

// //////////////////////////////////////////////////////////////////////////////
// simple interface for making friends
// //////////////////////////////////////////////////////////////////////////////

// returns a promise with the invitation and updates my contact list
Contacts.prototype.createInvitation = function (myInfoToShare, contactInfo, message) {
  // myInfoToShare could be a contact object that will be encoded on the QR
  // contactInfo comes from a form that is filled before pressing invite (I am inviting James bla bla)
  return this._sharedMetadata.createInvitation(message)
    .then((i) => {
      this.new(R.assoc('invitationSent', i.id, contactInfo));
      return R.assoc('invitationReceived', i.id, myInfoToShare);
    });
};

Contacts.prototype.acceptRelation = function (invitation) {
  return this.readInvitation(invitation)
    .then(c => this.acceptInvitation(c.id)
               .then(this.addTrusted(c.id))
               .then(this.fetchXPUB(c.id))
    )
    .then(this.save.bind(this));
};

// used by the sender once websocket notification is received that recipient accepted
Contacts.prototype.completeRelation = function (uuid) {
  return this.readInvitationSent(uuid)
    .then(this.addTrusted.bind(this, uuid))
    .then(this.fetchXPUB.bind(this, uuid))
    .then(this.save.bind(this));
};

// /////////////////////////////////////////////////////////////////////////////
// Messaging facilities

// :: returns a message string of a payment request
const paymentRequest = function (id, intendedAmount, address, note) {
  const body = {
    id: id,
    intended_amount: intendedAmount,
    address: address
  }
  if (note) {
    body.note = note;
  }
  return JSON.stringify(body);
};
Contacts.prototype.paymentRequest = R.compose(JSON.parse, paymentRequest)

// :: returns a message string of a payment request
const requestPaymentRequest = function (intendedAmount, id, note) {
  return JSON.stringify(
    {
      intended_amount: intendedAmount,
      id: id,
      note: note
    });
};

Contacts.prototype.requestPaymentRequest = R.compose(JSON.parse, requestPaymentRequest)
// :: returns a message string of a payment request
const paymentRequestResponse = function (id, txHash) {
  return JSON.stringify(
    {
      id: id,
      tx_hash: txHash
    });
};
Contacts.prototype.paymentRequestResponse = R.compose(JSON.parse, paymentRequestResponse)

// :: returns a message string of a decline response
const declineResponse = function (id) {
  return JSON.stringify({id: id});
};

// :: returns a message string of a cancel response
const cancelResponse = function (id) {
  return JSON.stringify({id: id});
};

// I want you to pay me
Contacts.prototype.sendPR = function (userId, intendedAmount, id, note, initiatorSource) {
  // we should reserve the address (check buy-sell) - should probable be an argument
  id = id ? id : uuid()
  const contact = this.get(userId);
  const account = initiatorSource != null ? MyWallet.wallet.hdwallet.accounts[initiatorSource] : MyWallet.wallet.hdwallet.defaultAccount;
  const address = account.receiveAddress;
  const accountIndex = initiatorSource != null ? initiatorSource : MyWallet.wallet.hdwallet.defaultAccountIndex;
  const reserveAddress = () => {
    const label = 'payment request to ' + contact.name;
    return MyWallet.wallet.labels.setLabel(accountIndex, account.receiveIndex, label);
  };
  const message = paymentRequest(id, intendedAmount, address, note, initiatorSource);
  return reserveAddress()
    .then(this.sendMessage.bind(this, userId, PAYMENT_REQUEST_TYPE, message))
    .then(contact.PR.bind(contact, intendedAmount, id, FacilitatedTx.PR_INITIATOR, address, note, initiatorSource))
    .then(this.save.bind(this));
};

// request payment request (step-1)
Contacts.prototype.sendRPR = function (userId, intendedAmount, id, note, initiatorSource) {
  id = id ? id : uuid()
  const message = requestPaymentRequest(intendedAmount, id, note);
  const contact = this.get(userId);
  return this.sendMessage(userId, REQUEST_PAYMENT_REQUEST_TYPE, message)
    .then(contact.RPR.bind(contact, intendedAmount, id, FacilitatedTx.RPR_INITIATOR, note, initiatorSource))
    .then(this.save.bind(this));
};

// payment request response
Contacts.prototype.sendPRR = function (userId, txHash, id) {
  id = id ? id : uuid()
  const message = paymentRequestResponse(id, txHash);
  const contact = this.get(userId);
  return this.sendMessage(userId, PAYMENT_REQUEST_RESPONSE_TYPE, message)
    .then(contact.PRR.bind(contact, txHash, id))
    .then(this.save.bind(this));
};

// decline response
Contacts.prototype.sendDeclination = function (userId, id) {
  const message = declineResponse(id);
  const contact = this.get(userId);
  return this.sendMessage(userId, DECLINE_RESPONSE_TYPE, message)
    .then(contact.Decline.bind(contact, id))
    .then(this.save.bind(this));
};
// cancel response
Contacts.prototype.sendCancellation = function (userId, id) {
  const message = cancelResponse(id);
  const contact = this.get(userId);
  return this.sendMessage(userId, CANCEL_RESPONSE_TYPE, message)
    .then(contact.Cancel.bind(contact, id))
    .then(this.save.bind(this));
};

Contacts.prototype.read = function (userId, id) {
  const contact = this.get(userId);
  contact.Read(id);
  return this.save();
};
// /////////////////////////////////////////////////////////////////////////////
// digestion logic
Contacts.prototype.digestRPR = function (message) {
  // console.log('digesting RPR')
  // console.log(message)
  const result = this.search(message.sender);
  const contact = result[Object.keys(result)[0]];
  return this._sharedMetadata.processMessage(message.id)
    .then(contact.RPR.bind(contact,
            message.payload.intended_amount,
            message.payload.id,
            FacilitatedTx.RPR_RECEIVER,
            message.payload.note,
            message.payload.initiator_source,
            message.payload.read))
    .then(this.save.bind(this))
    .then(() => message);
};

Contacts.prototype.digestDecline = function (message) {
  // console.log('digesting Cancellation')
  // console.log(message)
  const result = this.search(message.sender);
  const contact = result[Object.keys(result)[0]];
  return this._sharedMetadata.processMessage(message.id)
    .then(contact.Decline.bind(contact, message.payload.id))
    .then(this.save.bind(this))
    .then(() => message);
};

Contacts.prototype.digestCancel = function (message) {
  // console.log('digesting Declination')
  // console.log(message)
  const result = this.search(message.sender);
  const contact = result[Object.keys(result)[0]];
  return this._sharedMetadata.processMessage(message.id)
    .then(contact.Cancel.bind(contact, message.payload.id))
    .then(this.save.bind(this))
    .then(() => message);
};

Contacts.prototype.digestPR = function (message) {
  // console.log('digesting PR')
  // console.log(message)
  const result = this.search(message.sender);
  const contact = result[Object.keys(result)[0]];
  return this._sharedMetadata.processMessage(message.id)
    .then(contact.PR.bind(contact,
            message.payload.intended_amount,
            message.payload.id,
            FacilitatedTx.PR_RECEIVER,
            message.payload.address,
            message.payload.note,
            message.payload.initiator_source,
            message.payload.read))
    .then(this.save.bind(this))
    .then(() => message);
};

Contacts.prototype.digestPRR = function (message) {
  // console.log('digesting PRR')
  // console.log(message)
  const result = this.search(message.sender);
  const contact = result[Object.keys(result)[0]];
  // todo :: validate txhash on network and amount
  return this._sharedMetadata.processMessage(message.id)
    .then(contact.PRR.bind(contact, message.payload.tx_hash, message.payload.id))
    .then(this.save.bind(this))
    .then(() => message);
};

Contacts.prototype.digestMessage = function (message) {
  switch (message.type) {
    case REQUEST_PAYMENT_REQUEST_TYPE:
      return this.digestRPR(message);
    case PAYMENT_REQUEST_TYPE:
      return this.digestPR(message);
    case PAYMENT_REQUEST_RESPONSE_TYPE:
      return this.digestPRR(message);
    case DECLINE_RESPONSE_TYPE:
      return this.digestDecline(message);
    case CANCEL_RESPONSE_TYPE:
      return this.digestCancel(message);
    default:
      return message;
  }
};

Contacts.prototype.digestNewMessages = function () {
  return this.getMessages(true)
    .then(
    msgs => {
      const messages = R.map(this._sharedMetadata.decryptMessage.bind(this._sharedMetadata, this), msgs);
      return Promise.all(messages);
    })
    .then(msgs => {
      return Promise.all(R.map(this.digestMessage.bind(this), msgs));
    }
    );
};

module.exports = Contacts;
