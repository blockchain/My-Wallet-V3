const WalletCredentials = require('./walletcredentials');
var Metadata = require('./../metadata');
var HdWallet = require('./../hd-wallet');

const METADATA_TYPE_WALLET_CREDENTIALS = 12;

class WalletCredentialsMetadata {
  constructor(wallet, walletStore, metadata) {
    this._wallet = wallet;
    this._walletStore = walletStore;
    this._metadata = metadata;
  }

  fetchAndUpdate (success, error) {
    return this._metadata.fetch().then((data) => {
      let guid = this._wallet._guid;
      let password = this._walletStore.getPassword();
      let sharedKey = this._wallet._sharedKey;

      if(data && guid === data.guid && sharedKey === data.sharedKey && password === data.password) {
        return
      }

      this._metadata
        .update({guid: guid, password: password, sharedKey: sharedKey})
        .then(success)
        .catch(error)
    });
  }

  static fromBlockchainWallet (wallet, walletStore) {
    let metadata = wallet.metadata(METADATA_TYPE_WALLET_CREDENTIALS);
    return new WalletCredentialsMetadata(wallet, walletStore, metadata);
  }

  static fromMnemonic (mnemonic) {
    let hd = HdWallet.new(mnemonic)
    let masterNode = hd.getMasterHDNode()
    let metadata = Metadata.fromMasterHDNode(masterNode, METADATA_TYPE_WALLET_CREDENTIALS)
    return metadata.fetch().then((data) => {
      return new WalletCredentials(data.guid, data.password, data.sharedKey)
    })
  }
}

module.exports = WalletCredentialsMetadata;
