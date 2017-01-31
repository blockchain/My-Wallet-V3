
var Bitcoin = require('bitcoinjs-lib');

module.exports = {
  NETWORK: 'bitcoin',
  APP_NAME: 'javascript_web',
  APP_VERSION: '3.0',
  getNetwork: function () {
    return Bitcoin.networks[this.NETWORK];
  },
  getDefaultWalletOptions: function () {
    return {
      pbkdf2_iterations: 5000,
      html5_notifications: false,
      fee_per_kb: 10000,
      logout_time: 600000
    };
  }
};
