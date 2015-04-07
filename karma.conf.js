module.exports = function(config) {

  config.set({
    basePath : './',
    
    browserNoActivityTimeout: 60000,
    
    frameworks: ['jasmine'],
    
    browsers : ['PhantomJS'],
    
    reportSlowerThan: 50,
    
    client: {
      captureConsole: true,
    },
    
    preprocessors: {
      '**/*.coffee': ['coffee'],
      'build/wallet-store.js' : ['coverage'],
      'build/wallet-crypto.js' : ['coverage'],
      'src/wallet.js' : ['coverage'],
      'src/hd-wallet.js' : ['coverage'],
      'src/hd-account.js' : ['coverage'],
      'src/blockchain-api.js' : ['coverage'],
      'src/blockchain-settings-api.js' : ['coverage'],
      'src/import-export.js' : ['coverage'],
      'src/transaction.js' : ['coverage'],
      'src/signer.js' : ['coverage'],
      'src/wallet-signup.js' : ['coverage']
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
      'bower_components/es5-shim/es5-shim.min.js',
      'bower_components/es6-shim/es6-shim.min.js',
      'bower_components/jquery/dist/jquery.js',
      'bower_components/cryptojslib/rollups/sha256.js',
      'bower_components/cryptojslib/rollups/aes.js',
      'bower_components/cryptojslib/rollups/pbkdf2.js',
      'bower_components/cryptojslib/components/cipher-core.js',
      'bower_components/cryptojslib/components/pad-iso10126.js',
      'bower_components/cryptojslib/components/mode-ecb.js',
      'bower_components/cryptojslib/components/pad-nopadding.js',
      'node_modules/sjcl/sjcl.js',
      'node_modules/xregexp/xregexp-all.js',
      'build/browserify.js',
      'src/blockchain-api.js',
      'src/hd-wallet.js',
      'src/hd-account.js',
      'src/wallet-signup.js',
      'src/crypto-util-legacy.js',
      'build/wallet-store.js',
      'build/wallet-crypto.js',
      'src/wallet.js',
      'src/signer.js',
      'tests/**/*.js',
      'tests/**/*.js.coffee',
      // Or specify individual test files:
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
    
    plugins : [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-coffee-preprocessor',
      'karma-coverage'
    ],
    
    coverageReporter: {
      type : 'html',
      dir : 'coverage/',
      subdir: '.'
    },
    
    reporters: ['progress','coverage']
    
  });

};
