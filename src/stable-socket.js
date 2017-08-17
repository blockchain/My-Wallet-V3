const WebSocket = require('ws');
const Helpers = require('./helpers');

class StableSocket {
  constructor (url) {
    this.wsUrl = url;
    this._headers = { 'Origin': 'https://blockchain.info' };
    this._socket;
    this._reconnect = null;
    this._pingInterval = 15000;
    this._pingIntervalPID = null;
    this._pingTimeout = 5000;
    this._pingTimeoutPID = null;
  }

  get url () {
    return this.wsUrl;
  }

  get isOpen () {
    return this._socket && this._socket.readyState === this._socket.OPEN;
  }

  get isClosed () {
    return !this._socket || this._socket.readyState === this._socket.CLOSED;
  }

  _initialize (onOpen, onMessage, onClose) {
    if (this.isClosed) {
      try {
        this._pingIntervalPID = setInterval(this.ping.bind(this), this._pingInterval);
        this._socket = new WebSocket(this.url, [], { headers: this._headers });
        this._socket.on('open', onOpen);
        this._socket.on('message', onMessage);
        this._socket.on('close', onClose);
      } catch (e) {
        console.error('Failed to connect to websocket', e);
      }
    }
  }

  connect (onOpen, onMessage, onClose) {
    if (Helpers.tor()) return;
    this._reconnect = function () {
      let connect = this._initialize.bind(this, onOpen, onMessage, onClose);
      connect();
    }.bind(this);
    this._reconnect();
  }

  send (data) {
    if (!Helpers.tor() && this.isOpen) this._socket.send(data);
    else if (this._socket) this._socket.on('open', () => this.send(data));
    return this;
  }

  close () {
    if (this.isOpen) this._socket.close();
    this._socket = null;
    clearInterval(this._pingIntervalPID);
    this.clearPingTimeout();
    return this;
  }

  ping () {
    this.send(StableSocket.pingMessage());
    this._pingTimeoutPID = setTimeout(() => {
      this.close();
      this._reconnect();
    }, this._pingTimeout);
  }

  clearPingTimeout () {
    clearTimeout(this._pingTimeoutPID);
  }

  static op (op, data = {}) {
    return JSON.stringify(Object.assign({ op }, data));
  }

  static pingMessage () {
    return StableSocket.op('ping');
  }
}

module.exports = StableSocket;
