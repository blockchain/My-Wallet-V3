const { curry, unfold, reduce, last, filter, head, map, isNil, isEmpty, tail, clamp, sort } = require('ramda');
const Coin = require('./coin.js');

const fold = curry((empty, xs) => reduce((acc, x) => acc.concat(x), empty, xs));
const foldCoins = fold(Coin.empty);

const dustThreshold = (feeRate) => (Coin.inputBytes({}) + Coin.outputBytes({})) * feeRate;

const transactionBytes = (inputs, outputs) =>
  Coin.TX_EMPTY_SIZE + inputs.reduce((a, c) => a + Coin.inputBytes(c), 0) + outputs.reduce((a, c) => a + Coin.outputBytes(c), 0);

const effectiveBalance = curry((feePerByte, inputs, outputs = [{}]) =>
  foldCoins(inputs).map(v =>
    clamp(0, Infinity, v - transactionBytes(inputs, outputs) * feePerByte))
);

// findTarget :: [Coin] -> Number -> [Coin] -> String -> Selection
const findTarget = (targets, feePerByte, coins, changeAddress) => {
  let target = foldCoins(targets).value;
  let _findTarget = seed => {
    let acc = seed[0];
    let newCoin = head(seed[2]);
    if (isNil(newCoin) || acc > target + seed[1]) { return false; }
    let partialFee = seed[1] + Coin.inputBytes(newCoin) * feePerByte;
    let restCoins = tail(seed[2]);
    let nextAcc = acc + newCoin.value;
    return acc > target + partialFee ? false : [[nextAcc, partialFee, newCoin], [nextAcc, partialFee, restCoins]];
  };
  let partialFee = transactionBytes([], targets) * feePerByte;
  let effectiveCoins = filter(c => Coin.effectiveValue(feePerByte, c) > 0, coins);
  let selection = unfold(_findTarget, [0, partialFee, effectiveCoins]);
  if (isEmpty(selection)) {
    // no coins to select
    return { fee: 0, inputs: [], outputs: [] };
  } else {
    let maxBalance = last(selection)[0];
    let fee = last(selection)[1];
    let selectedCoins = map(e => e[2], selection);
    if (maxBalance < target + fee) {
      // not enough money to satisfy target
      return { fee: fee, inputs: [], outputs: targets };
    } else {
      let extra = maxBalance - target - fee;
      if (extra >= dustThreshold(feePerByte)) {
        // add change
        let change = Coin.fromJS({ value: extra, address: changeAddress, change: true });
        return { fee: fee, inputs: selectedCoins, outputs: [...targets, change] };
      } else {
        // burn change
        return { fee: fee + extra, inputs: selectedCoins, outputs: targets };
      }
    }
  }
};

// selectAll :: Number -> [Coin] -> String -> Selection
const selectAll = (feePerByte, coins, outAddress) => {
  let effectiveCoins = filter(c => Coin.effectiveValue(feePerByte, c) > 0, coins);
  let effBalance = effectiveBalance(feePerByte, effectiveCoins).value;
  let balance = foldCoins(effectiveCoins).value;
  let fee = balance - effBalance;
  return {
    fee,
    inputs: effectiveCoins,
    outputs: [Coin.fromJS({ value: effBalance, address: outAddress })]
  };
};

// descentDraw :: [Coin] -> Number -> [Coin] -> String -> Selection
const descentDraw = (targets, feePerByte, coins, changeAddress) =>
  findTarget(targets, feePerByte, sort(Coin.descentSort, coins), changeAddress);

// ascentDraw :: [Coin] -> Number -> [Coin] -> String -> Selection
const ascentDraw = (targets, feePerByte, coins, changeAddress) =>
  findTarget(targets, feePerByte, sort(Coin.ascentSort, coins), changeAddress);

module.exports = {
  dustThreshold,
  transactionBytes,
  effectiveBalance,
  findTarget,
  selectAll,
  descentDraw,
  ascentDraw
};
