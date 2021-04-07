/* eslint-disable semi */
let { map } = require('ramda')
let cs = require('../src/coin-selection')
let Coin = require('../src/coin')

describe('Coin Selection', () => {
  const legacyInput = { type: () => 'P2PKH' }
  const legacyOutput = { type: () => 'P2PKH' }
  const segwitInput = { type: () => 'P2WPKH' }
  const segwitOutput = { type: () => 'P2WPKH' }

  describe('0x0 transactions', () => {
    it('should return the right transaction size (empty tx)', () => {
      // No witness => 10 vbytes
      expect(cs.transactionBytes([], [])).toEqual(10)
    })
  })

  describe('1x1 transactions', () => {
    it('should return the right transaction size (1 P2PKH, 1 P2PKH)', () => {
      // 10 + 148 + 34 = 192
      expect(cs.transactionBytes([legacyInput], [legacyOutput])).toEqual(192)
    })
    it('should return the right transaction size (1 P2PKH, 1 P2WPKH)', () => {
      // 10 + 148 + 31 = 189
      expect(cs.transactionBytes([legacyInput], [segwitOutput])).toEqual(189)
    })
    it('should return the right transaction size (1 P2WPKH, 1 P2PKH)', () => {
      // 10.75 + 67.75 + 34 = 112.5
      expect(cs.transactionBytes([segwitInput], [legacyOutput])).toEqual(
        112.5
      )
    })
    it('should return the right transaction size (1 P2WPKH, 1 P2WPKH)', () => {
      // 10.75 + 67.75 + 31 = 109.5
      expect(cs.transactionBytes([segwitInput], [segwitOutput])).toEqual(
        109.5
      )
    })
  })

  describe('1x2 transactions', () => {
    it('should return the right transaction size (1 P2PKH, 2 P2PKH)', () => {
      // 10 + 148 + 34*2 = 226
      expect(
        cs.transactionBytes([legacyInput], [legacyOutput, legacyOutput])
      ).toEqual(226)
    })
    it('should return the right transaction size (1 P2PKH, 2 P2WPKH)', () => {
      // 10 + 148 + 31*2 = 220
      expect(
        cs.transactionBytes([legacyInput], [segwitOutput, segwitOutput])
      ).toEqual(220)
    })
    it('should return the right transaction size (1 P2PKH, 1 P2PKH + 1 P2WPKH)', () => {
      // 10 + 148 + 31 + 34 = 223
      expect(
        cs.transactionBytes([legacyInput], [legacyOutput, segwitOutput])
      ).toEqual(223)
    })
    it('should return the right transaction size (1 P2WPKH, 2 P2PKH)', () => {
      // 10.75 + 67.75 + 34*2 = 146.5
      expect(
        cs.transactionBytes([segwitInput], [legacyOutput, legacyOutput])
      ).toEqual(146.5)
    })
    it('should return the right transaction size (1 P2WPKH, 2 P2WPKH)', () => {
      // 10.75 + 67.75 + 31*2 = 140.5
      expect(
        cs.transactionBytes([segwitInput], [segwitOutput, segwitOutput])
      ).toEqual(140.5)
    })
    it('should return the right transaction size (1 P2WPKH, 1 P2PKH + 1 P2WPKH)', () => {
      // 10.75 + 67.75 + 31 + 34 = 143.5
      expect(
        cs.transactionBytes([segwitInput], [legacyOutput, segwitOutput])
      ).toEqual(143.5)
    })
  })

  describe('2x1 transactions', () => {
    it('should return the right transaction size (2 P2PKH, 1 P2PKH)', () => {
      // 10 + 148*2 + 34 = 340
      expect(
        cs.transactionBytes([legacyInput, legacyInput], [legacyOutput])
      ).toEqual(340)
    })
    it('should return the right transaction size (2 P2PKH, 1 P2WPKH)', () => {
      // 10 + 148*2 + 31 = 337
      expect(
        cs.transactionBytes([legacyInput, legacyInput], [segwitOutput])
      ).toEqual(337)
    })
    it('should return the right transaction size (1 P2PKH + P2WPKH, 1 P2PKH)', () => {
      // 10.75 + 67.75 + 148 + 34 = 260.5
      expect(
        cs.transactionBytes([legacyInput, segwitInput], [legacyOutput])
      ).toEqual(260.5)
    })
    it('should return the right transaction size (2 P2WPKH, 1 P2PKH)', () => {
      // 10.75 + 67.75*2 + 34 = 180.25
      expect(
        cs.transactionBytes([segwitInput, segwitInput], [legacyOutput])
      ).toEqual(180.25)
    })
    it('should return the right transaction size (2 P2WPKH, 1 P2WPKH)', () => {
      // 10.75 + 67.75*2 + 31 = 177.25
      expect(
        cs.transactionBytes([segwitInput, segwitInput], [segwitOutput])
      ).toEqual(177.25)
    })
    it('should return the right transaction size (1 P2PKH + 1 P2WPKH, 1 P2WPKH)', () => {
      // 10.75 + 67.75 + 148 + 31 = 257.5
      expect(
        cs.transactionBytes([legacyInput, segwitInput], [segwitOutput])
      ).toEqual(257.5)
    })
  })

  describe('2x2 transactions', () => {
    it('should return the right transaction size (2 P2PKH, 2 P2PKH)', () => {
      // 10 + 148*2 + 34*2 = 374
      expect(
        cs.transactionBytes(
          [legacyInput, legacyInput],
          [legacyOutput, legacyOutput]
        )
      ).toEqual(374)
    })
    it('should return the right transaction size (2 P2PKH, 2 P2WPKH)', () => {
      // 10 + 148*2 + 31*2 = 368
      expect(
        cs.transactionBytes(
          [legacyInput, legacyInput],
          [segwitOutput, segwitOutput]
        )
      ).toEqual(368)
    })
    it('should return the right transaction size (1 P2PKH + 1 P2WPKH, 2 P2PKH)', () => {
      // 10.75 + 148 + 67.75 + 34*2 = 294.5
      expect(
        cs.transactionBytes(
          [legacyInput, segwitInput],
          [legacyOutput, legacyOutput]
        )
      ).toEqual(294.5)
    })
    it('should return the right transaction size (2 P2PKH, 1 P2PKH + 1 P2WPKH)', () => {
      // 10 + 148*2 + 31 + 34 = 371
      expect(
        cs.transactionBytes(
          [legacyInput, legacyInput],
          [legacyOutput, segwitOutput]
        )
      ).toEqual(371)
    })
    it('should return the right transaction size (1 P2PKH + 1 P2PWKH, 1 P2PKH + 1 P2WPKH)', () => {
      // 10.75 + 67.75 + 148 + 31 + 34 = 291.5
      expect(
        cs.transactionBytes(
          [legacyInput, segwitInput],
          [legacyOutput, segwitOutput]
        )
      ).toEqual(291.5)
    })
    it('should return the right transaction size (2 P2WPKH, 2 P2PKH)', () => {
      // 10.75 + 67.75*2 + 34*2 = 214.25
      expect(
        cs.transactionBytes(
          [segwitInput, segwitInput],
          [legacyOutput, legacyOutput]
        )
      ).toEqual(214.25)
    })
    it('should return the right transaction size (2 P2WPKH, 2 P2WPKH)', () => {
      // 10.75 + 67.75*2 + 31*2 = 208.25
      expect(
        cs.transactionBytes(
          [segwitInput, segwitInput],
          [segwitOutput, segwitOutput]
        )
      ).toEqual(208.25)
    })
    it('should return the right transaction size (2 P2WPKH, 1 P2PKH + 1 P2WPKH)', () => {
      // 10.75 + 67.75*2 + 31 + 34 = 211.25
      expect(
        cs.transactionBytes(
          [segwitInput, segwitInput],
          [legacyOutput, segwitOutput]
        )
      ).toEqual(211.25)
    })
    it('should return the right transaction size (1 P2PKH + 1 P2WPKH, 2 P2WPKH)', () => {
      // 10.75 + 67.75 + 148 + 31*2 = 288.5
      expect(
        cs.transactionBytes(
          [legacyInput, segwitInput],
          [segwitOutput, segwitOutput]
        )
      ).toEqual(288.5)
    })
  })

  describe('effective Balances', () => {
    it('should return the right effective max Balance', () => {
      let inputs = map(Coin.of, [15000, 10000, 20000])
      let outputs = map(Coin.of, [0, 0])
      expect(cs.effectiveBalance(0, inputs, outputs).value).toEqual(45000)
    })
    it('should return the right effective max Balance', () => {
      let inputs = map(Coin.of, [15000, 10000, 20000])
      let outputs = map(Coin.of, [0, 0])
      expect(cs.effectiveBalance(55, inputs, outputs).value).toEqual(16455)
    })
    it('should return the right effective max Balance', () => {
      expect(cs.effectiveBalance(55, [], []).value).toEqual(0)
    })
    it('should return the right effective max Balance', () => {
      expect(cs.effectiveBalance(0, [], []).value).toEqual(0)
    })
  })

  describe('findTarget', () => {
    it('should return the right selection', () => {
      let selection = cs.findTarget([], 0, [])
      expect(selection.fee).toEqual(0)
      expect(selection.inputs).toEqual([])
      expect(selection.outputs).toEqual([])
    })
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [1, 2, 3])
      let targets = map(Coin.of, [10000])
      let selection = cs.findTarget(targets, 0, inputs)
      expect(selection.fee).toEqual(0)
      expect(selection.inputs).toEqual([])
      expect(selection.outputs).toEqual(targets)
    })
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [1, 20000, 300000])
      let targets = map(Coin.of, [10000])
      let selection = cs.findTarget(targets, 55, inputs)
      expect(selection.fee).toEqual(18590)
      expect(selection.inputs.map(x => x.value)).toEqual([20000, 300000])
      expect(selection.outputs.map(x => x.value)).toEqual([10000, 291410])
    })
  })

  describe('selectAll', () => {
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [1, 20000, 0, 0, 300000])
      let selection = cs.selectAll(55, inputs)
      expect(selection.fee).toEqual(18590)
      expect(selection.inputs.map(x => x.value)).toEqual([20000, 300000])
      expect(selection.outputs.map(x => x.value)).toEqual([301410])
    })
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [])
      let selection = cs.selectAll(55, inputs)
      expect(selection.fee).toEqual(0)
      expect(selection.inputs.map(x => x.value)).toEqual([])
      expect(selection.outputs.map(x => x.value)).toEqual([0])
    })
  })

  describe('descentDraw', () => {
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [1, 20000, 0, 0, 300000, 50000, 30000])
      let targets = map(Coin.of, [100000])
      let selection = cs.descentDraw(targets, 55, inputs, 'change-address')
      expect(selection.fee).toEqual(10505)
      expect(selection.inputs.map(x => x.value)).toEqual([300000])
      expect(selection.outputs.map(x => x.value)).toEqual([100000, 189495])
    })
  })

  describe('ascentDraw', () => {
    it('should return the right selection', () => {
      let inputs = map(Coin.of, [1, 20000, 0, 0, 300000, 50000, 30000])
      let targets = map(Coin.of, [100000])
      let selection = cs.ascentDraw(targets, 55, inputs, 'change-address')
      expect(selection.fee).toEqual(34760)
      expect(selection.inputs.map(x => x.value)).toEqual([20000, 30000, 50000, 300000])
      expect(selection.outputs.map(x => x.value)).toEqual([100000, 265240])
    })
  })
})
