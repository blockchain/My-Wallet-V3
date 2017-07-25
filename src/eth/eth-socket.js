const StableSocket = require('../stable-socket');

class EthSocket extends StableSocket {
  constructor (wsUrl) {
    super(wsUrl);
    this.connect();
  }

  subscribeToAccount (account) {
    this.send(EthSocket.accountSub(account));
    this.on('message', EthSocket.accountMessageHandler(account));
  }

  subscribeToBlocks (ethWallet) {
    this.send(EthSocket.blocksSub());
    this.on('message', EthSocket.blockMessageHandler(ethWallet));
  }

  static accountMessageHandler (account) {
    return (data) => {
      let parsed = JSON.parse(data);
      if (parsed.address === account.address) {
        account.setData(parsed);
        account.fetchTransaction(parsed.txHash);
      }
    };
  }

  static blockMessageHandler (ethWallet) {
    return (data) => {
      let parsed = JSON.parse(data);
      if (parsed.number) {
        ethWallet.setLatestBlock(parsed.number);
      }
    };
  }

  static accountSub (account) {
    return JSON.stringify({ op: 'balance', account: account.address });
  }

  static blocksSub () {
    return JSON.stringify({ op: 'block' });
  }
}

module.exports = EthSocket;
