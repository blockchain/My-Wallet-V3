module.exports = function(karma) {

  karma.set({
    basePath : './',

    frameworks: ['jasmine', 'browserify'],

    browsers : ['Chrome'], //'PhantomJS'],

    browserNoActivityTimeout: 60000,

    // reportSlowerThan: 50,

    client: {
      captureConsole: true
    },

    autoWatch: false,

    // logLevel: config.LOG_DEBUG,

    reporters: ['progress','coverage'],

    coverageReporter: {
      type : 'html',
      dir : 'coverage/',
      subdir: '.'
    },

    preprocessors: {
      'tests/*.js' : ['browserify']
    },

    browserify: {
      debug: true,
      transform: [ 'browserify-istanbul' ],
      // transform: [ 'coffeeify', 'browserify-istanbul' ],
      plugin: [ 'proxyquireify/plugin' ]
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
      'build/bower_components.js',
      'bower_components/es5-shim/es5-shim.min.js',
      'bower_components/es6-shim/es6-shim.min.js',
      'node_modules/sjcl/sjcl.js',
      'node_modules/xregexp/xregexp-all.js',
      'src/crypto-util-legacy.js',
      'src/shared.js',
      'tests/mocks/*.js',
      'tests/**/*_spec.js',
      // TODO so it does work - it's just that some tests interfere with each other
      // Or specify individual test files:
      // 'tests/bip38_spec.js',
      // 'tests/blockchain_api_spec.js',
      // 'tests/claim_redeem_spec.js',
      // 'tests/hdwallet_spec.js',
      // 'tests/legacy_addresses_spec.js',
      // 'tests/my_wallet_spec.js',
      // 'tests/spend_spec.js',
      // 'tests/tags_spec.js',
      // 'tests/transaction_spec.js',
      // 'tests/transaction_spend_spec.js',
      // 'tests/wallet_spec.js'
    ]
  });
};
