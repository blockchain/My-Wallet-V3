module.exports = function (config) {
  var configuration = {
    basePath: './',
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    browserNoActivityTimeout: 180000,
    // reportSlowerThan: 50,
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
            ignore: [
              'src/ws-browser.js', // undefined is not an object (evaluating 'global.WebSocket')
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
      // 'tests/bch/**.spec.js',
      'tests/coin-selection.spec.js',
      'tests/coin.spec.js',
      // 'tests/keychain.spec.js',
      'tests/signer.spec.js',
      'tests/metadata.spec.js'
    ]
  };

  config.set(configuration);
};
