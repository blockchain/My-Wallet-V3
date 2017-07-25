const StableSocket = require('../stable-socket');

class EthSocket extends StableSocket {
  constructor (wsUrl) {
    super(wsUrl);
    this.connect();
  }

  subscribeToAccount (account) {
    this.send(EthSocket.accountSub(account));
    this.on('message', (data) => {
      let parsed = JSON.parse(data);
      if (parsed.address === account.address) {
        account.setData(parsed);
        account.fetchTransaction(parsed.txHash);
      }
    });
  }

  subscribeToBlocks (ethWallet) {
    this.send(EthSocket.blocksSub());
    this.on('message', (data) => {
      let parsed = JSON.parse(data);
      if (parsed.number) {
        ethWallet.setLatestBlock(parsed.number);
      }
    });
  }

  static accountSub (account) {
    return JSON.stringify({ op: 'balance', account: account.address });
  }

  static blocksSub () {
    return JSON.stringify({ op: 'block' });
  }
}

module.exports = EthSocket;
