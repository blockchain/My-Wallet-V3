/* eslint-disable semi */
const EthAccount = require('../../src/eth/eth-account')
const EthWalletTx = require('../../src/eth/eth-wallet-tx')

describe('EthAccount', () => {
  const wallet = {
    getPrivateKey () {
      return Buffer.from('6858f113ba3bf55880105726c0d9f0495756321b45f821bc228fca2adacbb87b', 'hex')
    }
  }
  const ethWwallet = {
    sync () {
      return
    }
  }

  describe('instance', () => {
    let account
    beforeEach(() => {
      account = EthAccount.fromWallet(wallet, ethWwallet)
      account.label = 'Test Account'
    })

    describe('getters', () => {
      it('should have: address', () => {
        expect(account.address).toEqual('0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB')
      })

      it('should have: privateKey', () => {
        let accountWithPriv = new EthAccount({ priv: wallet.getPrivateKey() }, ethWwallet)
        expect(accountWithPriv.privateKey.toString('hex')).toEqual('6858f113ba3bf55880105726c0d9f0495756321b45f821bc228fca2adacbb87b')
      })

      it('should have: txs', () => {
        expect(account.txs).toEqual([])
      })

      it('should have: label', () => {
        expect(account.label).toEqual('Test Account')
      })

      it('should have: archived', () => {
        expect(account.archived).toEqual(false)
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
        expect(EthAccount.defaultLabel()).toEqual('Private Key Wallet')
      })

      it('should create a label for account at index 1', () => {
        expect(EthAccount.defaultLabel(1)).toEqual('Private Key Wallet 2')
      })
    })

    describe('.fromWallet()', () => {
      it('should create an EthAccount instance', () => {
        let account = EthAccount.fromWallet(wallet)
        expect(account.constructor).toEqual(EthAccount)
        expect(account.address).toEqual('0xD70073f72621FB90060Ac257f38cF2FF566Ea6bB')
      })
    })
  })
})
