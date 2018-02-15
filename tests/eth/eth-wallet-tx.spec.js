/* eslint-disable semi */
const EthWalletTx = require('../../src/eth/eth-wallet-tx')

describe('EthWalletTx', () => {
  const txData = {
    'blockNumber': 123,
    'timeStamp': 1500000000,
    'hash': '0xfdsa',
    'from': '0xasdf1',
    'to': '0xasdf2',
    'value': '10000000000000000',
    'gas': 21000,
    'gasPrice': 21000000000,
    'gasUsed': 21000
  }

  const mockAccount = (addr) => ({
    isCorrectAddress (a) {
      return a === addr
    }
  })

  describe('instance', () => {
    let tx
    beforeEach(() => {
      tx = EthWalletTx.fromJSON(txData)
    })

    describe('getters', () => {
      it('should have: amount', () => {
        expect(tx.amount).toEqual('0.01')
      })

      it('should have: fee', () => {
        expect(tx.fee).toEqual('0.000441')
      })

      it('should have: to', () => {
        expect(tx.to).toEqual('0xasdf2')
      })

      it('should have: from', () => {
        expect(tx.from).toEqual('0xasdf1')
      })

      it('should have: hash', () => {
        expect(tx.hash).toEqual('0xfdsa')
      })

      it('should have: time', () => {
        expect(tx.time).toEqual(1500000000)
      })

      it('should have: confirmations', () => {
        expect(tx.confirmations).toEqual(0)
      })

      it('should have: note', () => {
        expect(tx.note).toEqual(null)
      })
    })

    describe('.getTxType()', () => {
      it('should identify a received tx', () => {
        let account = mockAccount('0xasdf2')
        expect(tx.getTxType(account)).toEqual('received')
      })

      it('should identify a sent tx', () => {
        let account = mockAccount('0xasdf1')
        expect(tx.getTxType(account)).toEqual('sent')
      })

      it('should return null if neither sent or received', () => {
        let account = mockAccount('0xasdf3')
        expect(tx.getTxType(account)).toEqual(null)
      })
    })

    describe('.isToAccount()', () => {
      it('should be true if tx is to account', () => {
        let account = mockAccount('0xasdf2')
        expect(tx.isToAccount(account)).toEqual(true)
      })

      it('should be false if tx is not to account', () => {
        let account = mockAccount('0xasdf1')
        expect(tx.isToAccount(account)).toEqual(false)
      })
    })

    describe('.isFromAccount()', () => {
      it('should be true if tx is from account', () => {
        let account = mockAccount('0xasdf1')
        expect(tx.isFromAccount(account)).toEqual(true)
      })

      it('should be false if tx is not from account', () => {
        let account = mockAccount('0xasdf2')
        expect(tx.isFromAccount(account)).toEqual(false)
      })
    })

    describe('.update()', () => {
      it('should update the confirmations', () => {
        let ethWallet = { latestBlock: 125, getTxNote () {} }
        tx.update(ethWallet)
        expect(tx.confirmations).toEqual(3)
      })

      it('should not set confirmations to less than 0', () => {
        let ethWallet = { latestBlock: 100, getTxNote () {} }
        tx.update(ethWallet)
        expect(tx.confirmations).toEqual(0)
      })

      it('should set the tx note', () => {
        let ethWallet = { latestBlock: 100, getTxNote () {} }
        spyOn(ethWallet, 'getTxNote').and.returnValue('note')
        tx.update(ethWallet)
        expect(tx.note).toEqual('note')
        expect(ethWallet.getTxNote).toHaveBeenCalledWith(tx.hash)
      })
    })
  })

  describe('static', () => {
    describe('.txTimeSort()', () => {
      it('should sort transactions by time', () => {
        let txs = [{ time: 3 }, { time: 4 }, { time: 1 }, { time: 2 }]
        txs.sort(EthWalletTx.txTimeSort)
        expect(txs.map(tx => tx.time)).toEqual([4, 3, 2, 1])
      })
    })

    describe('.fromJSON', () => {
      it('should create a new EthWalletTx from json', () => {
        let tx = EthWalletTx.fromJSON(txData)
        expect(tx.constructor).toEqual(EthWalletTx)
      })
    })
  })
})
