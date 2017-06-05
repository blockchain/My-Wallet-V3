
var WebSocket = require('ws');
var Helpers = require('./helpers');

function BlockchainSocket () {
  this.wsUrl = 'wss://ws.blockchain.info/inv';
  this.headers = { 'Origin': 'https://blockchain.info' };
  this.socket;
  this.reconnect = null;
  // websocket pings the server every pingInterval
  this.pingInterval = 15000; // 15 secs
  this.pingIntervalPID = null;
  // ping has a timeout of pingTimeout
  this.pingTimeout = 5000; // 5 secs
  this.pingTimeoutPID = null;
}

BlockchainSocket.prototype.connect = function (onOpen, onMessage, onClose) {
  if (Helpers.tor()) return;
  this.reconnect = function () {
    var connect = this._initialize.bind(this, onOpen, onMessage, onClose);
    connect();
  }.bind(this);
  this.reconnect();
};

BlockchainSocket.prototype._initialize = function (onOpen, onMessage, onClose) {
  if (!this.socket || this.socket.readyState === 3) {
    try {
      this.pingIntervalPID = setInterval(this.ping.bind(this), this.pingInterval);
      this.socket = new WebSocket(this.wsUrl, [], { headers: this.headers });
      this.socket.on('open', onOpen);
      this.socket.on('message', onMessage);
      this.socket.on('close', onClose);
    } catch (e) {
      console.error('Failed to connect to websocket', e);
    }
  }
};

BlockchainSocket.prototype.ping = function () {
  this.send(this.msgPing());
  var connect = this.reconnect.bind(this);
  var close = this.close.bind(this);
  this.pingTimeoutPID = setTimeout(connect.compose(close), this.pingTimeout);
};

BlockchainSocket.prototype.close = function () {
  if (this.socket) { this.socket.close(); }
  this.socket = null;
  clearInterval(this.pingIntervalPID);
  clearTimeout(this.pingTimeoutPID);
};

BlockchainSocket.prototype.send = function (message) {
  if (Helpers.tor()) return;
  if (this.socket && this.socket.readyState === 1) {
    this.socket.send(message);
  }
};

BlockchainSocket.prototype.msgWalletSub = function (myGUID) {
  if (myGUID == null) { return ''; }
  var m = { op: 'wallet_sub', guid: myGUID };
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgBlockSub = function () {
  var m = { op: 'blocks_sub' };
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgAddrSub = function (addresses) {
  if (addresses == null) { return ''; }
  var addressArray = Helpers.toArrayFormat(addresses);
  var toMsg = function (address) {
    var m = { op: 'addr_sub', addr: address };
    return JSON.stringify(m);
  };
  return addressArray.map(toMsg).reduce(Helpers.add, '');
};

BlockchainSocket.prototype.msgXPUBSub = function (xpubs) {
  if (xpubs == null) { return ''; }
  var xpubsArray = Helpers.toArrayFormat(xpubs);
  var toMsg = function (myxpub) {
    var m = { op: 'xpub_sub', xpub: myxpub };
    return JSON.stringify(m);
  };
  return xpubsArray.map(toMsg).reduce(Helpers.add, '');
};

BlockchainSocket.prototype.msgPing = function () {
  var m = { op: 'ping' };
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgOnOpen = function (guid, addresses, xpubs) {
  return this.msgBlockSub() +
         this.msgWalletSub(guid) +
         this.msgAddrSub(addresses) +
         this.msgXPUBSub(xpubs);
};

module.exports = BlockchainSocket;
