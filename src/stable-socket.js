const EventEmitter = require('events');
const Helpers = require('./helpers');

const PING_INTERVAL = 15000;
const PING_TIMEOUT = 5000;

class StableSocket extends EventEmitter {
  constructor (url, SocketClass) {
    super();
    this.wsUrl = url;
    this.SocketClass = SocketClass;
    this._headers = { 'Origin': 'https://blockchain.info' };
    this._socket;
    this._pingIntervalPID = null;
    this._pingTimeoutPID = null;
    this.setPongHandler();
  }

  get url () {
    return this.wsUrl;
  }

  get isConnecting () {
    return this._socket != null && this._socket.readyState === this._socket.CONNECTING;
  }

  get isOpen () {
    return this._socket != null && this._socket.readyState === this._socket.OPEN;
  }

  get isClosing () {
    return this._socket != null && this._socket.readyState === this._socket.CLOSING;
  }

  get isClosed () {
    return this._socket == null || this._socket.readyState === this._socket.CLOSED;
  }

  createSocket (url) {
    return new this.SocketClass(url, [], { headers: this._headers });
  }

  connect () {
    if (!Helpers.tor() && this.isClosed) {
      try {
        this._pingIntervalPID = setInterval(this.ping.bind(this), PING_INTERVAL);
        this._socket = this.createSocket(this.url);
        this._socket.on('open', () => this.emit('open'));
        this._socket.on('message', (message) => this.emit('message', message.data));
        this._socket.on('close', () => this.emit('close'));
      } catch (e) {
        console.error('Failed to connect to websocket', e);
      }
    }
  }

  send (data) {
    if (!Helpers.tor() && this.isOpen) this._socket.send(data);
    else if (this.isConnecting) this._socket.on('open', () => this.send(data));
    return this;
  }

  close () {
    if (this.isOpen) this._socket.close();
    this._socket = null;
    this.clearPingInterval();
    this.clearPingTimeout();
    return this;
  }

  ping () {
    this.send(StableSocket.pingMessage());
    this._pingTimeoutPID = setTimeout(() => {
      this.close();
      this.connect();
    }, PING_TIMEOUT);
  }

  setPongHandler () {
    this.on('message', (data) => {
      JSON.parse(data).op === 'pong' && this.clearPingTimeout();
    });
  }

  clearPingInterval () {
    clearInterval(this._pingIntervalPID);
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
