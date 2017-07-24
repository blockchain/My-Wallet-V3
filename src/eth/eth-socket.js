const StableSocket = require('../stable-socket');

class EthSocket extends StableSocket {
  constructor () {
    super('wss://ws.dev.blockchain.info/eth/ws');
    this.connect();
  }

  subscribeToAccount (account) {
    this.send(EthSocket.accountSub(account));
    this.on('message', (data) => {
      let parsed = JSON.parse(data);
      account.setData(parsed);
      account.fetchTransaction(parsed.txHash);
    });
  }

  static accountSub (account) {
    return JSON.stringify({ op: 'balance', account: account.address });
  }
}

module.exports = EthSocket;
