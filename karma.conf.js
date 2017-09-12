module.exports = function (config) {
  var configuration = {
    basePath: './',
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    browserNoActivityTimeout: 180000,
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
      'tests/**/*.js': ['browserify']
    },

    browserify: {
      configure (bundle) {
        bundle.once('prebundle', function () {
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

    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/jasmine-es6-promise-matchers/jasmine-es6-promise-matchers.js',
      'tests/**/*.spec.js'
    ]
  };

  config.set(configuration);
};
