
var Bitcoin = require('bitcoinjs-lib');

module.exports = {
  NETWORK: 'bitcoin',
  getNetwork: function () {
    return Bitcoin.networks[this.NETWORK];
  }
};
