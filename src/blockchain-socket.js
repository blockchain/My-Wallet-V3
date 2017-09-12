const StableSocket = require('./stable-socket');
const Helpers = require('./helpers');

const OP_WALLET_SUB = 'wallet_sub';
const OP_BLOCKS_SUB = 'blocks_sub';
const OP_ADDR_SUB = 'addr_sub';
const OP_XPUB_SUB = 'xpub_sub';

class BlockchainSocket extends StableSocket {
  constructor (wsUrl, SocketClass) {
    super(wsUrl || 'wss://ws.blockchain.info/inv', SocketClass);
  }

  subscribeToAddresses (addrs) {
    return this.send(BlockchainSocket.addrSub(addrs));
  }

  subscribeToXpubs (xpubs) {
    return this.send(BlockchainSocket.xpubSub(xpubs));
  }

  static walletSub (guid) {
    if (guid == null) return '';
    return this.op(OP_WALLET_SUB, { guid });
  }

  static blocksSub () {
    return this.op(OP_BLOCKS_SUB);
  }

  static addrSub (addrs) {
    if (addrs == null) return '';
    addrs = Helpers.toArrayFormat(addrs);
    let createMessage = (addr) => this.op(OP_ADDR_SUB, { addr });
    return addrs.map(createMessage).join('');
  }

  static xpubSub (xpubs) {
    if (xpubs == null) return '';
    xpubs = Helpers.toArrayFormat(xpubs);
    let createMessage = (xpub) => this.op(OP_XPUB_SUB, { xpub });
    return xpubs.map(createMessage).join('');
  }

  static onOpenSub (guid, addrs, xpubs) {
    return [
      this.blocksSub(),
      this.walletSub(guid),
      this.addrSub(addrs),
      this.xpubSub(xpubs)
    ].join('');
  }
}

module.exports = BlockchainSocket;
