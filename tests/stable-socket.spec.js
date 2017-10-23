/* eslint-disable semi */
describe('StableSocket', () => {
  let WebSocket = require('./__mocks__/ws.mock')
  let StableSocket = require('../src/stable-socket')
  let Helpers = require('../src/helpers')

  describe('instance', () => {
    let ws
    let createSocket = (url) => new WebSocket(url)

    beforeEach(() => {
      jasmine.clock().uninstall()
      jasmine.clock().install()
      ws = new StableSocket('wss://ws.bc.info')
      spyOn(Helpers, 'tor').and.returnValue(false)
      spyOn(ws, 'createSocket').and.callFake(createSocket)
    })

    describe('constructor()', () => {
      it('should have a URL', () => {
        expect(ws.wsUrl).toBeDefined()
        expect(ws.wsUrl).toEqual('wss://ws.bc.info')
      })
    })

    describe('getters', () => {
      beforeEach(() => {
        ws.connect()
      })

      it('should have: url', () => {
        expect(ws.url).toEqual('wss://ws.bc.info')
      })

      it('should have: isConnecting', () => {
        ws._socket.readyState = 0
        expect(ws.isConnecting).toEqual(true)
      })

      it('should have: isOpen', () => {
        ws._socket.readyState = 1
        expect(ws.isOpen).toEqual(true)
      })

      it('should have: isClosing', () => {
        ws._socket.readyState = 2
        expect(ws.isClosing).toEqual(true)
      })

      it('should have: isClosed', () => {
        ws._socket.readyState = 3
        expect(ws.isClosed).toEqual(true)
      })
    })

    describe('connect()', () => {
      beforeEach(() => {
      })

      afterEach(() => {
      })

      it('should open a socket', () => {
        ws.connect()
        expect(ws.createSocket).toHaveBeenCalled()
        expect(ws._socket).toBeDefined()
        expect(ws._socket.url).toEqual('wss://ws.bc.info')
      })

      it('should set the ping interval', () => {
        spyOn(ws, 'ping')
        ws.connect()
        expect(ws._pingIntervalPID).toBeDefined()
        expect(ws.ping).not.toHaveBeenCalled()
        jasmine.clock().tick(15000)
        expect(ws.ping).toHaveBeenCalled()
      })

      it('should set up event listeners', () => {
        ws.connect()
        expect(ws._socket.on).toHaveBeenCalledTimes(3)
        expect(ws._socket.on).toHaveBeenCalledWith('open', jasmine.any(Function))
        expect(ws._socket.on).toHaveBeenCalledWith('message', jasmine.any(Function))
        expect(ws._socket.on).toHaveBeenCalledWith('close', jasmine.any(Function))
      })

      describe('on TOR', () => {
        beforeEach(() => {
          Helpers.tor.and.returnValue(true)
        })

        it('should not open a socket', () => {
          ws.connect()
          expect(ws._socket).not.toBeDefined()
        })
      })
    })

    describe('send()', () => {
      let message = JSON.stringify({ 'op': 'addr_sub', 'addr': '1btc' })

      it('should pass the message on to the socket', () => {
        ws.connect()
        spyOn(ws._socket, 'send')
        ws.send(message)
        expect(ws._socket.send).toHaveBeenCalledWith(message)
      })

      it('should delay sending until socket is open', () => {
        ws.connect()
        spyOn(ws._socket, 'send')
        ws._socket.readyState = 0
        ws._socket.on.and.callFake((_, cb) => { ws._socket.readyState = 1; cb() })
        ws.send(message)
        expect(ws._socket.send).toHaveBeenCalledWith(message)
      })

      describe('on TOR', () => {
        beforeEach(() => {
          Helpers.tor.and.returnValue(true)
        })

        it('should not send', () => {
          ws.connect()
          expect(() => ws.send('{}')).not.toThrow()
        })
      })
    })

    describe('close()', () => {
      beforeEach(() => {
        ws.connect()
      })

      it('should close the socket', () => {
        let spy = ws._socket.close = jasmine.createSpy('close')
        ws._socket.readyState = ws._socket.OPEN
        ws.close()
        expect(spy).toHaveBeenCalled()
      })

      it('should not try to close the socket if it is closing', () => {
        let spy = ws._socket.close = jasmine.createSpy('close')
        ws._socket.readyState = ws._socket.CLOSING
        ws.close()
        expect(spy).not.toHaveBeenCalled()
      })

      it('should clear the ping interval', () => {
        spyOn(ws, 'clearPingInterval').and.callThrough()
        ws.close()
        expect(ws.clearPingInterval).toHaveBeenCalled()
      })

      it('should clear the ping timeout', () => {
        spyOn(ws, 'clearPingTimeout').and.callThrough()
        ws.close()
        expect(ws.clearPingTimeout).toHaveBeenCalled()
      })

      it('should set the socket to null', () => {
        expect(ws._socket).not.toEqual(null)
        ws.close()
        expect(ws._socket).toEqual(null)
      })
    })

    describe('ping()', () => {
      beforeEach(() => {
        ws.connect()
      })

      it('send a ping message', () => {
        spyOn(ws, 'send')
        ws.ping()
        let expected = JSON.stringify({ op: 'ping' })
        expect(ws.send).toHaveBeenCalledWith(expected)
      })

      it('should close and reconnect after a given interval', () => {
        spyOn(ws, 'close')
        spyOn(ws, 'connect')
        ws.ping()

        jasmine.clock().tick(4000);
        expect(ws.close).not.toHaveBeenCalled()
        expect(ws.connect).not.toHaveBeenCalled()

        jasmine.clock().tick(1000);
        expect(ws.close).toHaveBeenCalled()
        expect(ws.connect).toHaveBeenCalled()
      })

      it('should not close and reconnect if timeout is cleared', () => {
        spyOn(ws, 'close')
        spyOn(ws, 'connect')

        ws.ping()
        ws.clearPingTimeout()

        jasmine.clock().tick(5000);
        expect(ws.close).not.toHaveBeenCalled()
        expect(ws.connect).not.toHaveBeenCalled()
      })
    })

    describe('setPongHandler()', () => {
      it('should set a message handler', () => {
        spyOn(ws, 'on')
        ws.setPongHandler()
        expect(ws.on).toHaveBeenCalledWith('message', jasmine.any(Function))
      })

      it('should clear the ping timeout on pong', () => {
        spyOn(ws, 'clearPingTimeout')
        spyOn(ws, 'on').and.callFake((_, cb) => cb(JSON.stringify({ op: 'pong' })))
        ws.setPongHandler()
        expect(ws.clearPingTimeout).toHaveBeenCalled()
      })

      it('should not do anything on a non-pong op', () => {
        spyOn(ws, 'clearPingTimeout')
        spyOn(ws, 'on').and.callFake((_, cb) => cb(JSON.stringify({ op: 'other' })))
        ws.setPongHandler()
        expect(ws.clearPingTimeout).not.toHaveBeenCalled()
      })
    })
  })

  describe('static', () => {
    describe('op()', () => {
      it('should create a message payload', () => {
        let message = StableSocket.op('some_op')
        expect(message).toEqual(JSON.stringify({ op: 'some_op' }))
      })

      it('should create a message payload with extra data', () => {
        let message = StableSocket.op('some_op', { a: 'x', n: 2 })
        expect(message).toEqual(JSON.stringify({ op: 'some_op', a: 'x', n: 2 }))
      })
    })

    describe('pingMessage()', () => {
      it('should create a ping message payload', () => {
        expect(StableSocket.pingMessage()).toEqual(JSON.stringify({ op: 'ping' }))
      })
    })
  })
})
