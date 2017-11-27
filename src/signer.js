const { curry, forEach, addIndex, lensProp, compose, over } = require('ramda');
const { mapped } = require('ramda-lens');
const Bitcoin = require('bitcoinjs-lib');
const BitcoinCash = require('bitcoincashjs-lib');
const constants = require('./constants');
const WalletCrypto = require('./wallet-crypto');
const Helpers = require('./helpers');
const KeyRing = require('./keyring');

const getKey = (BitcoinLib, priv, addr) => {
  let format = Helpers.detectPrivateKeyFormat(priv);
  let key = Helpers.privateKeyStringToKey(priv, format, BitcoinLib);
  let network = constants.getNetwork(BitcoinLib);
  let ckey = new BitcoinLib.ECPair(key.d, null, { compressed: true, network: network });
  let ukey = new BitcoinLib.ECPair(key.d, null, { compressed: false, network: network });
  if (ckey.getAddress() === addr) {
    return ckey;
  } else if (ukey.getAddress() === addr) {
    return ukey;
  }
  return key;
};

const getKeyForAddress = (BitcoinLib, wallet, password, addr) => {
  const k = wallet.key(addr).priv;
  const privateKeyBase58 = password == null ? k
      : WalletCrypto.decryptSecretWithSecondPassword(k, password, wallet.sharedKey, wallet.pbkdf2_iterations);
  return getKey(BitcoinLib, privateKeyBase58, addr);
};

const getXPRIV = (wallet, password, accountIndex) => {
  const account = wallet.hdwallet.accounts[accountIndex];
  return account.extendedPrivateKey == null || password == null
    ? account.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword(account.extendedPrivateKey, password, wallet.sharedKey, wallet.pbkdf2_iterations);
};

const pathToKey = (BitcoinLib, wallet, password, fullpath) => {
  const [idx, path] = fullpath.split('-');
  const xpriv = getXPRIV(wallet, password, idx);
  const keyring = new KeyRing(xpriv, undefined, BitcoinLib);
  return keyring.privateKeyFromPath(path).keyPair;
};

const isFromAccount = (selection) => {
  return selection.inputs[0] ? selection.inputs[0].isFromAccount() : false;
};

const bitcoinSigner = (selection) => {
  let network = constants.getNetwork(Bitcoin);
  let tx = new Bitcoin.TransactionBuilder(network);

  let addInput = coin => tx.addInput(coin.txHash, coin.index);
  let addOutput = coin => tx.addOutput(coin.address, coin.value);
  let sign = (coin, i) => tx.sign(i, coin.priv);

  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);

  return tx.build();
};

const bitcoinCashSigner = (selection) => {
  let network = constants.getNetwork(BitcoinCash);
  let hashType = BitcoinCash.Transaction.SIGHASH_ALL | BitcoinCash.Transaction.SIGHASH_BITCOINCASHBIP143;

  let tx = new BitcoinCash.TransactionBuilder(network);
  tx.enableBitcoinCash(true);

  let addInput = coin => tx.addInput(coin.txHash, coin.index, BitcoinCash.Transaction.DEFAULT_SEQUENCE, new Buffer(coin.script, 'hex'));
  let addOutput = coin => tx.addOutput(coin.address, coin.value);
  let sign = (coin, i) => tx.sign(i, coin.priv, null, hashType, coin.value);

  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);

  return tx.build();
};

const sign = curry((BitcoinLib, signingFunction, password, wallet, selection) => {
  const getPrivAcc = keypath => pathToKey(BitcoinLib, wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(BitcoinLib, wallet, password, address);
  const getKeys = isFromAccount(selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  return signingFunction(selectionWithKeys);
});

module.exports = {
  signBitcoin: sign(Bitcoin, bitcoinSigner),
  signBitcoinCash: sign(BitcoinCash, bitcoinCashSigner)
};
