const { curry, is, prop, lensProp, compose, assoc, over, map } = require('ramda');
const { mapped } = require('ramda-lens');
const API = require('../api');
const Coin = require('./coin.js');

// source can be a list of addresses, a single address or a single integer for account index 
const getUnspents = curry((wallet, source) => {
  switch (true) {
    case is(Number, source):
      const accIdx = wallet.hdwallet.accounts[source].extendedPublicKey
      return API.getUnspent([accIdx])
                .then(prop('unspent_outputs'))
                .then(over(compose(mapped, lensProp('xpub')), assoc('index', source)))
                .then(map(Coin.fromJS))
      break;
    case is(String, source):
      return API.getUnspent([source])
                .then(prop('unspent_outputs'))
                .then(over(mapped, assoc('priv', source)))
                .then(map(Coin.fromJS))
      break;
    case is(Array, source):
      // source it is supposed to be an array of legacy addresses for that case
      // return API.getUnspent(source)
      return Promise.reject('NOT_SUPPORTED_YET')
      // I am not sure how to mark each coin with its address (inspect script?)
      break;
    default:
      return Promise.reject('WRONG_SOURCE_FOR_UNSPENTS');
      break;
  }
})

module.exports = {
  getUnspents
};
