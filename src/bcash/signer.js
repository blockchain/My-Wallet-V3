const { curry, forEach, addIndex, lensProp, compose, over } = require('ramda');
const { mapped } = require('ramda-lens');
const Bitcoin = require('bitcoincashjs-lib');
const constants = require('../constants');
const WalletCrypto = require('../wallet-crypto');
const Helpers = require('../helpers');
const KeyRing = require('../keyring');

const getKey = (priv, addr) => {
  let format = Helpers.detectPrivateKeyFormat(priv);
  let key = Helpers.privateKeyStringToKey(priv, format, Bitcoin);
  let network = constants.getNetwork(Bitcoin);
  let ckey = new Bitcoin.ECPair(key.d, null, { compressed: true, network: network });
  let ukey = new Bitcoin.ECPair(key.d, null, { compressed: false, network: network });
  if (ckey.getAddress() === addr) {
    return ckey;
  } else if (ukey.getAddress() === addr) {
    return ukey;
  }
  return key;
};

const getKeyForAddress = (wallet, password, addr) => {
  const k = wallet.key(addr).priv;
  const privateKeyBase58 = password == null ? k
      : WalletCrypto.decryptSecretWithSecondPassword(k, password, wallet.sharedKey, wallet.pbkdf2_iterations);
  return getKey(privateKeyBase58, addr);
};

const getXPRIV = (wallet, password, accountIndex) => {
  const account = wallet.hdwallet.accounts[accountIndex];
  return account.extendedPrivateKey == null || password == null
    ? account.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword(account.extendedPrivateKey, password, wallet.sharedKey, wallet.pbkdf2_iterations);
};

const pathToKey = (wallet, password, fullpath) => {
  const [idx, path] = fullpath.split('-');
  const xpriv = getXPRIV(wallet, password, idx);
  const keyring = new KeyRing(xpriv, undefined, Bitcoin);
  return keyring.privateKeyFromPath(path).keyPair;
};

const isFromAccount = (selection) => {
  return selection.inputs[0] ? selection.inputs[0].isFromAccount() : false;
};

const signSelection = selection => {
  let network = constants.getNetwork(Bitcoin);
  const hashType = Bitcoin.Transaction.SIGHASH_ALL | Bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143
  let tx = new Bitcoin.TransactionBuilder(network);
  tx.enableBitcoinCash(true);
  let addInput = coin => {
    const pk = coin.priv.getPublicKeyBuffer()
    const spk = Bitcoin.script.pubKey.output.encode(pk)
    tx.addInput(coin.txHash, coin.index, Bitcoin.Transaction.DEFAULT_SEQUENCE, spk);
  }
  let addOutput = coin => tx.addOutput(coin.address, coin.value);
  let sign = (coin, i) => {
    tx.sign(i, coin.priv, null, hashType, coin.value);
  }
  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);
  return tx.build().toHex();
};

const sign = curry((password, wallet, selection) => {
  const getPrivAcc = keypath => pathToKey(wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(wallet, password, address);
  const getKeys = isFromAccount(selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  return signSelection(selectionWithKeys);
});

module.exports = {
  sign
};
