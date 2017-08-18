describe('Websocket', () => {
  let BlockchainSocket = require('../src/blockchain-socket');
  let Helpers = require('../src/helpers');

  describe('instance', () => {
    let ws;
    let createSocket = (url) => ({
      on (event, callback) {},
      send (message) {},
      close () {},
      readyState: 1,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      url
    });

    beforeEach(() => {
      ws = new BlockchainSocket();
      spyOn(Helpers, 'tor').and.returnValue(false);
      spyOn(ws, 'createSocket').and.callFake(createSocket);
    });

    describe('subscribeToAddresses()', () => {
      it('should subscribe to a single address', () => {
        spyOn(ws, 'send');
        ws.subscribeToAddresses('asdf');
        let expected = JSON.stringify({ op: 'addr_sub', addr: 'asdf' });
        expect(ws.send).toHaveBeenCalledWith(expected);
      });

      it('should subscribe to multiple addresses', () => {
        spyOn(ws, 'send');
        ws.subscribeToAddresses(['asdf', 'qwer']);
        let expected = JSON.stringify({ op: 'addr_sub', addr: 'asdf' }) + JSON.stringify({ op: 'addr_sub', addr: 'qwer' });
        expect(ws.send).toHaveBeenCalledWith(expected);
      });
    });

    describe('subscribeToXpubs()', () => {
      it('should subscribe to a single xpub', () => {
        spyOn(ws, 'send');
        ws.subscribeToXpubs('xpub1');
        let expected = JSON.stringify({ op: 'xpub_sub', xpub: 'xpub1' });
        expect(ws.send).toHaveBeenCalledWith(expected);
      });

      it('should subscribe to multiple xpubs', () => {
        spyOn(ws, 'send');
        ws.subscribeToXpubs(['xpub1', 'xpub2']);
        let expected = JSON.stringify({ op: 'xpub_sub', xpub: 'xpub1' }) + JSON.stringify({ op: 'xpub_sub', xpub: 'xpub2' });
        expect(ws.send).toHaveBeenCalledWith(expected);
      });
    });
  });

  describe('static', () => {
    describe('walletSub()', () => {
      it('should subscribe to a guid', () => {
        let res = BlockchainSocket.walletSub('1234');
        let expected = JSON.stringify({ op: 'wallet_sub', guid: '1234' });
        expect(res).toEqual(expected);
      });

      it('should return an empty string if guid is missing', () => {
        let res = BlockchainSocket.walletSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });
    });

    describe('blocksSub()', () =>
      it('should subscribe to new blocks', () => {
        let res = BlockchainSocket.blocksSub();
        let expected = JSON.stringify({ op: 'blocks_sub' });
        expect(res).toEqual(expected);
      })
    );

    describe('addrSub()', () => {
      it('should return an empty string if addresses are missing', () => {
        let res = BlockchainSocket.addrSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should subscribe to one adddress', () => {
        let res = BlockchainSocket.addrSub('1abc');
        let expected = JSON.stringify({ op: 'addr_sub', addr: '1abc' });
        expect(res).toEqual(expected);
      });

      it('should subscribe to array of adddresses', () => {
        let res = BlockchainSocket.addrSub(['1abc', '1def']);
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

    describe('xpubSub()', () => {
      it('should return an empty string if xpub is missing', () => {
        let res = BlockchainSocket.xpubSub(null);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should return an empty string if xpub is []', () => {
        let res = BlockchainSocket.xpubSub([]);
        let expected = '';
        expect(res).toEqual(expected);
      });

      it('should subscribe to one xpub', () => {
        let res = BlockchainSocket.xpubSub('1abc');
        let expected = JSON.stringify({ op: 'xpub_sub', xpub: '1abc' });
        expect(res).toEqual(expected);
      });

      it('should subscribe to array of adddresses', () => {
        let res = BlockchainSocket.xpubSub(['1abc', '1def']);
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

    describe('onOpenSub()', () => {
      it('should subscribe to blocks, guid, addresses and xpubs', () => {
        let guid = '1234';
        let addresses = ['123a', '1bcd'];
        let xpubs = '1eff';
        let res = BlockchainSocket.onOpenSub(guid, addresses, xpubs);
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
      });
    });
  });
});
