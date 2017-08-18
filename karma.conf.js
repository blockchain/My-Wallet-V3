module.exports = function (config) {
  var configuration = {
    basePath: './',
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    browserNoActivityTimeout: 180000,
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
      'src/**/*.js': ['browserify'],
      'tests/**/*.js': ['browserify']
    },

    browserify: {
      configure (bundle) {
        bundle.once('prebundle', function () {
          bundle.transform('browserify-istanbul'); // Must go first
          bundle.transform('babelify', {
            presets: ['es2015'],
            ignore: [
              'src/ws-browser.js', // undefined is not an object (evaluating 'global.WebSocket')
              /\/node_modules\/(?!bitcoin-(coinify|exchange|sfox)-client\/)/
            ],
            global: true,
            sourceMap: 'inline'
          });
          bundle.plugin('proxyquireify/plugin');
        });
      },
      debug: true
    },

    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/jasmine-es6-promise-matchers/jasmine-es6-promise-matchers.js',
      'tests/mocks/*.js',
      'tests/wallet_token_endpoints.js',
      'tests/wallet_network_spec.js',
      'tests/api_spec.js',
      'tests/helpers_spec.js',
      'tests/blockchain_socket.js',
      'tests/transaction_spend_spec.js',
      'tests/wallet_spec.js',
      'tests/bip38_spec.js',
      'tests/address_spec.js',
      'tests/external_spec.js',
      'tests/keychain_spec.js',
      'tests/keyring_spec.js',
      'tests/hdaccount_spec.js',
      'tests/hdwallet_spec.js',
      'tests/blockchain_wallet_spec.js',
      'tests/rng_spec.js',
      'tests/payment_spec.js',
      'tests/wallet_transaction_spec.js',
      'tests/transaction_list_spec.js',
      'tests/wallet_crypto_spec.js',
      'tests/wallet_signup_spec.js',
      'tests/blockchain_settings_api_spec.js',
      'tests/account_info_spec.js',
      'tests/metadata_spec.js',
      'tests/exchange_delegate_spec.js',
      'tests/labels_spec.js',
      'tests/address_hd_spec.js',
      'tests/stable_socket.spec.js',
      'tests/eth/*.spec.js',
      'tests/shift/*.spec.js'
    ]
  };

  config.set(configuration);
};
