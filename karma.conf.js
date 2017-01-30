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
      'src/**/*.js': ['browserify'],
      'tests/**/*.coffee': ['browserify'],
      'tests/**/*.js': ['browserify']
    },

    browserify: {
      configure: function (bundle) {
        bundle.once('prebundle', function () {
          bundle.transform('coffeeify');
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
      'tests/api_spec.js',
      'tests/helpers_spec.js',
      'tests/blockchain_socket.js',
      // 'tests/**/*.coffee',
      // Or specify individual test files:
      'tests/mocks/*.js',
      'tests/transaction_spend_spec.js.coffee',
      'tests/wallet_spec.js.coffee',
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
      'tests/wallet_transaction_spec.js.coffee',
      'tests/transaction_list_spec.js',
      'tests/wallet_crypto_spec.js.coffee',
      'tests/wallet_signup_spec.js.coffee',
      'tests/blockchain_settings_api_spec.js',
      'tests/account_info_spec.js',
      'tests/metadata_spec.js',
      'tests/exchange_delegate_spec.js'
    ]
  };

  config.set(configuration);
};
