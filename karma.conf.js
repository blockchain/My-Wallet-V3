module.exports = function (config) {
  var configuration = {
    basePath: './',

    frameworks: ['jasmine', 'browserify'],

    browsers: ['PhantomJS'],

    browserNoActivityTimeout: 60000,

    // reportSlowerThan: 50,

    logLevel: config.LOG_WARN,

    client: {
      captureConsole: false
    },

    autoWatch: true,

    // logLevel: karma.LOG_DEBUG,

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      reporters: [
        { type: 'html', dir: 'coverage/' },
        { type: 'lcov', dir: 'coverage-lcov/' }
      ],

      subdir: '.'
    },

    preprocessors: {
      'tests/**/*.coffee': ['browserify']
    },

    browserify: {
      configure: function (bundle) {
        bundle.once('prebundle', function () {
          bundle.transform('coffeeify');
          bundle.transform('browserify-istanbul');
          bundle.plugin('proxyquireify/plugin');
        });
      },
      debug: true
    },

    coffeePreprocessor: {
      // options passed to the coffee compiler
      options: {
        bare: true,
        sourceMap: true
      },
      // transforming the filenames
      transformPath: function (path) {
        return path.replace(/\.coffee$/, '.js');
      }
    },

    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/jasmine-es6-promise-matchers/jasmine-es6-promise-matchers.js',
      'tests/wallet_token_endpoints.js.coffee',
      'tests/wallet_network_spec.js.coffee',
      'tests/helpers_spec.js.coffee',
      'tests/blockchain_socket.js.coffee',
      // 'tests/**/*.coffee',
      // Or specify individual test files:
      'tests/mocks/*.coffee',
      'tests/transaction_spend_spec.js.coffee',
      'tests/wallet_spec.js.coffee',
      'tests/bip38_spec.js.coffee',
      'tests/address_spec.js.coffee',
      'tests/keychain_spec.js.coffee',
      'tests/keyring_spec.js.coffee',
      'tests/hdaccount_spec.js.coffee',
      'tests/hdwallet_spec.js.coffee',
      'tests/blockchain_wallet_spec.js.coffee',
      'tests/rng_spec.js.coffee',
      'tests/payment_spec.js.coffee',
      'tests/wallet_transaction_spec.js.coffee',
      'tests/transaction_list_spec.js.coffee',
      'tests/wallet_crypto_spec.js.coffee',
      'tests/wallet_signup_spec.js.coffee',
      'tests/blockchain_settings_api_spec.js.coffee',
      'tests/account_info_spec.js.coffee',
      'tests/metadata_spec.js.coffee'
    ]
  };

  config.set(configuration);
};
