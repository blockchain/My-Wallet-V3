/* eslint-disable semi */
const { curry, is, prop, lensProp, compose, assoc, over, map } = require('ramda');
const { mapped } = require('ramda-lens');
const API = require('../api');
const Coin = require('./coin.js');
const Bitcoin = require('bitcoinjs-lib');
const constants = require('../constants');


const scriptToAddress = coin => {
  const scriptBuffer = Buffer(coin.script, 'hex');
  const address = Bitcoin.address.fromOutputScript(scriptBuffer, constants.getNetwork()).toString();
  return assoc('priv', address, coin)
}

// source can be a list of legacy addresses or a single integer for account index
const getUnspents = curry((wallet, source) => {
  switch (true) {
    case is(Number, source):
      const accIdx = wallet.hdwallet.accounts[source].extendedPublicKey
      return API.getUnspent([accIdx])
                .then(prop('unspent_outputs'))
                .then(over(compose(mapped, lensProp('xpub')), assoc('index', source)))
                .then(map(Coin.fromJS));
    case is(Array, source):
      return API.getUnspent(source)
                .then(prop('unspent_outputs'))
                .then(over(mapped, scriptToAddress))
                .then(map(Coin.fromJS));
    default:
      return Promise.reject('WRONG_SOURCE_FOR_UNSPENTS');
  }
})

module.exports = {
  getUnspents
};
