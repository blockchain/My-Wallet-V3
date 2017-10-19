/* eslint-disable semi */
let { compose, map } = require('ramda')
let Wallet = require('../../src/blockchain-wallet')
let { addIndexToOutput } = require('../../src/bch/bch-api')
let signer = require('../../src/bch/signer')
let Coin = require('../../src/bch/coin')
let cs = require('../../src/bch/coin-selection')
let signingData = require('../__data__/signing-data.json')

describe('Signer', () => {
  let wallet = new Wallet(signingData.wallet)
  let inputToCoin = compose(Coin.fromJS, addIndexToOutput(wallet.hdwallet))
  let selection = cs.selectAll(55, map(inputToCoin, signingData.unspent_outputs), '1HV9RPcPAwcCEDmNET5BEWvVVgCY3Pbg7i')

  it('should sign a bch transaction', () => {
    let tx = signer.sign(void 0, wallet, selection)
    expect(tx.toHex()).toEqual(signingData.tx_hex)
  })
})
