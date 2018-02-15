/* eslint-disable semi */
const WebSocket = require('ws')
const EthSocket = require('../../src/eth/eth-socket');

describe('EthSocket', () => {
  const url = 'wss://ws.blockchain.info/eth/inv'
  const balanceResponse = JSON.stringify({ op: 'account_sub', account: '0xasdf', balance: '1000', nonce: 1, txHash: 'xyz', tx: { hash: 'xyz' } })
  const blockResponse = JSON.stringify({ op: 'block_sub', height: 123 })

  let account
  let ethWallet

  let mockAccount = (address) => ({
    address,
    setData () {},
    fetchTransaction () {},
    appendTransaction () { return { update () {} } },
    updateFromIncomingTx () {},
    isCorrectAddress (a) { return a === address }
  })

  beforeEach(() => {
    account = mockAccount('0xasdf')
    ethWallet = { setLatestBlock () {} }
  })

  describe('constructor', () => {
    it('should pass the url', () => {
      let socket = new EthSocket(url, WebSocket)
      expect(socket.url).toEqual(url)
    })
  })

  describe('instance', () => {
    let socket

    beforeEach(() => {
      socket = new EthSocket(url, WebSocket)
      spyOn(socket, 'send')
      spyOn(socket, 'on')
    })

    describe('.subscribeToAccount()', () => {
      it('should send an account sub message', () => {
        socket.subscribeToAccount(ethWallet, account)
        expect(socket.send).toHaveBeenCalledWith(EthSocket.accountSub(account))
      })

      it('should add a message handler', () => {
        socket.subscribeToAccount(ethWallet, account)
        expect(socket.on).toHaveBeenCalledWith('message', jasmine.any(Function))
      })
    })

    describe('.subscribeToBlocks()', () => {
      it('should send a block sub message', () => {
        socket.subscribeToBlocks()
        expect(socket.send).toHaveBeenCalledWith(EthSocket.blocksSub())
      })

      it('should add a message handler', () => {
        socket.subscribeToBlocks()
        expect(socket.on).toHaveBeenCalledWith('message', jasmine.any(Function))
      })
    })
  })

  describe('static', () => {
    describe('.accountMessageHandler()', () => {
      it('should call .setData on message', () => {
        let handler = EthSocket.accountMessageHandler(ethWallet, account)
        spyOn(account, 'updateFromIncomingTx')
        handler(balanceResponse)
        expect(account.updateFromIncomingTx).toHaveBeenCalledWith(jasmine.objectContaining(JSON.parse(balanceResponse).tx))
      })

      it('should call .appendTransaction with the tx object', () => {
        let handler = EthSocket.accountMessageHandler(ethWallet, account)
        spyOn(account, 'appendTransaction').and.callThrough()
        handler(balanceResponse)
        expect(account.appendTransaction).toHaveBeenCalledWith({ hash: 'xyz' })
      })

      it('should do nothing for non-balance message', () => {
        let handler = EthSocket.accountMessageHandler(ethWallet, account)
        spyOn(account, 'setData')
        handler(blockResponse)
        expect(account.setData).not.toHaveBeenCalled()
      })

      it('should do nothing when the message address does not match', () => {
        let handler = EthSocket.accountMessageHandler(ethWallet, account)
        spyOn(account, 'setData')
        handler(JSON.stringify({ op: 'account_sub', account: '0xfdsa' }))
        expect(account.setData).not.toHaveBeenCalled()
      })

      it('should reset the balance of a legacy address', () => {
        let legacyAccount = mockAccount('0xabcd')
        let handler = EthSocket.accountMessageHandler(ethWallet, account, legacyAccount)
        spyOn(legacyAccount, 'setData')
        handler(JSON.stringify({ op: 'account_sub', account: '0xasdf', tx: { from: '0xabcd' } }))
        expect(legacyAccount.setData).toHaveBeenCalledWith({ balance: '0' })
      })
    })

    describe('.blockMessageHandler()', () => {
      it('should call .setLatestBlock on message', () => {
        let handler = EthSocket.blockMessageHandler(ethWallet)
        spyOn(ethWallet, 'setLatestBlock')
        handler(blockResponse)
        expect(ethWallet.setLatestBlock).toHaveBeenCalledWith(123)
      })

      it('should do nothing for non-block messages', () => {
        let handler = EthSocket.blockMessageHandler(ethWallet)
        spyOn(ethWallet, 'setLatestBlock')
        handler(balanceResponse)
        expect(ethWallet.setLatestBlock).not.toHaveBeenCalled()
      })
    })

    describe('.accountSub()', () => {
      it('should produce the correct json', () => {
        expect(EthSocket.accountSub(account)).toEqual('{"op":"account_sub","account":"0xasdf"}')
      })
    })

    describe('.blocksSub()', () => {
      it('should produce the correct json', () => {
        expect(EthSocket.blocksSub()).toEqual('{"op":"block_sub"}')
      })
    })
  })
})
