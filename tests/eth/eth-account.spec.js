/* eslint-disable semi */
const EthAccount = require('../../src/eth/eth-account')
const EthTxBuilder = require('../../src/eth/eth-tx-builder')
const EthWalletTx = require('../../src/eth/eth-wallet-tx')

describe('EthAccount', () => {
  const wallet = {
    getPrivateKey () {
      return Buffer.from('6858f113ba3bf55880105726c0d9f0495756321b45f821bc228fca2adacbb87b', 'hex')
    }
  }

  describe('instance', () => {
    let account
    beforeEach(() => {
      account = EthAccount.fromWallet(wallet)
      account.label = 'Test Account'
    })

    describe('getters', () => {
      it('should have: address', () => {
        expect(account.address).toEqual('0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB')
      })

      it('should have: privateKey', () => {
        let accountWithPriv = new EthAccount({ priv: wallet.getPrivateKey() })
        expect(accountWithPriv.privateKey.toString('hex')).toEqual('6858f113ba3bf55880105726c0d9f0495756321b45f821bc228fca2adacbb87b')
      })

      it('should have: wei', () => {
        expect(account.wei.toString()).toEqual('0')
      })

      it('should have: balance', () => {
        expect(account.balance).toEqual('0')
      })

      it('should have: txs', () => {
        expect(account.txs).toEqual([])
      })

      it('should have: nonce', () => {
        expect(account.nonce).toEqual(0)
      })

      it('should have: label', () => {
        expect(account.label).toEqual('Test Account')
      })

      it('should have: archived', () => {
        expect(account.archived).toEqual(false)
      })
    })

    describe('.getApproximateBalance()', () => {
      it('should get the balance at 8 decimals', () => {
        account.setData({ balance: '12345678900000000' })
        expect(account.getApproximateBalance(8)).toEqual('0.01234568')
      })
    })

    describe('.createPayment()', () => {
      it('should create a new EthTxBuilder', () => {
        let payment = account.createPayment()
        expect(payment.constructor).toEqual(EthTxBuilder)
      })
    })

    describe('.setData()', () => {
      it('should set the account balance', () => {
        account.setData({ balance: '10000000000000000' })
        expect(account.balance).toEqual('0.01')
      })

      it('should set the account nonce', () => {
        account.setData({ nonce: 10 })
        expect(account.nonce).toEqual(10)
      })
    })

    describe('.setTransactions()', () => {
      it('should set the account transactions', () => {
        account.setTransactions({ txns: [{ hash: 'adsf' }] })
        expect(account.txs.length).toEqual(1)
        expect(account.txs[0].constructor).toEqual(EthWalletTx)
      })
    })

    describe('.updateTxs()', () => {
      it('should update each tx', () => {
        let ethWallet = { latestBlock: 125, getTxNote () {} }
        account.setTransactions({ txns: [{ hash: 'adsf' }] })
        spyOn(account.txs[0], 'update')
        account.updateTxs(ethWallet)
        expect(account.txs[0].update).toHaveBeenCalledWith(ethWallet)
      })
    })

    describe('.updateFromIncomingTx()', () => {
      it('should fetch account data if the tx is confirmed', () => {
        spyOn(account, 'fetchBalance')
        account.updateFromIncomingTx({ type: 'confirmed' })
        expect(account.balance).toEqual('0')
        expect(account.nonce).toEqual(0)
        expect(account.fetchBalance).toHaveBeenCalled()
      })

      it('should not adjust the balance and nonce if the tx is sent / pending', () => {
        account.setData({ nonce: 0, balance: '10000000000000000' })
        account.updateFromIncomingTx({ type: 'pending', value: '10000000000000000', from: '0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB' })
        expect(account.balance).toEqual('0.01')
        expect(account.nonce).toEqual(0)
      })

      it('should not adjust the balance and nonce if the tx is received / pending', () => {
        account.updateFromIncomingTx({ type: 'pending', value: '10000000000000000', to: '0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB', from: '0xasdf' })
        expect(account.balance).toEqual('0')
        expect(account.nonce).toEqual(0)
      })

      it('should do nothing if the type is not confirmed or pending', () => {
        spyOn(account, 'fetchBalance')
        account.updateFromIncomingTx({ type: 'contract' })
        expect(account.balance).toEqual('0')
        expect(account.nonce).toEqual(0)
        expect(account.fetchBalance).not.toHaveBeenCalled()
      })
    })

    describe('.toJSON()', () => {
      it('should serialize to json', () => {
        let expected = '{"label":"Test Account","archived":false,"correct":false,"addr":"0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB"}'
        expect(JSON.stringify(account)).toEqual(expected)
      })
    })

    describe('.isCorrectPrivateKey()', () => {
      it('should identify a correct private key', () => {
        let correct = wallet.getPrivateKey()
        expect(account.isCorrectPrivateKey(correct)).toEqual(true)
      })

      it('should identify an incorrect private key', () => {
        let incorrect = Buffer.from('6034edd08a4153c66e653829bdfcd2bcb3c49a16f2d10e4023676a9574879647', 'hex')
        expect(account.isCorrectPrivateKey(incorrect)).toEqual(false)
      })
    })
  })

  describe('static', () => {
    describe('.defaultLabel()', () => {
      it('should create a label', () => {
        expect(EthAccount.defaultLabel()).toEqual('My Ether Wallet')
      })

      it('should create a label for account at index 1', () => {
        expect(EthAccount.defaultLabel(1)).toEqual('My Ether Wallet 2')
      })
    })

    describe('.fromWallet()', () => {
      it('should create an EthAccount instance', () => {
        let account = EthAccount.fromWallet(wallet)
        expect(account.constructor).toEqual(EthAccount)
        expect(account.balance).toEqual('0')
        expect(account.nonce).toEqual(0)
        expect(account.address).toEqual('0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB')
      })
    })
  })
})
