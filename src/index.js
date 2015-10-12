'use strict';

var Buffer = require('buffer').Buffer

// This fixes a bug with Safari < 8 and the Browserify Buffer shim used in Crypto-browserify/randombytes
// See: https://github.com/feross/buffer/issues/63
if (navigator && navigator.vendor &&
    navigator.vendor.indexOf('Apple') > -1) {
  var versionStart = navigator.userAgent.toLowerCase().indexOf('applewebkit') + 12;
  var version = navigator.userAgent.substr(versionStart, 1);

  if (version && typeof(parseInt(version)) === 'number' && parseInt(version) < 6) {
    Buffer.TYPED_ARRAY_SUPPORT = true;
  }
}

module.exports = {
  Buffer: Buffer,
  CryptoJS: require('crypto-js'),
  MyWallet: require('./wallet'),
  WalletStore: require('./wallet-store'),
  WalletCrypto: require('./wallet-crypto'),
  Payment: require('./payment'),
  ImportExport: require('./import-export'),
  BlockchainSettingsAPI: require('./blockchain-settings-api'),
  // only for debugging
  Helpers: require('./helpers'),
  API: require('./api')
  // Wallet: require('./blockchain-wallet'),
  // Address: require('./address'),
  // HDAccount: require('./hd-account'),
  // HDWallet: require('./hd-wallet'),
  // KeyChain: require('./keychain'),
  // KeyRing: require('./keyring'),
  // Bitcoin: require('bitcoinjs-lib'),
  // Base58: require('bs58'),
  // BigInteger: require('bigi'),
  // BIP39: require('bip39')
};
