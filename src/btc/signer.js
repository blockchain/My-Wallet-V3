const { curry, forEach, addIndex, lensProp, compose, over } = require('ramda');
const { mapped } = require('ramda-lens');
const Bitcoin = require('bitcoinjs-lib');
const constants = require('../constants');
const WalletCrypto = require('../wallet-crypto');
const Helpers = require('../helpers');
const KeyRing = require('../keyring');

const getKey = (priv, addr, bitcoin) => {
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
  console.log('getKeyForAddress', addr);
  if (addr != null) {
    const k = wallet.key(addr).priv;
    const privateKeyBase58 = password == null ? k
        : WalletCrypto.decryptSecretWithSecondPassword(k, password, wallet.sharedKey, wallet.pbkdf2_iterations);
    return getKey(privateKeyBase58, addr);
  }
};

const getXPRIV = (wallet, password, accountIndex) => {
  const account = wallet.hdwallet.accounts[accountIndex];
  return account.extendedPrivateKey == null || password == null
    ? account.extendedPrivateKey
    : WalletCrypto.decryptSecretWithSecondPassword(account.extendedPrivateKey, password, wallet.sharedKey, wallet.pbkdf2_iterations);
};

const pathToKey = (wallet, password, fullpath) => {
  if (fullpath != null) {
    const [idx, path] = fullpath.split('-');
    const xpriv = getXPRIV(wallet, password, idx);
    const keyring = new KeyRing(xpriv, undefined, Bitcoin);
    return keyring.privateKeyFromPath(path).keyPair;
  }
};

const signSelection = selection => {
  const network = constants.getNetwork(Bitcoin);
  const txBuilder = new Bitcoin.TransactionBuilder(network);
  const addInput = coin => txBuilder.addInput(coin.txHash, coin.index);
  const addOutput = coin => txBuilder.addOutput(coin.address || coin.script, coin.value);
  const sign = (coin, i) => { if (!coin.dust) { txBuilder.sign(i, coin.priv); } };
  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);
  return txBuilder;
};

const isFromAccount = (coinIndex, selection) => {
  return selection.inputs[coinIndex] ? selection.inputs[coinIndex].isFromAccount() : false;
};

const sign = curry((password, wallet, selection) => {
  const getPrivAcc = keypath => pathToKey(wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(wallet, password, address);
  const getKeys = isFromAccount(0, selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  const txBuilder = signSelection(selectionWithKeys);
  return txBuilder.build();
});

const signDust = curry((password, wallet, selection) => {
  const getPrivAcc = keypath => pathToKey(wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(wallet, password, address);
  const getKeys = isFromAccount(1, selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  const txBuilder = signSelection(selectionWithKeys);
  return txBuilder.buildIncomplete();
});

module.exports = {
  sign,
  signDust
};
