module.exports = function(config) {
  config.set({
    basePath : './',
    
    frameworks: ['jasmine'],
    
    browsers : ['Chrome'], // ['PhantomJS']
    
    preprocessors: {
      '**/*.coffee': ['coffee']
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
      'bitcoinjs.js',
      'bip39.js',
      'hdwallet.js',
      'HDWalletAccount.js',
      'bower_components/cryptojslib/rollups/sha256.js',
      'bower_components/cryptojslib/rollups/aes.js',
      'bower_components/cryptojslib/rollups/pbkdf2.js',
      'bower_components/cryptojslib/components/cipher-core.js',
      'bower_components/cryptojslib/components/pad-iso10126.js',
      'crypto-util-legacy.js',
      'wallet.js',
      'tests/**/*.js',
      'tests/**/*.js.coffee'
    ],
    
    plugins : [
            'karma-chrome-launcher',
            'karma-phantomjs-launcher',
            'karma-jasmine',
            'karma-coffee-preprocessor'
            ]
    
  });
};
