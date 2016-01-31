
var WebSocket = require('ws');

function BlockchainSocket() {
  this.wsUrl = 'wss://blockchain.info/inv';
  this.headers = { 'Origin': 'https://blockchain.info' };
  this.socket;
  this.reconnectInterval;
  this.pingInterval;
  this.reconnect;
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

  this.reconnect = function () {
    var connect = this.connectOnce.bind(this, onOpen, onMessage, onClose);
    if (!this.socket || this.socket.readyState === 3) connect();
  }.bind(this);
  var pingSocket = function () { this.send('{"op":"ping_block"}'); }.bind(this);
  this.reconnect();
  this.reconnectInterval = setInterval(this.reconnect, 20000);
  this.pingInterval = setInterval(pingSocket, 30013);
};

BlockchainSocket.prototype.connectOnce = function (onOpen, onMessage, onClose) {
  try {
    this.socket = new WebSocket(this.wsUrl, [], { headers: this.headers });
    this.socket.on('open', onOpen);
    this.socket.on('message', onMessage);
    this.socket.on('close', onClose);
  } catch (e) {
    console.log('Failed to connect to websocket');
  }
};

BlockchainSocket.prototype.send = function (message) {
  this.reconnect();
  var send = function() {this.socket.send(message); }.bind(this);
  if (this.socket.readyState === 1) { send();}
};

module.exports = BlockchainSocket;
