const { curry, clamp, split, length } = require('ramda');
const Helpers = require('./helpers');

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

  type() {
    let type = 'P2PKH'
    try {
      const output = Bitcoin.address.toOutputScript(this.address)
      // eslint-disable-next-line
      let addr = null

      try {
        addr = Bitcoin.payments.p2pkh({ output }).address
        type = 'P2PKH'
      } catch (e) {}
      try {
        addr = Bitcoin.payments.p2sh({ output }).address
        type = 'P2SH'
      } catch (e) {}
      try {
        addr = Bitcoin.payments.p2wpkh({ output }).address
        type = 'P2WPKH'
      } catch (e) {}
      try {
        addr = Bitcoin.payments.p2wsh({ output }).address
        type = 'P2WSH'
      } catch (e) {}
    } catch (e) {}

    return type
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
      address: o.address ? o.address : Helpers.scriptToAddress(o.script)
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

Coin.IO_TYPES = {
  inputs: {
    P2PKH: 148, // legacy
    P2WPKH: 67.75 // native segwit
  },
  outputs: {
    P2PKH: 34,
    P2SH: 32,
    P2WPKH: 31,
    P2WSH: 43
  }
}

// Coin.inputBytes = (_input) => Coin.TX_INPUT_BASE + Coin.TX_INPUT_PUBKEYHASH;

// Coin.outputBytes = (_output) => Coin.TX_OUTPUT_BASE + Coin.TX_OUTPUT_PUBKEYHASH;

Coin.inputBytes = input => {
  return Coin.IO_TYPES.inputs[input.type ? input.type() : 'P2PKH']
}

Coin.outputBytes = output => {
  return Coin.IO_TYPES.outputs[output.type ? output.type() : 'P2PKH']
}

Coin.effectiveValue = curry((feePerByte, coin) =>
  clamp(0, Infinity, coin.value - feePerByte * Coin.inputBytes(coin))
);

Coin.getByteCount = (inputs, outputs) => {
  const VBYTES_PER_WEIGHT_UNIT = 4
  var vBytesTotal = 0
  var hasWitness = false
  var inputCount = 0
  var outputCount = 0
  // assumes compressed pubkeys in all cases.

  function checkUInt53(n) {
    if (n < 0 || n > Number.MAX_SAFE_INTEGER || n % 1 !== 0)
      throw new RangeError('value out of range')
  }

  function varIntLength(number) {
    checkUInt53(number)

    return number < 0xfd
      ? 1
      : number <= 0xffff
      ? 3
      : number <= 0xffffffff
      ? 5
      : 9
  }

  Object.keys(inputs).forEach(function(key) {
    checkUInt53(inputs[key])
    vBytesTotal += Coin.IO_TYPES.inputs[key] * inputs[key]
    inputCount += inputs[key]
    if (key.indexOf('W') >= 0) hasWitness = true
  })

  Object.keys(outputs).forEach(function(key) {
    checkUInt53(outputs[key])
    vBytesTotal += Coin.IO_TYPES.outputs[key] * outputs[key]
    outputCount += outputs[key]
  })

  // segwit marker + segwit flag + witness element count
  var overhead = hasWitness
    ? 0.25 + 0.25 + varIntLength(inputCount) / VBYTES_PER_WEIGHT_UNIT
    : 0

  overhead += 4 // nVersion
  overhead += varIntLength(inputCount)
  overhead += varIntLength(outputCount)
  overhead += 4 // nLockTime

  vBytesTotal += overhead
  return vBytesTotal
}

module.exports = Coin;
