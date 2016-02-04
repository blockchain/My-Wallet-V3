proxyquire = require('proxyquireify')(require)

describe "Websocket", ->

  ws = (url, array, options) ->
    {
      on: (event, callback) ->
      send: (message) ->
      readyState: 1
      url: url
    }

  BlockchainSocket = proxyquire('../src/blockchain-socket', {
     'ws': ws,
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

    describe "send()", ->
      beforeEach ->
        ws.connect()

      it "should pass the message on", ->
        message = '{"op":"addr_sub", "addr": "1btc"}'
        spyOn(ws.socket, "send")
        ws.send(message)
        expect(ws.socket.send).toHaveBeenCalledWith(message)
