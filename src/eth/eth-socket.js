const { pipe } = require('ramda');
const StableSocket = require('../stable-socket');

const OP_ACCOUNT_SUB = 'account_sub';
const OP_BLOCK_SUB = 'block_sub';

class EthSocket extends StableSocket {
  constructor (wsUrl, SocketClass) {
    super(wsUrl, SocketClass);
    this.connect();
  }

  subscribeToAccount (ethWallet, account, legacyAccount) {
    this.send(EthSocket.accountSub(account));
    this.on('message', EthSocket.accountMessageHandler(ethWallet, account, legacyAccount));
  }

  subscribeToBlocks (ethWallet) {
    this.send(EthSocket.blocksSub());
    this.on('message', EthSocket.blockMessageHandler(ethWallet));
  }

  static accountMessageHandler (ethWallet, account, legacyAccount) {
    return pipe(JSON.parse, (data) => {
      if (data.op === OP_ACCOUNT_SUB && data.account === account.address) {
        account.updateFromIncomingTx(data.tx);
        account.appendTransaction(data.tx).update(ethWallet);
        if (legacyAccount && legacyAccount.isCorrectAddress(data.tx.from)) {
          legacyAccount.setData({ balance: '0' });
          legacyAccount.appendTransaction(data.tx).update(ethWallet);
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
    return this.op(OP_ACCOUNT_SUB, { account: account.address });
  }

  static blocksSub () {
    return this.op(OP_BLOCK_SUB);
  }
}

module.exports = EthSocket;
