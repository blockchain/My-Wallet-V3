const BIP39 = require('bip39');
const Bitcoin = require('bitcoinjs-lib');
const MetadataMock = require('./metadata.mock');
const seedHex = '17eb336a2a3bc73dd4d8bd304830fe32';
const mnemonic = BIP39.entropyToMnemonic(seedHex);
const masterhex = BIP39.mnemonicToSeed(mnemonic);
const masterHdNode = Bitcoin.HDNode.fromSeedBuffer(masterhex);

class BlockchainWalletMock {
  constructor () {
    let addrs = {
      '1asdf': { address: '1asdf' },
      '1watch': { address: '1watch', isWatchOnly: true },
      '1arch': { address: '1arch', archived: true }
    };

    this.addresses = Object.keys(addrs);
    this.keys = this.addresses.map(a => addrs[a]);
    this.activeKeys = this.keys.filter(k => !k.archived);
    this.spendableActiveAddresses = this.activeKeys.filter(k => !k.isWatchOnly).map(k => k.address);

    this.hdwallet = {
      // mnemonic: 'blood flower surround federal round page fat bless core dose display govern',
      // masterSeedHex: '265c86692394fab95d0efc4385b89679d8daef5c9975e1f2b1f1eb4300bc10ad81d4d117c323591d543f6e54aa9d4560cad424bc66bb2bb61dc14285a508dad7',
      seedHex,
      defaultAccountIndex: 0,
      xpubs: [
        'xpub1',
        'xpub2'
      ],
      accounts: [
        {
          index: 0,
          label: 'My Wallet',
          extendedPublicKey: 'xpub1',
          receiveAddressAtIndex () {},
          changeAddressAtIndex () {}
        },
        {
          index: 1,
          extendedPublicKey: 'xpub2',
          receiveAddressAtIndex () {},
          changeAddressAtIndex () {}
        }
      ],
      getMasterHex (seedHex, cipher = x => x) {
        return cipher(masterhex);
      },
      getMasterHDNode (cipher = x => x) {
        return cipher(masterHdNode);
      }
    };
    this.isDoubleEncrypted = false;
  }
  metadata (type) {
    return new MetadataMock();
  }
  createCipher (secPass) {
    return (x) => {
      if (secPass !== 'correct') {
        throw new Error('Second password incorrect');
      }
      return x;
    };
  }
}

module.exports = BlockchainWalletMock;
