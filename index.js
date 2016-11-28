'use strict';

require('isomorphic-fetch');
require('es6-promise').polyfill();
global.Symbol = require('core-js/es6/symbol');
var Buffer = require('buffer').Buffer;

// This fixes a bug with Safari < 8 and the Browserify Buffer shim used in Crypto-browserify/randombytes
// See: https://github.com/feross/buffer/issues/63
try {
  if (navigator && navigator.vendor &&
      navigator.vendor.indexOf('Apple') > -1) {
    var versionStart = navigator.userAgent.toLowerCase().indexOf('applewebkit') + 12;
    var version = navigator.userAgent.substr(versionStart, 1);

    if (version && typeof (parseInt(version, 10)) === 'number' && parseInt(version, 10) < 6) {
      Buffer.TYPED_ARRAY_SUPPORT = true;
    }
  }
} catch (e) {
}

module.exports = {
  Buffer: Buffer,
  MyWallet: require('./src/wallet'),
  WalletStore: require('./src/wallet-store'),
  WalletCrypto: require('./src/wallet-crypto'),
  Payment: require('./src/payment'),
  ImportExport: require('./src/import-export'),
  BlockchainSettingsAPI: require('./src/blockchain-settings-api'),
  Helpers: require('./src/helpers'),
  API: require('./src/api'),
  Tx: require('./src/wallet-transaction'),
  WalletTokenEndpoints: require('./src/wallet-token-endpoints'),
  WalletNetwork: require('./src/wallet-network'),
  RNG: require('./src/rng'),
  Transaction: require('./src/transaction'),
  Address: require('./src/address'),
  Metadata: require('./src/metadata'),
  Bitcoin: require('bitcoinjs-lib'),
  External: require('./src/external'),
  BuySell: require('./src/buy-sell'),
  constants: require('./src/constants'),
  BigInteger: require('bigi/lib'),
  BIP39: require('bip39'),
  Networks: require('bitcoinjs-lib/src/networks'),
  ECDSA: require('bitcoinjs-lib/src/ecdsa'),
  SharedMetadata: require('./src/sharedMetadata'),
  Contacts: require('./src/contacts'),
  SharedMetadataAPI: require('./src/sharedMetadataAPI'),
  R: require('ramda')
};
