const { curry, forEach, addIndex } = require('ramda');
const Bitcoin = require('bitcoincashjs-lib');

const signSelection = curry((network, selection) => {
  let tx = new Bitcoin.TransactionBuilder(network);
  let addInput = coin => tx.addInput(coin.txHash, coin.index);
  let addOutput = coin => tx.addOutput(coin.address, coin.value);
  let sign = (coin, i) => tx.sign(i, coin.priv);
  tx.enableBitcoinCash(true);
  forEach(addInput, selection.inputs);
  forEach(addOutput, selection.outputs);
  addIndex(forEach)(sign, selection.inputs);
  return tx.build().toHex();
});

module.exports = {
  signSelection
};
