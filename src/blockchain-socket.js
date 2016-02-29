
var WebSocket = require('ws');
var Helpers   = require('./helpers');

function BlockchainSocket () {
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
  if(Helpers.tor()) return;

  this.reconnect = function () {
    var connect = this.connectOnce.bind(this, onOpen, onMessage, onClose);
    if (!this.socket || this.socket.readyState === 3) connect();
  }.bind(this);
  var pingSocket = function () { this.send(this.msgPing()); }.bind(this);
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
  if(Helpers.tor()) return;

  this.reconnect();
  var send = function () {this.socket.send(message); }.bind(this);
  if (this.socket && this.socket.readyState === 1) { send();}
};

BlockchainSocket.prototype.msgWalletSub = function (myGUID) {
  if (myGUID == null) { return ""; }
  var m = { op   : 'wallet_sub', guid : myGUID };
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgBlockSub = function () {
  var m = { op   : 'blocks_sub' };
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgAddrSub = function (addresses) {
  if (addresses == null) { return ""; }
  var addressArray = Helpers.toArrayFormat(addresses);
  var toMsg = function (address) {
    var m = { op   : 'addr_sub', addr : address };
    return JSON.stringify(m);
  }
  return addressArray.map(toMsg).reduce(Helpers.add, "");
};

BlockchainSocket.prototype.msgXPUBSub = function (xpubs) {
  if (xpubs == null) { return ""; }
  var xpubsArray = Helpers.toArrayFormat(xpubs);
  var toMsg = function (myxpub) {
    var m = { op   : 'xpub_sub', xpub : myxpub };
    return JSON.stringify(m);
  }
  return xpubsArray.map(toMsg).reduce(Helpers.add, "");
};

BlockchainSocket.prototype.msgPing = function () {
  var m = { op : 'ping'};
  return JSON.stringify(m);
};

BlockchainSocket.prototype.msgOnOpen = function (guid, addresses, xpubs) {
  return this.msgBlockSub() +
         this.msgWalletSub(guid) +
         this.msgAddrSub(addresses) +
         this.msgXPUBSub(xpubs);
};


module.exports = BlockchainSocket;
