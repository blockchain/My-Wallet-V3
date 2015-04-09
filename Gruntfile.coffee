module.exports = (grunt) ->
  
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    clean: 
      build: ["build"]
      dist: ["dist"]
      test: ["coverage"]
      shrinkwrap: 
        src: ["npm-shrinkwrap.json"]

    concat:
      options:
        separator: ";"
        
      bower_dev:
        src: [
          'bower_components/cryptojslib/rollups/sha256.js'
          'bower_components/cryptojslib/rollups/aes.js'
          'bower_components/cryptojslib/rollups/pbkdf2.js'
          'bower_components/cryptojslib/components/cipher-core.js'
          'bower_components/cryptojslib/components/pad-iso10126.js'
          'bower_components/cryptojslib/components/mode-ecb.js'
          'bower_components/cryptojslib/components/pad-nopadding.js'
        ]
        dest: "build/bower_components.js"
        
      bower_dist:
        src: [
          'build/bower_components/cryptojslib/rollups/sha256.js'
          'build/bower_components/cryptojslib/rollups/aes.js'
          'build/bower_components/cryptojslib/rollups/pbkdf2.js'
          'build/bower_components/cryptojslib/components/cipher-core.js'
          'build/bower_components/cryptojslib/components/pad-iso10126.js'
          'build/bower_components/cryptojslib/components/mode-ecb.js'
          'build/bower_components/cryptojslib/components/pad-nopadding.js'
        ]
        dest: "build/bower_components.js"
        
      mywallet:
        src: [
          'bower_components/jquery/dist/jquery.js'
          'bower_components/browserdetection/src/browser-detection.js'
          'src/shared.js'
          'src/ie.js'
          'src/crypto-util-legacy.js'
          'build/browserify.js'
          'build/blockchain-api.processed.js'
          'build/blockchain-settings-api.processed.js'
          'build/wallet-store.processed.js'
          'build/wallet-crypto.processed.js'
          'build/wallet.processed.js'
          'build/wallet-signup.processed.js'
          'build/hd-wallet.processed.js'
          'node_modules/sjcl/sjcl.js'
          'node_modules/xregexp/xregexp-all.js'
          'build/bower_components.js'
        ]
        dest: "dist/my-wallet.js"
 
    # coffee:
    #  compile:
    #    files:
    #      'build/wallet-store.js' : 'src/coffee/wallet-store.coffee'
    #      'build/wallet-crypto.js': 'src/coffee/wallet-crypto.coffee'

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
        browserifyOptions: { standalone: "Browserify" }

      build:
        src: ['src/browserify-imports.js']
        dest: 'build/browserify.js'

      production:
        options:
          debug: false
        src: '<%= browserify.build.src %>'
        dest: 'build/browserify.js'

    karma:
      unit:
        configFile: 'karma.conf.js'
        singleRun: false
        
      continuous: # continuous integration mode: run tests once (what's in a name...)
        configFile: 'karma.conf.js'
        singleRun: true

      test:
        configFile: 'karma.conf.js'
        singleRun: false

    # TODO should auto-run and work on all files
    jshint:
      files: [
        #'src/blockchain-api.js'
        'src/blockchain-settings-api.js'
        'src/browserify-imports.js'
        #'src/crypto-util-legacy.js'
        'src/hd-account.js'
        'src/hd-wallet.js'
        'src/ie.js'
        'src/import-export.js'
        #'src/shared.js'
        #'src/sharedcoin.js'
        'src/transaction.js'
        'src/wallet-signup.js'
        #'src/wallet.js'
      ]
      options:
        globals: 
          jQuery: true

    watch:
      scripts:
        files: [
          'src/ie.js'
          'src/shared.js'
          'src/blockchain-api.js'
          'src/blockchain-settings-api.js'
          'src/transaction.js'
          'src/wallet.js'
          'src/wallet-signup.js'
          'src/hd-wallet.js'
          'src/hd-account.js'
          'src/import-export.js'
          'src/wallet-store.js'
          'src/wallet-crypto.js'
          # 'src/coffee/*.coffee'
        ]
        tasks: ['build','karma:continuous']

      karma:
        files: ['tests/**/*.js.coffee', 'tests/**/*.js']
        tasks: ['karma:continuous']
        
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
      multifile:
        files: 
          'build/blockchain-api.processed.js'  : 'src/blockchain-api.js'
          'build/blockchain-settings-api.processed.js'  : 'src/blockchain-settings-api.js'
          'build/wallet-store.processed.js'   : 'src/wallet-store.js'
          'build/wallet-crypto.processed.js'  : 'src/wallet-crypto.js'
          'build/wallet.processed.js'         : 'src/wallet.js'
          'build/wallet-signup.processed.js'  : 'src/wallet-signup.js'
          'build/hd-wallet.processed.js'      : 'src/hd-wallet.js'

  
  # Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  # grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks 'grunt-env'
  grunt.loadNpmTasks 'grunt-karma'
  grunt.loadNpmTasks 'grunt-preprocess'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-shrinkwrap'
  grunt.loadNpmTasks 'grunt-contrib-jshint'

  grunt.registerTask "default", [
    "build"
    "karma:continuous"
    "watch"
  ]
  
  grunt.registerTask "build", [
    # "coffee:compile"
    "env:build"
    "preprocess"
    "browserify:build"
    "concat:bower_dev"
    "concat:mywallet"
  ]
    
  # GITHUB_USER=... GITHUB_PASSWORD=... grunt dist
  grunt.registerTask "dist", [
    "env:production"
    "clean:build"
    "clean:dist"
    # "coffee:compile"
    "shrinkwrap"
    "shell:check_dependencies"
    "clean:shrinkwrap"
    "shell:npm_install_dependencies"
    "shell:bower_install_dependencies"
    "preprocess"
    "browserify:production"
    "concat:bower_dist"
    "concat:mywallet"
    "uglify:mywallet"
  ]
  
  # Skip dependency check, e.g. for staging:
  grunt.registerTask "dist_unsafe", [
    "env:production"
    "clean:build"
    "clean:dist"
    # "coffee:compile"
    "shell:skip_check_dependencies"
    "preprocess"
    "browserify:production"
    "concat:bower_dist"
    "concat:mywallet"
    "uglify:mywallet"
  ]
  
  return
