module.exports = function(config) {

  config.set({
    basePath : './',
    
    browserNoActivityTimeout: 60000,
    
    frameworks: ['jasmine', 'browserify'],
    
    browsers : ['Chrome'], //'PhantomJS'],
    
    // reportSlowerThan: 50,
    
    client: {
      captureConsole: true
    },
    
    preprocessors: {
      // '**/!(transaction_spend_spec.js).coffee': ['coffee'],
      // 'src/blockchain-api.js' : ['browserify', 'coverage'],
      // 'src/blockchain-settings-api.js' : ['browserify', 'coverage'],
      // 'src/hd-wallet.js' : ['browserify', 'coverage'],
      // 'src/hd-account.js' : ['browserify', 'coverage'],
      // 'src/import-export.js' : ['browserify', 'coverage'],
      // 'src/wallet.js' : ['browserify', 'coverage'],
      // 'src/wallet-store.js' : ['browserify', 'coverage'],
      // 'src/wallet-crypto.js' : ['browserify', 'coverage'],
      // 'src/wallet-signup.js' : ['browserify', 'coverage'],
      
      // 'src/transaction.js' : ['browserify', 'coverage'],
      // 'tests/transaction_spend_spec.js.coffee' : ['browserify'],
      // 'src/import-export.js' : ['browserify', 'coverage'],
      // 'tests/bip38_spec.js.coffee' : ['browserify']
      'src/blockchain-api.js' : ['browserify', 'coverage'],
      'tests/blockchain_api_spec.js' : ['browserify']
    },

    browserify: {
      debug: true,
      transform: [ 'browserify-istanbul' ],
      plugin: [ 'proxyquire-universal' ]
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
        
    autoWatch: true,
    
    files: [
      'build/bower_components.js',
      'bower_components/es5-shim/es5-shim.min.js',
      'bower_components/es6-shim/es6-shim.min.js',
      'node_modules/sjcl/sjcl.js',
      'node_modules/xregexp/xregexp-all.js',
      'src/crypto-util-legacy.js',
      'src/shared.js',
      //'tests/**/*.js.coffee',
      // 'tests/transaction_spend_spec.js.coffee',
      // 'tests/bip38_spec.js.coffee',
      'tests/blockchain_api_spec.js'
      
      // Or specify individual test files:
      // 'tests/blockchain_api_spec.js.coffee',
      // 'tests/mocks/*.js.coffee',
      // 'tests/bip38_spec.js.coffee',
      // 'tests/claim_redeem_spec.js.coffee',
      // 'tests/hdwallet_spec.js.coffee',
      // 'tests/legacy_addresses_spec.js.coffee',
      // 'tests/my_wallet_spec.js.coffee',
      // 'tests/spend_spec.js.coffee',
      // 'tests/tags_spec.js.coffee',
      // 'tests/transaction_spec.js.coffee',
      // 'tests/wallet_spec.js.coffee'
    ],
    
    coverageReporter: {
      type : 'html',
      dir : 'coverage/',
      subdir: '.'
    },
    
    reporters: ['progress','coverage']
    
  });

};
