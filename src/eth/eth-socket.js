const { pipe } = require('ramda');
const StableSocket = require('../stable-socket');

const OP_ACCOUNT_SUB = 'account_sub';
const OP_BLOCK_SUB = 'block_sub';

class EthSocket extends StableSocket {
  constructor (wsUrl) {
    super(wsUrl);
    this.connect();
  }

  subscribeToAccount (account, legacyAccount) {
    this.send(EthSocket.accountSub(account));
    this.on('message', EthSocket.accountMessageHandler(account, legacyAccount));
  }

  subscribeToBlocks (ethWallet) {
    this.send(EthSocket.blocksSub());
    this.on('message', EthSocket.blockMessageHandler(ethWallet));
  }

  static accountMessageHandler (account, legacyAccount) {
    return pipe(JSON.parse, (data) => {
      if (data.op === OP_ACCOUNT_SUB && data.account === account.address) {
        account.setData(data);
        account.appendTransaction(data.tx);
        if (legacyAccount && legacyAccount.isCorrectAddress(data.tx.from)) {
          legacyAccount.setData({ balance: '0' });
          legacyAccount.appendTransaction(data.tx);
        }
      }
    });
  }

  static blockMessageHandler (ethWallet) {
    return pipe(JSON.parse, (data) => {
      if (data.op === OP_BLOCK_SUB) {
        ethWallet.setLatestBlock(data.height);
      }
    });
  }

  static accountSub (account) {
    return JSON.stringify({ op: OP_ACCOUNT_SUB, account: account.address });
  }

  static blocksSub () {
    return JSON.stringify({ op: OP_BLOCK_SUB });
  }
}

module.exports = EthSocket;
