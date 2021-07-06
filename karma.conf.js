module.exports = function (config) {
  var configuration = {
    basePath: './',
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    browserNoActivityTimeout: 180000,
    logLevel: config.LOG_DEBUG,
    client: {
      captureConsole: true
    },
    autoWatch: true,
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
            presets: ['env', 'es2015'],
            ignore: [ ],
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
      'tests/bch/bch-account.spec.js',
      'tests/bch/bch-imported.spec.js',
      // 'tests/bch/bch-payment.spec.js',
      // 'tests/bch/bch-spendable.spec.js',
      'tests/bch/index.spec.js',
      'tests/eth/**.js',
      'tests/account-info.spec.js',
      'tests/address-hd.spec.js',
      'tests/address.spec.js',
      'tests/api.spec.js',
      // 'tests/bip38.spec.js',
      'tests/blockchain-settings-api.spec.js',
      // 'tests/blockchain-wallet.spec.js',
      'tests/coin-selection.spec.js',
      'tests/coin.spec.js',
      'tests/external.spec.js',
      'tests/hd-account.spec.js',
      // 'tests/hd-wallet.spec.js',
      // 'tests/helpers.spec.js',
      'tests/keychain.spec.js',
      // 'tests/keyring.spec.js',
      'tests/keyring.spec.js',
      'tests/labels.spec.js',
      'tests/metadata.spec.js',
      'tests/rng.spec.js',
      'tests/signer.spec.js',
      'tests/transaction-list.spec.js',
      'tests/wallet-crypto.spec.js',
      'tests/wallet-network.spec.js',
      'tests/wallet-signup.spec.js',
      'tests/wallet-token-endpoints.spec.js',
      'tests/wallet-transaction.spec.js'
      // 'tests/wallet.spec.js'
    ]
  };

  config.set(configuration);
};
