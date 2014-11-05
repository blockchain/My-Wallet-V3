module.exports = function(config) {
  config.set({
    basePath : './',
    
    frameworks: ['jasmine'],
    
    browsers : ['PhantomJS'], // 'Chrome', 
    
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
      'jquery.js',
      'bitcoinjs.js',
      // 'old_bitcoinjs.js',
      // 'wallet.js',
      'bip39.js',
      'hdwallet.js',
      'tests/**/*.js',
      'tests/**/*.js.coffee'
    ],
    
    plugins : [
            // 'karma-chrome-launcher',
            'karma-phantomjs-launcher',
            'karma-jasmine',
            'karma-coffee-preprocessor'
            ]
    
  });
};