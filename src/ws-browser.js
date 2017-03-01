
var WebSocket = global.WebSocket || global.MozWebSocket;

function ws (uri, protocols, opts) {
  return protocols ? new WebSocket(uri, protocols) : new WebSocket(uri);
}

if (WebSocket) {
  ws.prototype = WebSocket.prototype;

  ws.prototype.on = function (event, callback) {
    this['on' + event] = callback;
  };

  ws.prototype.once = function (event, callback) {
    this['on' + event] = function () {
      callback.apply(callback, arguments);
      this['on' + event] = null;
    }.bind(this);
  };

  ws.prototype.off = function (event) {
    this['on' + event] = null;
  };
}

module.exports = WebSocket ? ws : null;
