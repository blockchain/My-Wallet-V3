
var WebSocket = require('ws');

function BlockchainSocket() {
  this.wsUrl = 'wss://ws.blockchain.info/inv';
  this.headers = { 'Origin': 'https://blockchain.info' };
  this.socket;
  this.reconnectInterval;
  this.pingInterval;
}

// hack to browserify websocket library
if (!(typeof window === 'undefined')) {
  WebSocket.prototype.on = function (event, callback) {
    this['on'+event] = callback;
  };
  WebSocket.prototype.once = function (event, callback) {
      var self = this;
    this['on'+event] = function () {
      callback.apply(callback, arguments);
      self['on'+event] = null;
    };
  };
  WebSocket.prototype.off = function (event, callback) {
    this['on'+event] = callback;
  };
}


BlockchainSocket.prototype.connect = function (onOpen, onMessage, onClose) {
  var reconnect = function () {
    var connect = this.connectOnce.bind(this, onOpen, onMessage, onClose);
    if (!this.socket || this.socket.readyState === 3) connect();
  }.bind(this);
  var pingSocket = function () { this.send('{"op":"ping_block"}'); }.bind(this);
  reconnect();
  this.reconnectInterval = setInterval(reconnect, 20000);
  this.pingInterval = setInterval(pingSocket, 30013);
};

BlockchainSocket.prototype.connectOnce = function (onOpen, onMessage, onClose) {
  this.socket = new WebSocket(this.wsUrl, [], { headers: this.headers });
  this.socket.on('open', onOpen);
  this.socket.on('message', onMessage);
  this.socket.on('close', onClose);
};

BlockchainSocket.prototype.send = function (message) {
  if (this.socket) this.socket.send(message);
};

module.exports = BlockchainSocket;
