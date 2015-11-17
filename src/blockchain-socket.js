
var WebSocket = require('ws')
  , timers    = require('timers');

function BlockchainSocket() {
  this.wsUrl = 'wss://ws.blockchain.info/inv';
  this.socket;
  this.reconnectInterval;
}

BlockchainSocket.prototype.connect = function (onOpen, onMessage, onClose) {
  var reconnect = function () {
    var connect = this.connectOnce.bind(this, onOpen, onMessage, onClose);
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) connect();
  }.bind(this);

  reconnect();
  this.reconnectInterval = timers.setInterval(reconnect, 20000);
};

BlockchainSocket.prototype.connectOnce = function (onOpen, onMessage, onClose) {
  this.socket = new WebSocket(this.wsUrl);
  this.socket.on('open', onOpen);
  this.socket.on('message', onMessage);
  this.socket.on('close', onClose);
};

BlockchainSocket.prototype.send = function (message) {
  if (this.socket) this.socket.send(message);
};

module.exports = BlockchainSocket;
