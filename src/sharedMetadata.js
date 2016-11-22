// var master = Blockchain.MyWallet.wallet.hdwallet.getMasterHDNode()
// var m = Blockchain.SharedMetadata.fromMasterHDNode(master)
'use strict';

const WalletCrypto = require('./wallet-crypto');
const Bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto');
const API = require('./api');
const MyWallet = require('./wallet');
const Contacts = require('./contacts');
const Helpers = require('./helpers');
const Metadata = require('./metadata');
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
    this.authorize();
  }

  get mdid() {
    return this._mdid;
  }
  get priv() {
    return this._priv;
  }
}

SharedMetadata.sign = function (keyPair, message) {
  return Bitcoin.message.sign(keyPair, message)
};

SharedMetadata.verify = function (mdid, signature, message) {
  return Bitcoin.message.verify (mdid, signature, message);
}

SharedMetadata.request = function (method, endpoint, data, authToken) {
  var url = API.API_ROOT_URL + 'metadata/' + endpoint;
  var options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };
  if (authToken) {
    options.headers.Authorization = 'Bearer ' + authToken;
  }

  // encodeFormData :: Object -> url encoded params
  var encodeFormData = function (data) {
    if (!data) return '';
    var encoded = Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
    return encoded ? '?' + encoded : encoded;
  };

  if (data && data !== {}) {
    if (method === 'GET') {
      url += encodeFormData(data);
    } else {
      options.body = JSON.stringify(data);
    }
  }

  options.method = method;

  var handleNetworkError = function (e) {
    return Promise.reject({ error: 'SHARED_METADATA_CONNECT_ERROR', message: e });
  };

  var checkStatus = function (response) {
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };

  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus);
};

SharedMetadata.getAuthToken = function (mdidHDNode) {
  const S = SharedMetadata;
  const mdid = mdidHDNode.getAddress();
  const key = mdidHDNode.keyPair;
  return S.request('GET','auth')
             .then( (r) => ({ nonce: r.nonce
                            , signature: S.sign(key, r.nonce).toString('base64')
                            , mdid: mdid}))
             .then( (d) => S.request('POST', 'auth' , d))
             .then( (r) => r.token);
};

SharedMetadata.prototype.authorize = function () {
  return this.next(() => {
    return SharedMetadata.getAuthToken(this._node)
             .then((token) => {
                 this._auth_token = token;
                 return token;
              })
  });
}
SharedMetadata.prototype.getMessages = function (onlyNew) {
  return this.next(
    SharedMetadata.request.bind(this, 'GET', 'messages', onlyNew ? {new: true} : {}, this._auth_token)
  );
};

SharedMetadata.prototype.getMessage = function (id) {
  return this.next(
    SharedMetadata.request.bind(this, 'GET', 'message/' + id, null, this._auth_token)
  );
};

SharedMetadata.prototype.processMessage = function (id) {
  return this.next(
    SharedMetadata.request.bind(this, 'PUT', 'message/' + id + '/processed', null, this._auth_token)
  );
};

SharedMetadata.prototype.trustContact = function (contactMdid) {
  return this.next(
    SharedMetadata.request.bind(this, 'PUT', 'trusted/' + contactMdid, null, this._auth_token)
  );
};

SharedMetadata.prototype.getTrustedList = function () {
  return this.next(
    SharedMetadata.request.bind(this, 'GET', 'trusted', null, this._auth_token)
  );
};

SharedMetadata.prototype.getTrusted = function (contactMdid) {
  return this.next(
    SharedMetadata.request.bind(this, 'GET', 'trusted/' + contactMdid, null, this._auth_token)
  );
};

SharedMetadata.prototype.removeContact = function (contactMdid) {
  return this.next(
    SharedMetadata.request.bind(this, 'DELETE', 'trusted/' + contactMdid, null, this._auth_token)
  );
};

// SharedMetadata.prototype.sendMessage = function (mdidRecipient, payload, type) {
//   var encrypted = this.encryptFor(payload, mdidRecipient);
//   var body = {
//     type: type,
//     payload: encrypted,
//     signature: this.sign(encrypted),
//     // sender: this.mdid,
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
SharedMetadata.prototype.publishXPUB = function () {
  return this.next(() => {
    var myDirectory = new Metadata(this._keyPair);
    myDirectory.fetch();
    return myDirectory.update({xpub: this._xpub});
  });
};

SharedMetadata.prototype.getXPUB = function (contactMDID) {
  return this.next(Metadata.read.bind(undefined, contactMDID));
};
// createInvitation :: Promise InvitationID
SharedMetadata.prototype.createInvitation = function () {
  return this.next(SharedMetadata.request.bind(this, 'POST', 'share', undefined, this._auth_token));
};
// readInvitation :: String -> Promise RequesterID
SharedMetadata.prototype.readInvitation = function (id) {
  return this.next(SharedMetadata.request.bind(this, 'GET', 'share/' + id, undefined, this._auth_token));
};
// acceptInvitation :: String -> Promise ()
SharedMetadata.prototype.acceptInvitation = function (id) {
  return this.next(SharedMetadata.request.bind(this, 'POST', 'share/' + id, undefined, this._auth_token));
};
// deleteInvitation :: String -> Promise ()
SharedMetadata.prototype.deleteInvitation = function (id) {
  return this.next(SharedMetadata.request.bind(this, 'DELETE', 'share/' + id, undefined, this._auth_token));
};

SharedMetadata.fromMDIDHDNode = function (mdidHDNode) {
  return new SharedMetadata(mdidHDNode);
};

SharedMetadata.fromMasterHDNode = function (masterHDNode) {
  // var masterHDNode = MyWallet.wallet.hdwallet.getMasterHDNode(cipher);
  var hash = WalletCrypto.sha256('info.blockchain.mdid');
  var purpose = hash.slice(0, 4).readUInt32BE(0) & 0x7FFFFFFF;
  var mdidHDNode = masterHDNode.deriveHardened(purpose);
  return SharedMetadata.fromMDIDHDNode(mdidHDNode);
};

SharedMetadata.prototype.next = function (f) {
  var nextInSeq = this._sequence.then(f);
  this._sequence = nextInSeq.then(Helpers.noop, Helpers.noop);
  return nextInSeq;
};

module.exports = SharedMetadata;
