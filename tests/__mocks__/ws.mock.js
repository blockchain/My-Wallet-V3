/* eslint-disable semi */
class WebSocket {
  constructor (url) {
    this.url = url
    this.readyState = 1
    this.on = jasmine.createSpy('on')
    this.CONNECTING = 0
    this.OPEN = 1
    this.CLOSING = 2
    this.CLOSED = 3
  }
  send (message) {
  }
  close () {
  }
}

module.exports = WebSocket
