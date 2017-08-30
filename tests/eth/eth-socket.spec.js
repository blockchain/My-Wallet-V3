/* eslint-disable semi */
const EthSocket = require('../../src/eth/eth-socket');

describe('EthSocket', () => {
  const url = 'wss://ws.blockchain.info/eth/inv'
  const balanceResponse = JSON.stringify({ op: 'account_sub', account: '0xasdf', balance: '1000', nonce: 1, txHash: 'xyz' })
  const blockResponse = JSON.stringify({ op: 'block_sub', height: 123 })

  let account
  let ethWallet

  beforeEach(() => {
    account = { address: '0xasdf', setData () {}, fetchTransaction () {} }
    ethWallet = { setLatestBlock () {} }
  })

  describe('constructor', () => {
    it('should pass the url', () => {
      let socket = new EthSocket(url)
      expect(socket.url).toEqual(url)
    })
  })

  describe('instance', () => {
    let socket

    beforeEach(() => {
      socket = new EthSocket(url)
      spyOn(socket, 'send')
      spyOn(socket, 'on')
    })

    describe('.subscribeToAccount()', () => {
      it('should send an account sub message', () => {
        socket.subscribeToAccount(account)
        expect(socket.send).toHaveBeenCalledWith(EthSocket.accountSub(account))
      })

      it('should add a message handler', () => {
        socket.subscribeToAccount(account)
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
        let handler = EthSocket.accountMessageHandler(account)
        spyOn(account, 'setData')
        handler(balanceResponse)
        expect(account.setData).toHaveBeenCalledWith(jasmine.objectContaining({ balance: '1000', nonce: 1 }))
      })

      it('should call .fetchTransaction on message', () => {
        let handler = EthSocket.accountMessageHandler(account)
        spyOn(account, 'fetchTransaction')
        handler(balanceResponse)
        expect(account.fetchTransaction).toHaveBeenCalledWith('xyz')
      })

      it('should do nothing for non-balance message', () => {
        let handler = EthSocket.accountMessageHandler(account)
        spyOn(account, 'setData')
        handler(blockResponse)
        expect(account.setData).not.toHaveBeenCalled()
      })

      it('should do nothing when the message address does not match', () => {
        let handler = EthSocket.accountMessageHandler(account)
        spyOn(account, 'setData')
        handler(JSON.stringify({ op: 'account_sub', account: '0xfdsa' }))
        expect(account.setData).not.toHaveBeenCalled()
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
