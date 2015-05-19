module.exports = {
  $: require('jquery'),
  CryptoJS: require('crypto-js'),
  MyWallet: require('./wallet'),
  WalletStore: require('./wallet-store'),
  WalletCrypto: require('./wallet-crypto'),
  Spender: require('./wallet-spender'),
  ImportExport: require('./import-export'),
  BlockchainAPI: require('./blockchain-api'),
  BlockchainSettingsAPI: require('./blockchain-settings-api')
};
