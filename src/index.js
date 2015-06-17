module.exports = {
  $: require('jquery'),
  CryptoJS: require('crypto-js'),
  MyWallet: require('./wallet'),
  WalletStore: require('./wallet-store'),
  WalletCrypto: require('./wallet-crypto'),
  Spender: require('./wallet-spender'),
  ImportExport: require('./import-export'),
  BlockchainAPI: require('./blockchain-api'),
  BlockchainSettingsAPI: require('./blockchain-settings-api'),
  // only for debugging
  Helpers: require('./helpers'),
  Wallet: require('./w'),
  Address: require('./a'),
  HDAccount: require('./hda'),
  HDWallet: require('./hdw'),
  KeyChain: require('./keychain'),
  KeyRing: require('./keyring'),
  Bitcoin: require('bitcoinjs-lib'),
  Base58: require('bs58'),
  BigInteger: require('bigi')
};
