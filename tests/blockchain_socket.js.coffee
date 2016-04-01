proxyquire = require('proxyquireify')(require)

describe "Websocket", ->

  ws = (url, array, options) ->
    {
      on: (event, callback) ->
      send: (message) ->
      close: () ->
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

    describe "close()", ->
      beforeEach ->
        ws.connect()

      it "should clear interval and timeout", ->
        ws.close()
        expect(ws.pingTimeoutPID).toEqual(null)
        expect(ws.socket).toEqual(null)

    describe "ping()", ->
      beforeEach ->
        ws.connect()

      it "should clear interval and timeout", ->
        spyOn(ws, "send")
        ws.ping()
        expected = JSON.stringify({op: "ping"})
        expect(ws.send).toHaveBeenCalledWith(expected)

    describe "msgWalletSub()", ->
      it "should subscribe to a guid", ->
        res = ws.msgWalletSub("1234")
        expected = JSON.stringify({op: "wallet_sub", guid: "1234"})
        expect(res).toEqual(expected)

      it "should return an empty string if guid is missing", ->
        res = ws.msgWalletSub(null)
        expected = ""
        expect(res).toEqual(expected)

    describe "msgBlockSub()", ->
      it "should subscribe to new blocks", ->
        res = ws.msgBlockSub()
        expected = JSON.stringify({op: "blocks_sub"})
        expect(res).toEqual(expected)

    describe "msgAddrSub()", ->
      it "should return an empty string if addresses are missing", ->
        res = ws.msgAddrSub(null)
        expected = ""
        expect(res).toEqual(expected)

      it "should subscribe to one adddress", ->
        res = ws.msgAddrSub("1abc")
        expected = JSON.stringify({op: "addr_sub", addr: "1abc"})
        expect(res).toEqual(expected)

      it "should subscribe to array of adddresses", ->
        res = ws.msgAddrSub(["1abc", "1def"])
        expected = JSON.stringify({op: "addr_sub", addr: "1abc"}) +
                   JSON.stringify({op: "addr_sub", addr: "1def"})
        expect(res).toEqual(expected)

    describe "msgXPUBSub()", ->
      it "should return an empty string if xpub is missing", ->
        res = ws.msgXPUBSub(null)
        expected = ""
        expect(res).toEqual(expected)

      it "should return an empty string if xpub is []", ->
        res = ws.msgXPUBSub([])
        expected = ""
        expect(res).toEqual(expected)

      it "should subscribe to one xpub", ->
        res = ws.msgXPUBSub("1abc")
        expected = JSON.stringify({op: "xpub_sub", xpub: "1abc"})
        expect(res).toEqual(expected)

      it "should subscribe to array of adddresses", ->
        res = ws.msgXPUBSub(["1abc", "1def"])
        expected = JSON.stringify({op: "xpub_sub", xpub: "1abc"}) +
                   JSON.stringify({op: "xpub_sub", xpub: "1def"})
        expect(res).toEqual(expected)

    describe "msgPing()", ->
      it "should ping", ->
        res = ws.msgPing()
        expected = JSON.stringify({op: "ping"})
        expect(res).toEqual(expected)

    describe "msgOnOpen()", ->
      it "should subscribe to blocks, guid, addresses and xpubs", ->
        guid = "1234"
        addresses = ["123a", "1bcd"]
        xpubs = "1eff"
        res = ws.msgOnOpen(guid, addresses, xpubs)
        expected = JSON.stringify({op: "blocks_sub"}) +
                   JSON.stringify({op: "wallet_sub", guid: "1234"}) +
                   JSON.stringify({op: "addr_sub", addr: "123a"}) +
                   JSON.stringify({op: "addr_sub", addr: "1bcd"}) +
                   JSON.stringify({op: "xpub_sub", xpub: "1eff"})
        expect(res).toEqual(expected)
