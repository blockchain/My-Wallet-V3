const { pipe } = require('ramda');
const EventEmitter = require('events');
const StableSocket = require('../stable-socket');

const OP_ACCOUNT_SUB = 'account_sub';
const OP_BLOCK_SUB = 'block_sub';

class EthSocket extends StableSocket {
  constructor (wsUrl) {
    super(wsUrl);
    this._events = new EventEmitter();
    this.connect(
      () => this._events.emit('open'),
      (data) => this._events.emit('message', data),
      () => this._events.emit('close')
    );
  }

  on (eventName, callback) {
    this._events.on(eventName, callback);
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
    return pipe(JSON.parse, (data) => {
      if (data.op === OP_ACCOUNT_SUB && data.account === account.address) {
        account.setData(data);
        account.fetchTransaction(data.txHash);
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
