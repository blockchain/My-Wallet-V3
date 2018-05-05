var Bitcoin = require('bitcoinjs-lib');

module.exports = {
  NETWORK: 'bitcoin',
  APP_NAME: 'javascript_web',
  APP_VERSION: '3.0',
  SHAPE_SHIFT_KEY: void 0,
  SERVER_FEE_FALLBACK: {
    'limits': {
      'min': 50,
      'max': 450
    },
    'regular': 240,
    'priority': 300
  },
  getNetwork: function (bitcoinjs) {
    if (bitcoinjs) {
      return bitcoinjs.networks[this.NETWORK];
    } else {
      return Bitcoin.networks[this.NETWORK];
    }
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
