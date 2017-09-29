const { curry, clamp, split, length } = require('ramda');

class Coin {
  constructor (obj) {
    this.value = obj.value;
    this.script = obj.script;
    this.txHash = obj.txHash;
    this.index = obj.index;
    this.address = obj.address;
    this.priv = obj.priv;
    this.change = obj.change;
  }

  toString () {
    return `Coin(${this.value})`;
  }

  concat (coin) {
    return Coin.of(this.value + coin.value);
  }

  equals (coin) {
    return this.value === coin.value;
  }

  lte (coin) {
    return this.value <= coin.value;
  }

  ge (coin) {
    return this.value >= coin.value;
  }

  map (f) {
    return Coin.of(f(this.value));
  }

  isFromAccount () {
    return length(split('/', this.priv)) > 1;
  }

  isFromLegacy () {
    return !this.isFromAccount();
  }

  static descentSort (coinA, coinB) {
    return coinB.value - coinA.value;
  }

  static ascentSort (coinA, coinB) {
    return coinA.value - coinB.value;
  }

  static fromJS (o) {
    return new Coin({
      value: o.value,
      script: o.script,
      txHash: o.tx_hash_big_endian,
      index: o.tx_output_n,
      change: o.change || false,
      priv: o.priv || (o.xpub ? `${o.xpub.index}-${o.xpub.path}` : undefined),
      address: o.address
    });
  }

  static of (value) {
    return new Coin({ value });
  }
}

Coin.TX_EMPTY_SIZE = 4 + 1 + 1 + 4;
Coin.TX_INPUT_BASE = 32 + 4 + 1 + 4;
Coin.TX_INPUT_PUBKEYHASH = 106;
Coin.TX_OUTPUT_BASE = 8 + 1;
Coin.TX_OUTPUT_PUBKEYHASH = 25;

Coin.empty = Coin.of(0);

Coin.inputBytes = (_input) => Coin.TX_INPUT_BASE + Coin.TX_INPUT_PUBKEYHASH;

Coin.outputBytes = (_output) => Coin.TX_OUTPUT_BASE + Coin.TX_OUTPUT_PUBKEYHASH;

Coin.effectiveValue = curry((feePerByte, coin) =>
  clamp(0, Infinity, coin.value - feePerByte * Coin.inputBytes(coin))
);

module.exports = Coin;
