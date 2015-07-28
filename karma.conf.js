module.exports = function(karma) {

  var configuration = {
    basePath : './',

    frameworks: ['jasmine', 'browserify'],

    browsers : ['Chrome'], //'PhantomJS'],

    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

    browserNoActivityTimeout: 60000,

    // reportSlowerThan: 50,

    client: {
      captureConsole: true
    },

    autoWatch: true,

    // logLevel: karma.LOG_DEBUG,

    reporters: ['progress','coverage'],

    coverageReporter: {
      type : 'html',
      dir : 'coverage/',
      subdir: '.'
    },

    preprocessors: {
      'tests/**/*.coffee' : ['browserify']
    },

    browserify: {
      configure: function(bundle) {
        bundle.once('prebundle', function() {
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
      transformPath: function(path) {
        return path.replace(/\.coffee$/, '.js');
      }
    },

    files: [
      'src/shared.js',
      // 'tests/**/*.coffee',
      // Or specify individual test files:
      'tests/mocks/*.coffee',
      //'tests/wallet_spender_spec.js.coffee',     //(FAIL)
      'tests/blockchain_api_spec.js.coffee',       //(OK)
      // 'tests/claim_redeem_spec.js.coffee',      //(requires refactor)
      'tests/transaction_spec.js.coffee',          //(OK)
      'tests/transaction_spend_spec.js.coffee',    //(OK)
      // 'tests/my_wallet_spec.js.coffee',         //(FAIL)      // This seems to leave some global state around, see below:
      // 'tests/wallet_spec.js.coffee',            //(FAIL)      // Throws an error unless my_wallet_spec runs first (bad...)
      'tests/bip38_spec.js.coffee',                //(OK)
      'tests/address_spec.js.coffee',
      'tests/keychain_spec.js.coffee',
      'tests/keyring_spec.js.coffee',
      'tests/hdaccount_spec.js.coffee',
      'tests/hdwallet_spec.js.coffee',
      'tests/blockchain_wallet_spec.js.coffee'
    ]
  };

  if(process.env.TRAVIS) {
    configuration.browsers = ['Chrome_travis_ci'];
  }

  karma.set(configuration);
};
