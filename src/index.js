'use strict';

require('isomorphic-fetch');
require('es6-promise').polyfill();

require('core-js/modules/es6.symbol');
require('core-js/modules/web.dom.iterable');

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
  MyWallet: require('./wallet'),
  WalletStore: require('./wallet-store'),
  WalletCrypto: require('./wallet-crypto'),
  Payment: require('./payment'),
  ImportExport: require('./import-export'),
  BlockchainSettingsAPI: require('./blockchain-settings-api'),
  Helpers: require('./helpers'),
  API: require('./api'),
  Tx: require('./wallet-transaction'),
  WalletTokenEndpoints: require('./wallet-token-endpoints'),
  WalletNetwork: require('./wallet-network'),
  RNG: require('./rng'),
  Transaction: require('./transaction'),
  Address: require('./address'),
  Metadata: require('./metadata'),
  Bitcoin: require('bitcoinjs-lib'),
  External: require('./external'),
  BuySell: require('./buy-sell'),
  constants: require('./constants'),
  BigInteger: require('bigi/lib'),
  BIP39: require('bip39'),
  Networks: require('bitcoinjs-lib/src/networks'),
  ECDSA: require('bitcoinjs-lib/src/ecdsa')
};
