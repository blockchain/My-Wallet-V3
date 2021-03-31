const { curry, defaultTo, forEach, addIndex, lensProp, compose, over } = require('ramda');
const { mapped } = require('ramda-lens');
const Bitcoin = require('bitcoinjs-lib');
const BitcoinCash = require('bitcoinforksjs-lib');
const constants = require('./constants');
const WalletCrypto = require('./wallet-crypto');
const Helpers = require('./helpers');
const KeyRing = require('./keyring');
const KeyRingV4 = require('./keyring-v4');
const Coin = require('./coin');

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

const getXPRIV = (wallet, password, accountIndex, derivationType) => {
  const account = wallet.hdwallet.accounts[accountIndex].derivations.find((d) => d.type === derivationType);
  return account.xpriv == null || password == null
    ? account.xpriv
    : WalletCrypto.decryptSecretWithSecondPassword(account.xpriv, password, wallet.sharedKey, wallet.pbkdf2_iterations);
};

const pathToKeyBtc = (BitcoinLib, wallet, password, coin) => {
  const coinType = coin.type()
  const derivationType = coinType === 'P2PKH' ? 'legacy' : 'bech32'
  const [idx, path] = coin.priv.split('-');
  const xpriv = getXPRIV(wallet, password, idx, derivationType);
  const keyring = new KeyRingV4(xpriv, undefined, BitcoinLib, derivationType);
  return keyring.privateKeyFromPath(path);
};

const pathToKeyBch = (BitcoinLib, wallet, password, fullpath) => {
  const [idx, path] = fullpath.split('-');
  const xpriv = getXPRIV(wallet, password, idx, 'legacy');
  const keyring = new KeyRing(xpriv, undefined, BitcoinLib);
  return keyring.privateKeyFromPath(path).keyPair;
};

const isFromAccount = (selection) => {
  return selection.inputs[0] ? selection.inputs[0].isFromAccount() : false;
};

const bitcoinSigner = (selection) => {
  const network = constants.getNetwork(Bitcoin);
  const tx = new Bitcoin.TransactionBuilder(network)

  const addOutput = coin =>
    tx.addOutput(defaultTo(coin.address, coin.script), coin.value)
  const addInput = coin => {
    switch (coin.type()) {
      case 'P2WPKH':
        return tx.addInput(
          coin.txHash,
          coin.index,
          0xffffffff,
          Helpers.getOutputScript(coin.priv)
        )
      default:
        return tx.addInput(coin.txHash, coin.index)
    }
  }
  const sign = (coin, i) => {
    switch (coin.type()) {
      case 'P2WPKH':
        return tx.sign(i, coin.priv, null, null, coin.value)
      default:
        return tx.sign(i, coin.priv)
    }
  }

  forEach(addInput, selection.inputs)
  forEach(addOutput, selection.outputs)
  addIndex(forEach)(sign, selection.inputs)
  const signedTx = tx.build()
  return signedTx
};

const bitcoinCashSigner = (selection, coinDust) => {
  let network = constants.getNetwork(BitcoinCash);
  let hashType = BitcoinCash.Transaction.SIGHASH_ALL | BitcoinCash.Transaction.SIGHASH_BITCOINCASHBIP143;

  let tx = new BitcoinCash.TransactionBuilder(network);
  tx.enableBitcoinCash(true);

  let addInput = coin => tx.addInput(coin.txHash, coin.index, BitcoinCash.Transaction.DEFAULT_SEQUENCE, new Buffer(coin.script, 'hex'));
  let addOutput = coin => tx.addOutput(coin.address, coin.value);
  let sign = (coin, i) => tx.sign(i, coin.priv, null, hashType, coin.value);

  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  tx.addInput(
    coinDust.txHash,
    coinDust.index,
    BitcoinCash.Transaction.DEFAULT_SEQUENCE
  )
  tx.addOutput(coinDust.address, coinDust.value)
  addIndex(forEach)(sign, selection.inputs);

  return tx.buildIncomplete();
};

const signBtc = curry((BitcoinLib, signingFunction, password, wallet, selection, coinDust) => {
  const getPrivAccBtc = coin => pathToKeyBtc(BitcoinLib, wallet, password, coin);
  const getPrivAddr = address => getKeyForAddress(BitcoinLib, wallet, password, address);
  const getKeys = isFromAccount(selection) ? getPrivAccBtc : getPrivAddr;
  const inputsWithKeys = selection.inputs.map((input) => new Coin({
    ...input,
    priv: getKeys(input)
  }));
  return signingFunction({ ...selection, inputs: inputsWithKeys });
});

const signBch = curry((BitcoinLib, signingFunction, password, wallet, selection, coinDust) => {
  const getPrivAcc = keypath => pathToKeyBch(BitcoinLib, wallet, password, keypath);
  const getPrivAddr = address => getKeyForAddress(BitcoinLib, wallet, password, address);
  const getKeys = isFromAccount(selection) ? getPrivAcc : getPrivAddr;
  const selectionWithKeys = over(compose(lensProp('inputs'), mapped, lensProp('priv')), getKeys, selection);
  return signingFunction(selectionWithKeys, coinDust);
});

module.exports = {
  signBitcoin: signBtc(Bitcoin, bitcoinSigner),
  signBitcoinCash: signBch(BitcoinCash, bitcoinCashSigner)
};
