module.exports = (grunt) ->

  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    clean:
      build: ["build"]
      dist: ["dist"]
      test: ["coverage"]
      testjs: ["tests/*js"]
      shrinkwrap:
        src: ["npm-shrinkwrap.json"]

    concat:
      options:
        separator: ";"

      bower:
        src: [
          'bower_components/jquery/dist/jquery.js'
          'bower_components/cryptojslib/rollups/sha256.js'
          'bower_components/cryptojslib/rollups/aes.js'
          'bower_components/cryptojslib/rollups/pbkdf2.js'
          'bower_components/cryptojslib/components/cipher-core.js'
          'bower_components/cryptojslib/components/pad-nopadding.js'
          'bower_components/cryptojslib/components/pad-iso10126.js'
          'bower_components/cryptojslib/components/pad-zeropadding.js'
          'bower_components/cryptojslib/components/pad-iso97971.js'
          'bower_components/cryptojslib/components/mode-ecb.js'
          'bower_components/cryptojslib/components/mode-ofb.js'
        ]
        dest: "build/bower_components.js"

      mywallet:
        src: [
          'build/bower_components.js'
          'build/shared.processed.js'
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
        src: ['src/index.js']
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
        'src/wallet-spender.js'
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

    shell:
      check_dependencies:
        command: () ->
           'mkdir -p build && ruby check-dependencies.rb'

      skip_check_dependencies:
        command: () ->
          'cp -r node_modules build && cp -r bower_components build'

      npm_install_dependencies:
        command: () ->
           'cd build && npm install'

      bower_install_dependencies:
        command: () ->
           'cd build && ../node_modules/bower/bin/bower install'

    shrinkwrap: {}

    env:
      build:
        DEBUG: "1"

      production:
        PRODUCTION: "1"

    preprocess:
      js:
        expand: true
        cwd: 'src/'
        src: '**/*.js'
        dest: 'build'
        ext: '.processed.js'


  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-env'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-preprocess'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-shrinkwrap'
  grunt.loadNpmTasks 'grunt-text-replace'


  grunt.registerTask "default", [
    "build"
    "watch"
  ]

  grunt.registerTask "build", [
    "env:build"
    "preprocess"
    "replace:bitcoinjs"
    "browserify:build"
    "concat:bower"
    "concat:mywallet"
  ]

  # GITHUB_USER=... GITHUB_PASSWORD=... grunt dist
  grunt.registerTask "dist", [
    "env:production"
    "clean:build"
    "clean:dist"
    "shrinkwrap"
    "shell:check_dependencies"
    "clean:shrinkwrap"
    "shell:npm_install_dependencies"
    "shell:bower_install_dependencies"
    "preprocess"
    "replace:bitcoinjs"
    "browserify:production"
    "concat:bower"
    "concat:mywallet"
    "uglify:mywallet"
  ]

  # Skip dependency check, e.g. for staging:
  grunt.registerTask "dist_unsafe", [
    "env:production"
    "clean:build"
    "clean:dist"
    "shell:skip_check_dependencies"
    "preprocess"
    "replace:bitcoinjs"
    "browserify:production"
    "concat:bower"
    "concat:mywallet"
    "uglify:mywallet"
  ]

  return
