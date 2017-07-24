const WebSocket = require('ws');
const EventEmitter = require('events');

class StableSocket extends EventEmitter {
  constructor (url) {
    super();
    this._url = url;
    this._headers = { 'Origin': 'https://blockchain.info' };
    this._socket;
    this._messageQueue = [];
  }

  get isOpen () {
    return this._socket.readyState === this._socket.OPEN;
  }

  connect () {
    let { _url, _headers } = this;
    this._socket = new WebSocket(_url, [], _headers);

    this._socket.on('message', ({ data }) => {
      this.emit('message', data);
    });

    this._socket.on('open', () => {
      this._messageQueue.forEach(d => { this._socket.send(d); });
      this._messageQueue = [];
    });

    this._socket.on('close', () => {
      this.connect();
    });

    return this;
  }

  send (data) {
    if (this.isOpen) {
      this._socket.send(data);
    } else {
      this._messageQueue.push(data);
    }
    return this;
  }

  close () {
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
    return this;
  }
}

module.exports = StableSocket;
