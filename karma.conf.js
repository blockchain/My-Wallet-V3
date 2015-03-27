module.exports = function(config) {

  config.set({
    basePath : './',
    
    frameworks: ['jasmine'],
    
    browsers : ['Chrome'],
    
    preprocessors: {
      '**/*.coffee': ['coffee'],
      'src/wallet-store.js' : ['coverage'],
      'src/wallet.js' : ['coverage'],
      'src/hd-wallet.js' : ['coverage'],
      'src/hd-account.js' : ['coverage'],
      'src/blockchain-api.js' : ['coverage'],
      'src/blockchain-settings-api.js' : ['coverage'],
      'src/import-export.js' : ['coverage'],
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
      'bower_components/jquery/dist/jquery.js',
      'bower_components/cryptojslib/rollups/sha256.js',
      'bower_components/cryptojslib/rollups/aes.js',
      'bower_components/cryptojslib/rollups/pbkdf2.js',
      'bower_components/cryptojslib/components/cipher-core.js',
      'bower_components/cryptojslib/components/pad-iso10126.js',
      'bower_components/cryptojslib/components/mode-ecb.js',
      'bower_components/cryptojslib/components/pad-nopadding.js',
      'bower_components/browserdetection/src/browser-detection.js',
      'build/browserify.js',
      'build/bip39.js',
      'build/sjcl.js',
      'build/xregexp-all.js',
      'src/hd-wallet.js',
      'src/hd-account.js',
      'src/wallet-signup.js',
      'src/crypto-util-legacy.js',
      'src/wallet-store.js',
      'src/wallet.js',
      'src/import-export.js',
      'src/signer.js',
      'tests/**/*.js',
      'tests/**/*.js.coffee'
    ],
    
    plugins : [
      'karma-chrome-launcher',
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
