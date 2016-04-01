module.exports = (grunt) ->

  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    clean:
      build: ["build"]
      dist: ["dist"]
      test: ["coverage", "coverage-lcov"]
      testjs: ["tests/*js"]

    coveralls:
      options:
        debug: true
        coverageDir: 'coverage-lcov'
        dryRun: false
        force: true
        recursive: true

    concat:
      options:
        separator: ";"

      mywallet:
        src: [
          'build/blockchain.js'
        ]
        dest: "dist/my-wallet.js"

    replace:
      # monkey patch deps
      bitcoinjs:
        # comment out value validation in fromBuffer to speed up node
        # creation from cached xpub/xpriv values
        src: ['node_modules/bitcoinjs-lib/src/hdnode.js'],
        overwrite: true,
        replacements: [{
          from: /\n    curve\.validate\(Q\)/g
          to:   '\n    // curve.validate(Q)'
        }]

    uglify:
      options:
        banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
        mangle: false

      mywallet:
        src:  "dist/my-wallet.js"
        dest: "dist/my-wallet.min.js"

    browserify:
      options:
        debug: true
        browserifyOptions: { standalone: "Blockchain" }

      build:
        src: ['index.js']
        dest: 'build/blockchain.js'

      production:
        options:
          debug: false
        src: '<%= browserify.build.src %>'
        dest: 'build/blockchain.js'

    # TODO should auto-run and work on all files
    jshint:
      files: [
        #'src/blockchain-api.js'
        'src/blockchain-settings-api.js'
        'src/hd-account.js'
        'src/hd-wallet.js'
        'src/import-export.js'
        #'src/shared.js'
        #'src/sharedcoin.js'
        'src/transaction.js'
        'src/wallet-signup.js'
        'src/payment.js'
        #'src/wallet.js'
      ]
      options:
        globals:
          jQuery: true

    watch:
      scripts:
        files: [
          'src/**/*.js'
        ]
        tasks: ['build']

    env:
      build:
        DEBUG: "1"
        PRODUCTION: "0"

      production:
        PRODUCTION: "1"

    preprocess:
      js:
        expand: true
        cwd: 'src/'
        src: '**/*.js'
        dest: 'build'
        ext: '.processed.js'

    semistandard:
      app:
        src:
          ['{,src/}*.js']

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-env'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-preprocess'
  grunt.loadNpmTasks 'grunt-text-replace'
  grunt.loadNpmTasks 'grunt-karma-coveralls'
  grunt.loadNpmTasks 'grunt-semistandard'

  grunt.registerTask "default", [
    "build"
    "watch"
  ]

  grunt.registerTask "build", [
    "env:build"
    "preprocess"
    "replace:bitcoinjs"
    "browserify:build"
    "concat:mywallet"
  ]

  # You must run grunt clean and grunt build first
  grunt.registerTask "dist", () =>
    grunt.task.run [
      "env:production"
      "preprocess"
      "replace:bitcoinjs"
      "browserify:production"
      "concat:mywallet"
      "uglify:mywallet"
    ]

  return
