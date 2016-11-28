'use strict';

const WalletCrypto = require('./wallet-crypto');
const Bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto');
const MyWallet = require('./wallet');
const Contacts = require('./contacts');
const Helpers = require('./helpers');
const Metadata = require('./metadata');
const jwtDecode = require('jwt-decode');
const API = require('./sharedMetadataAPI');
import * as R from 'ramda'

class SharedMetadata {
  constructor (mdidHDNode) {
    this._node = mdidHDNode;
    this._xpub = mdidHDNode.neutered().toBase58();
    this._priv = mdidHDNode.toBase58();
    this._mdid = mdidHDNode.getAddress();
    this._keyPair = mdidHDNode.keyPair;
    this._auth_token = null;
    this._sequence = Promise.resolve();
  }
  get mdid() { return this._mdid; }
  get node() { return this._node; }
  get token() { return this._auth_token; }
}

// should be overwritten by iOS
SharedMetadata.sign = Bitcoin.message.sign;
SharedMetadata.verify = Bitcoin.message.verify

SharedMetadata.signChallenge = R.curry((key, r) => (
  {
    nonce: r.nonce,
    signature: SharedMetadata.sign(key, r.nonce).toString('base64'),
    mdid: key.getAddress()
  }
));

SharedMetadata.getAuthToken = (mdidHDNode) =>
  API.getAuth().then(SharedMetadata.signChallenge(mdidHDNode.keyPair))
                 .then(API.postAuth);

SharedMetadata.isValidToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    var expDate = new Date(decoded.exp * 1000);
    var now = new Date();
    return now < expDate;
  } catch (e) {
    return false;
  }
};

SharedMetadata.prototype.authorize = function () {
  const saveToken = (r) => { this._auth_token = r.token; return r.token; };
  return this.next(
    () => SharedMetadata.isValidToken(this.token)
          ? Promise.resolve(this.token)
          : SharedMetadata.getAuthToken(this.node).then(saveToken)
  );
};

// SharedMetadata.prototype.sendMessage = function (mdidRecipient, payload, type) {
//   var encrypted = this.encryptFor(payload, mdidRecipient);
//   var body = {
//     type: type,
//     payload: encrypted,
//     signature: this.sign(encrypted),
//     recipient: mdidRecipient
//   };
//   return this.request('POST', 'messages', body);
// };
//
// SharedMetadata.prototype.readMessage = function (msg) {
//   // TODO :: The public key can be extracted from the signature
//   return this.verify(msg.payload, msg.signature, msg.sender)
//     ? Promise.resolve(this.decryptFrom(msg.payload, msg.sender))
//     : Promise.reject('Wrong Signature');
// };
//
// SharedMetadata.prototype.encryptFor = function (message, mdid) {
//   var contactObject = this.contacts.get(mdid);
//   var contactPublicKey = Contacts.toPubKey(contactObject);
//   var sharedSecret = contactPublicKey.Q.multiply(this._keyPair.d).getEncoded(true);
//   var sharedKey = WalletCrypto.sha256(sharedSecret);
//   return WalletCrypto.encryptDataWithKey(message, sharedKey);
// };
//
// SharedMetadata.prototype.decryptFrom = function (message, mdid) {
//   var contactObject = this.contacts.get(mdid);
//   var contactPublicKey = Contacts.toPubKey(contactObject);
//   var sharedSecret = contactPublicKey.Q.multiply(this._keyPair.d).getEncoded(true);
//   var sharedKey = WalletCrypto.sha256(sharedSecret);
//   return WalletCrypto.decryptDataWithKey(message, sharedKey);
// };
//
// SharedMetadata.prototype.sendPaymentRequest = function (mdid, amount, note) {
//   // type 1 :: paymentRequest
//   var paymentRequest = {
//     amount: amount,
//     note: note
//   };
//   return this.sendMessage(mdid, JSON.stringify(paymentRequest), 1);
// };
//
// SharedMetadata.prototype.sendPaymentRequestResponse = function (requestMessage) {
//   // type 2 :: payment request answer
//   var msgP = this.readMessage(requestMessage);
//   var f = function (msg) {
//     var requestResponse = {
//       address: MyWallet.wallet.hdwallet.defaultAccount.receiveAddress,
//       amount: msg.amount,
//       note: msg.note
//     };
//     return this.sendMessage(requestMessage.sender, JSON.stringify(requestResponse), 2);
//   };
//   return msgP.then(f.bind(this));
// };
//
// SharedMetadata.prototype.publishXPUB = function () {
//   return this.next(() => {
//     var myDirectory = new Metadata(this._keyPair);
//     myDirectory.fetch();
//     return myDirectory.update({xpub: this._xpub});
//   });
// };
//
// SharedMetadata.prototype.getXPUB = function (contactMDID) {
//   return this.next(Metadata.read.bind(undefined, contactMDID));
// };

// createInvitation :: Promise InvitationID
SharedMetadata.prototype.createInvitation = function () {
  return this.authorize().then((t) => this.next(API.createInvitation.bind(null, t)));
};
// readInvitation :: String -> Promise RequesterID
SharedMetadata.prototype.readInvitation = function (uuid) {
  return this.authorize().then((t) => this.next(API.readInvitation.bind(null, t, uuid)));
};
// acceptInvitation :: String -> Promise ()
SharedMetadata.prototype.acceptInvitation = function (uuid) {
  return this.authorize().then((t) => this.next(API.acceptInvitation.bind(null, t, uuid)));
};
// deleteInvitation :: String -> Promise ()
SharedMetadata.prototype.deleteInvitation = function (uuid) {
  return this.authorize().then((t) => this.next(API.deleteInvitation.bind(null, t, uuid)));
};

SharedMetadata.fromMDIDHDNode = function (mdidHDNode) {
  return new SharedMetadata(mdidHDNode);
};

SharedMetadata.fromMasterHDNode = function (masterHDNode) {
  var hash = WalletCrypto.sha256('info.blockchain.mdid');
  var purpose = hash.slice(0, 4).readUInt32BE(0) & 0x7FFFFFFF;
  var mdidHDNode = masterHDNode.deriveHardened(purpose);
  return SharedMetadata.fromMDIDHDNode(mdidHDNode);
};

SharedMetadata.prototype.next = function (f) {
  var nextInSeq = this._sequence.then(f);
  this._sequence = nextInSeq.then(x => x, x => x);
  return nextInSeq;
};

module.exports = SharedMetadata;
