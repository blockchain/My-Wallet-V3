proxyquire = require('proxyquireify')(require)

describe "Websocket", ->

  ws = (url, array, options) ->
    {
      on: (event, callback) ->
      send: (message) ->
      readyState: 1
      url: url
    }

  Helpers = {
    tor: () -> false
  }

  BlockchainSocket = proxyquire('../src/blockchain-socket', {
     'ws': ws,
     './helpers': Helpers
  })

  describe "new", ->

    it "should have a URL", ->
      ws = new BlockchainSocket()
      expect(ws.wsUrl).toBeDefined()
      expect(ws.wsUrl.indexOf("wss://")).toEqual(0)

  describe "instance", ->
    ws = undefined

    beforeEach ->
      ws = new BlockchainSocket()

    describe "connect()", ->
      it "should open a socket", ->
        ws.connect()
        expect(ws.socket).toBeDefined()
        # The mock websocket has a URL method:
        expect(ws.socket.url.indexOf("wss://")).toEqual(0)

      describe "on TOR", ->
        beforeEach ->
          spyOn(Helpers, "tor").and.returnValue true

        it "should not open a socket", ->
          ws.connect()
          expect(ws.socket).not.toBeDefined()

    describe "send()", ->
      beforeEach ->
        ws.connect()

      it "should pass the message on", ->
        message = '{"op":"addr_sub", "addr": "1btc"}'
        spyOn(ws.socket, "send")
        ws.send(message)
        expect(ws.socket.send).toHaveBeenCalledWith(message)

      describe "on TOR", ->
        message = '{"op":"addr_sub", "addr": "1btc"}'

        beforeEach ->
          ws.socket = undefined
          spyOn(Helpers, "tor").and.returnValue true
          ws.connect()

        it "should not reconnect", ->
          ws.send(message)
          expect(ws.socket).not.toBeDefined()

        it "should do nothing", ->
          # ws.socket is not defined, so nothing to spy on
          expect(() -> ws.send(message)).not.toThrow()
