let proxyquire = require('proxyquireify')(require);

describe('Websocket', () => {
  let ws = (url, array, options) => ({
    on (event, callback) {},
    send (message) {},
    close () {},
    readyState: 1,
    OPEN: 1,
    CLOSED: 3,
    url
  });

  let Helpers = {
    tor () { return false; }
  };

  let BlockchainSocket = proxyquire('../src/blockchain-socket', {
    'ws': ws,
    './helpers': Helpers
  });

  describe('new', () => it('should have a URL', () => {
    ws = new BlockchainSocket();
    expect(ws.wsUrl).toBeDefined();
    expect(ws.wsUrl.indexOf('wss://')).toEqual(0);
  }));

  describe('instance', () => {
    beforeEach(() => {
      ws = new BlockchainSocket();
    });

    describe('connect()', () => {
      it('should open a socket', () => {
        ws.connect();
        expect(ws._socket).toBeDefined();
        expect(ws._socket.url.indexOf('wss://')).toEqual(0);
      });

      describe('on TOR', () => {
        beforeEach(() =>
          spyOn(Helpers, 'tor').and.returnValue(true)
        );

        it('should not open a socket', () => {
          ws.connect();
          expect(ws._socket).not.toBeDefined();
        });
      });
    });

    describe('send()', () => {
      beforeEach(() =>
        ws.connect()
      );

      it('should pass the message on', () => {
        let message = '{"op":"addr_sub", "addr": "1btc"}';
        spyOn(ws._socket, 'send');
        ws.send(message);
        expect(ws._socket.send).toHaveBeenCalledWith(message);
      });

      describe('on TOR', () => {
        let message = '{"op":"addr_sub", "addr": "1btc"}';

        beforeEach(() => {
          ws._socket = void 0;
          spyOn(Helpers, 'tor').and.returnValue(true);
          ws.connect();
        });

        it('should not reconnect', () => {
          ws.send(message);
          expect(ws._socket).not.toBeDefined();
        });

        it('should do nothing', () =>
          expect(() => ws.send(message)).not.toThrow()
        );
      });
    });

    describe('close()', () => {
      beforeEach(() =>
        ws.connect()
      );

      it('should clear interval and timeout', () => {
        ws.close();
        expect(ws._pingTimeoutPID).toEqual(null);
        expect(ws._socket).toEqual(null);
      });
    });

    describe('ping()', () => {
      beforeEach(() =>
        ws.connect()
      );

      it('should clear interval and timeout', () => {
        spyOn(ws, 'send');
        ws.ping();
        let expected = JSON.stringify({ op: 'ping' });
        expect(ws.send).toHaveBeenCalledWith(expected);
      });
    });

    describe('msgWalletSub()', () => {
      it('should subscribe to a guid', () => {
        let res = ws.msgWalletSub('1234');
        let expected = JSON.stringify({ op: 'wallet_sub', guid: '1234' });
        expect(res).toEqual(expected);
      });

      it('should return an empty string if guid is missing', () => {
        let res = ws.msgWalletSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });
    });

    describe('msgBlockSub()', () =>
      it('should subscribe to new blocks', () => {
        let res = ws.msgBlockSub();
        let expected = JSON.stringify({ op: 'blocks_sub' });
        expect(res).toEqual(expected);
      })
    );

    describe('msgAddrSub()', () => {
      it('should return an empty string if addresses are missing', () => {
        let res = ws.msgAddrSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should subscribe to one adddress', () => {
        let res = ws.msgAddrSub('1abc');
        let expected = JSON.stringify({ op: 'addr_sub', addr: '1abc' });
        expect(res).toEqual(expected);
      });

      it('should subscribe to array of adddresses', () => {
        let res = ws.msgAddrSub(['1abc', '1def']);
        let expected = JSON.stringify({
          op: 'addr_sub',
          addr: '1abc'
        }) + JSON.stringify({
          op: 'addr_sub',
          addr: '1def'
        });
        expect(res).toEqual(expected);
      });
    });

    describe('msgXPUBSub()', () => {
      it('should return an empty string if xpub is missing', () => {
        let res = ws.msgXPUBSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should return an empty string if xpub is []', () => {
        let res = ws.msgXPUBSub([]);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should subscribe to one xpub', () => {
        let res = ws.msgXPUBSub('1abc');
        let expected = JSON.stringify({ op: 'xpub_sub', xpub: '1abc' });
        expect(res).toEqual(expected);
      });

      it('should subscribe to array of adddresses', () => {
        let res = ws.msgXPUBSub(['1abc', '1def']);
        let expected = JSON.stringify({
          op: 'xpub_sub',
          xpub: '1abc'
        }) + JSON.stringify({
          op: 'xpub_sub',
          xpub: '1def'
        });
        expect(res).toEqual(expected);
      });
    });

    describe('msgOnOpen()', () => it('should subscribe to blocks, guid, addresses and xpubs', () => {
      let guid = '1234';
      let addresses = ['123a', '1bcd'];
      let xpubs = '1eff';
      let res = ws.msgOnOpen(guid, addresses, xpubs);
      let expected = JSON.stringify({
        op: 'blocks_sub'
      }) + JSON.stringify({
        op: 'wallet_sub',
        guid: '1234'
      }) + JSON.stringify({
        op: 'addr_sub',
        addr: '123a'
      }) + JSON.stringify({
        op: 'addr_sub',
        addr: '1bcd'
      }) + JSON.stringify({
        op: 'xpub_sub',
        xpub: '1eff'
      });
      expect(res).toEqual(expected);
    }));
  });
});
