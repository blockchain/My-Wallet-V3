'use strict';

var WalletCrypto = require('./wallet-crypto');
var Bitcoin = require('bitcoinjs-lib');
var BitcoinMessage = require('bitcoinjs-message');
var API = require('./api');
var Helpers = require('./helpers');
var constants = require('./constants');

// individual imports to reduce bundle size
var assoc = require('ramda/src/assoc');
var curry = require('ramda/src/curry');
var compose = require('ramda/src/compose');
var prop = require('ramda/src/prop');

class Metadata {
  constructor (ecPair, encKeyBuffer, encKeyBufferPadded, typeId) {
    // ecPair :: ECPair object - bitcoinjs-lib
    // encKeyBuffer :: Buffer (nullable = no encrypted save)
    // encKeyBufferPadded :: Buffer (nullable)
    // TypeId :: Int (nullable = default -1)
    this.VERSION = 1;
    this._typeId = typeId == null ? -1 : typeId;
    this._magicHash = null;
    this._address = Helpers.keyPairToAddress(ecPair);
    this._signKey = ecPair;
    this._encKeyBuffer = encKeyBuffer;
    this._encKeyBufferPadded = encKeyBufferPadded;
    this._sequence = Promise.resolve();
  }

  get existsOnServer () {
    return Boolean(this._magicHash);
  }
}

// network
Metadata.request = function (method, endpoint, data) {
  const url = API.API_ROOT_URL + 'metadata/' + endpoint;
  let options = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit'
  };
  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  options.method = method;
  const handleNetworkError = (e) =>
    Promise.reject({ error: 'METADATA_CONNECT_ERROR', message: e });

  const checkStatus = (response) => {
    if (response.status >= 200 && response.status < 300) {
      return response.json();
    } else if (method === 'GET' && response.status === 404) {
      return null;
    } else {
      return response.text().then(Promise.reject.bind(Promise));
    }
  };
  return fetch(url, options)
    .catch(handleNetworkError)
    .then(checkStatus);
};

Metadata.GET = function (e, d) { return Metadata.request('GET', e, d); };
Metadata.PUT = function (e, d) { return Metadata.request('PUT', e, d); };
Metadata.read = (address) => Metadata.request('GET', address)
                                      .then(Metadata.extractResponse(null));

// //////////////////////////////////////////////////////////////////////////////
Metadata.encrypt = curry((key, data) => WalletCrypto.encryptDataWithKey(data, key));
Metadata.decrypt = curry((key, data) => WalletCrypto.decryptDataWithKey(data, key));
Metadata.B64ToBuffer = (base64) => Buffer.from(base64, 'base64');
Metadata.BufferToB64 = (buff) => buff.toString('base64');
Metadata.StringToBuffer = (base64) => Buffer.from(base64);
Metadata.BufferToString = (buff) => buff.toString();

// Metadata.message :: Buffer -> Buffer -> Base64String
Metadata.message = curry(
  function (payload, prevMagic) {
    if (prevMagic) {
      const hash = WalletCrypto.sha256(payload);
      const buff = Buffer.concat([prevMagic, hash]);
      return buff.toString('base64');
    } else {
      return payload.toString('base64');
    }
  }
);

Metadata.magic = curry(
  function (payload, prevMagic) {
    const msg = this.message(payload, prevMagic);
    return BitcoinMessage.magicHash(msg, constants.getNetwork().messagePrefix);
  }
);

Metadata.verify = (address, signature, hash) =>
  BitcoinMessage.verify(hash, address, signature, constants.getNetwork().messagePrefix);

// Metadata.sign :: keyPair -> msg -> Buffer
Metadata.sign = (keyPair, msg) => BitcoinMessage.sign(keyPair, msg, constants.getNetwork().messagePrefix);

// Metadata.computeSignature :: keypair -> buffer -> buffer -> base64
Metadata.computeSignature = (key, payloadBuff, magicHash) =>
  Metadata.sign(key, Metadata.message(payloadBuff, magicHash));

Metadata.verifyResponse = curry((address, res) => {
  if (res === null) return res;
  const M = Metadata;
  const sB = res.signature ? Buffer.from(res.signature, 'base64') : undefined;
  const pB = res.payload ? Buffer.from(res.payload, 'base64') : undefined;
  const mB = res.prev_magic_hash ? Buffer.from(res.prev_magic_hash, 'hex') : undefined;
  const verified = Metadata.verify(address, sB, M.message(pB, mB));
  if (!verified) throw new Error('METADATA_SIGNATURE_VERIFICATION_ERROR');
  return assoc('compute_new_magic_hash', M.magic(pB, mB), res);
});


// Tries to decrypt with `Metadata.decrypt(encKey)`. If it fails and encKey2 
// is not null it tries to decrypt with `encKey2`.
Metadata.decryptRetry = curry(
  function (encKey, encKey2, payload) {
    const tryOther = curry((obj) => {
      if (obj && obj.length > 0) { 
        return obj
      } else if (encKey2) {
        return Metadata.decrypt(encKey2, payload)
      } else {
        return obj
      }
    })
    return compose(tryOther, Metadata.decrypt(encKey))(payload)
  }
);

Metadata.extractResponse = curry((encKey, encKey2, res) => {
  const M = Metadata;
  if (res === null) {
    return res;
  } else {
    return encKey
      ? compose(JSON.parse, M.decryptRetry(encKey, encKey2), prop('payload'))(res)
      : compose(JSON.parse, M.BufferToString, M.B64ToBuffer, prop('payload'))(res);
  }
});

Metadata.toImmutable = compose(Object.freeze, JSON.parse, JSON.stringify);

Metadata.prototype.create = function (payload) {
  const M = Metadata;
  payload = M.toImmutable(payload);
  return this.next(() => {
    // Encrypt using encKeyBuffer on the original format.
    const encPayloadBuffer = this._encKeyBuffer
      ? compose(M.B64ToBuffer, M.encrypt(this._encKeyBuffer), JSON.stringify)(payload)
      : compose(M.StringToBuffer, JSON.stringify)(payload);
    const signatureBuffer = M.computeSignature(this._signKey, encPayloadBuffer, this._magicHash);
    const body = {
      'version': this.VERSION,
      'payload': encPayloadBuffer.toString('base64'),
      'signature': signatureBuffer.toString('base64'),
      'prev_magic_hash': this._magicHash ? this._magicHash.toString('hex') : null,
      'type_id': this._typeId
    };
    return M.PUT(this._address, body).then(
      (response) => {
        this._value = payload;
        this._magicHash = M.magic(encPayloadBuffer, this._magicHash);
        return payload;
      }
    );
  });
};

Metadata.prototype.update = function (payload) {
  if (JSON.stringify(payload) === JSON.stringify(this._value)) {
    return this.next(() => Promise.resolve(Metadata.toImmutable(payload)));
  } else {
    return this.create(payload);
  }
};

Metadata.prototype.fromObject = function (payload, magicHashHex) {
  if (magicHashHex) {
    this._magicHash = Buffer.from(magicHashHex, 'hex');
  }

  const saveValue = (res) => {
    if (res === null) return res;
    this._value = Metadata.toImmutable(res);
    return res;
  };

  return Promise.resolve(payload).then(saveValue);
};

Metadata.prototype.fetch = function () {
  const saveMagicHash = (res) => {
    if (res === null) return res;
    this._magicHash = prop('compute_new_magic_hash', res);
    return res;
  };

  return this.next(() => {
    const M = Metadata;

    return M.GET(this._address).then(M.verifyResponse(this._address))
                               .then(saveMagicHash)
                               .then(M.extractResponse(this._encKeyBuffer, this._encKeyBufferPadded))
                               .then(this.fromObject.bind(this))
                               .catch((e) => {
                                 console.error(`Failed to fetch metadata entry ${this._typeId} at ${this._address}:`, e);
                                 return Promise.reject('METADATA_FETCH_FAILED');
                               });
  });
};

Metadata.prototype.next = function (f) {
  var nextInSeq = this._sequence.then(f);
  this._sequence = nextInSeq.then(Helpers.noop, Helpers.noop);
  return nextInSeq;
};

// CONSTRUCTORS
// used to restore metadata from purpose xpriv (second password)
Metadata.fromMetadataHDNode = function (metadataHDNode, typeId) {
  // Payload types:
  // 0: reserved (guid)
  // 1: reserved
  // 2: whats-new
  // 3: buy-sell
  // 4: contacts

  const payloadTypeNode = metadataHDNode.deriveHardened(typeId);

  // purpose' / type' / 0' : https://meta.blockchain.info/{address}
  //                         signature used to authenticate
  const type0PrivateKey = payloadTypeNode.deriveHardened(0).privateKey

  // - purpose' / type' / 1' node Private Key
  const type1PrivateKey = payloadTypeNode.deriveHardened(1).privateKey

  return Metadata.fromTypeIDDerivations(type0PrivateKey, type1PrivateKey, typeId)
};

// CONSTRUCTORS
// Used from Metadata.fromMetadataHDNode
// type0PrivateKey: purpose' / typeId' / 0' derivation private key Buffer
// type1PrivateKey: purpose' / typeId' / 1' derivation private key Buffer
// typeId: String
Metadata.fromTypeIDDerivations = function (type0PrivateKey, type1PrivateKey, typeId) {

  const keypair = Bitcoin.ECPair.fromPrivateKey(type0PrivateKey)

  // - New Format Encryption Key

  var encryptionKeyNew = WalletCrypto.sha256(type1PrivateKey);

  // - Original Format Encryption Key

  // Remove all `00` leading nibbles from privateKey Buffer.
  const type1PrivateKeyOriginal = Metadata.sanitizeBuffer(type1PrivateKey) 
  
  // Generate SHA256   
  const encryptionKeyOriginal = WalletCrypto.sha256(type1PrivateKeyOriginal)

  // Clear encryptionKeyNew if keys are equal.
  if (encryptionKeyNew.equals(encryptionKeyOriginal)) {
    encryptionKeyNew = null
  }

  return new Metadata(keypair, encryptionKeyOriginal, encryptionKeyNew, typeId);
}

// Remove all `00` leading nibbles from Buffer.
// Input [0, 0, 0, 10, 0, 20, 30]
// Output [10, 0, 20, 30]]
Metadata.sanitizeBuffer = function (aBuffer) {
  var aBuffer = aBuffer
  while (aBuffer.length > 0 && aBuffer.readUInt8(0) == 0) {
    aBuffer = aBuffer.slice(1)
  }
  return aBuffer
}

Metadata.deriveMetadataNode = function (masterHDNode) {
  // BIP 43 purpose needs to be 31 bit or less. For lack of a BIP number
  // we take the first 31 bits of the SHA256 hash of a reverse domain.
  var hash = WalletCrypto.sha256('info.blockchain.metadata');
  var purpose = hash.slice(0, 4).readUInt32BE(0) & 0x7FFFFFFF; // 510742
  return masterHDNode.deriveHardened(purpose);
};

// used to create a new metadata entry from wallet master hd node
Metadata.fromMasterHDNode = function (masterHDNode, typeId) {
  var metadataHDNode = Metadata.deriveMetadataNode(masterHDNode);
  return Metadata.fromMetadataHDNode(metadataHDNode, typeId);
};

module.exports = Metadata;
