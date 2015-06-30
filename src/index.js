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
  Payload: require('./payload'),
  Wallet: require('./blockchain-wallet'),
  Address: require('./address'),
  HDAccount: require('./hd-account'),
  HDWallet: require('./hd-wallet'),
  KeyChain: require('./keychain'),
  KeyRing: require('./keyring'),
  Bitcoin: require('bitcoinjs-lib'),
  Base58: require('bs58'),
  BigInteger: require('bigi')
};
