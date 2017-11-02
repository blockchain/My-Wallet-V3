const { curry, forEach, addIndex, lensProp, compose, over, assoc } = require('ramda');
const { mapped } = require('ramda-lens');
const Bitcoin = require('bitcoinjs-lib');
const constants = require('../constants');
const WalletCrypto = require('../wallet-crypto');
const Helpers = require('../helpers');
const KeyRing = require('../keyring');
const Coin = require('../bch/coin.js');

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

const addressToOutputScript = (coin) => {
  console.log('addresstooutput', coin)
  if (coin.address) {
    console.log('inside')
    const scriptPubKey = Bitcoin.address.toOutputScript(coin.address);
    console.log(scriptPubKey)
    console.log(assoc('script', scriptPubKey, coin))
    console.log(Coin.fromCoin(assoc('script', scriptPubKey, coin)))
    return Coin.fromCoin(assoc('script', scriptPubKey, coin));
  } else {
    return coin;
  };
};

const sortBIP69 = txBuilder => {
  const compareInputs = (a, b) => {
    var hasha = new Buffer(a.hash);
    var hashb = new Buffer(b.hash);
    var x = [].reverse.call(hasha);
    var y = [].reverse.call(hashb);
    return x.compare(y) || a.index - b.index;
  };
  const compareOutputs = (a, b) => (a.value - b.value) || (a.script).compare(b.script);
  txBuilder.tx.ins.sort(compareInputs);
  txBuilder.tx.outs.sort(compareOutputs);
};

const signSelection = selection => {
  const network = constants.getNetwork(Bitcoin);
  const txBuilder = new Bitcoin.TransactionBuilder(network);
  const addInput = coin => txBuilder.addInput(coin.txHash, coin.index);
  const addOutput = coin => txBuilder.addOutput(coin.address, coin.value);
  const sign = (coin, i) => txBuilder.sign(i, coin.priv);
  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  sortBIP69(txBuilder)
  addIndex(forEach)(sign, selection.inputs);  
  return txBuilder.build();
};

const sign = curry((password, wallet, selection) => {
  const getPrivAcc = keypath => pathToKey(wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(wallet, password, address);
  const getKeys = isFromAccount(selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  const finalSelection = over(lensProp('outputs'), addressToOutputScript, selectionWithKeys);
  console.log(finalSelection);
  console.log('--------------------------------------')
  return signSelection(finalSelection);
});


module.exports = {
  sign
};
