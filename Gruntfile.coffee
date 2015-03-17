module.exports = (grunt) ->
  
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    clean: 
      build: ["build"]
      dist: ["dist"]
      shrinkwrap: 
        src: ["npm-shrinkwrap.json"]

    concat:
      options:
        separator: ";"
        
      mywallet:
        src: [
          'bower_components/jquery/dist/jquery.js'
          'bower_components/browserdetection/src/browser-detection.js'
          'ie.js'
          'build/browserify.js'
          "shared.js"
          'build/bower_components/cryptojslib/rollups/sha256.js'
          'build/bower_components/cryptojslib/rollups/aes.js'
          'build/bower_components/cryptojslib/rollups/pbkdf2.js'
          'build/bower_components/cryptojslib/components/cipher-core.js'
          'build/bower_components/cryptojslib/components/pad-iso10126.js'
          'build/bower_components/cryptojslib/components/mode-ecb.js'
          'build/bower_components/cryptojslib/components/pad-nopadding.js'
          'build/sjcl.js'
          'crypto-util-legacy.js'
          'build/blockchainapi.processed.js'
          'build/signer.processed.js'
          'build/wallet.processed.js'
          'build/wallet-signup.processed.js'
          'build/HDWalletAccount.processed.js'
          'build/hdwallet.processed.js'
          'mnemonic.js'
          'build/import-export.processed.js'
          'build/bip39.js'
          'build/xregexp-all.js'
        ]
        dest: "dist/my-wallet.js"
        
    uglify:
      options:
        banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
        mangle: false
        
      mywallet:
        src:  "dist/my-wallet.js"
        dest: "dist/my-wallet.min.js"
        
    watch: {
      scripts: {
        files: [
          'ie.js'
          'shared.js'
          'blockchainapi.js'
          'signer.js'
          'wallet.js'
          'wallet-signup.js'
          'HDWalletAccount.js'
          'hdwallet.js'
          'mnemonic.js'
          'import-export.js'
        ],
        tasks: ['build'],
      },
    }
        
    shell: 
      check_dependencies: 
        command: () -> 
           'mkdir -p build && ruby check-dependencies.rb'
        
      npm_install_dependencies:
        command: () ->
           'cd build && npm install'
           
      bower_install_dependencies:
        command: () ->
           'cd build && bower install'
           
    shrinkwrap: {}
    
    env: 
      build: 
        DEBUG: "1"
        
      production:
        PRODUCTION: "1"

    preprocess:     
      multifile:
        files: 
          'build/blockchainapi.processed.js'  : 'blockchainapi.js'
          'build/signer.processed.js'         : 'signer.js'
          'build/wallet.processed.js'         : 'wallet.js'
          'build/wallet-signup.processed.js'  : 'wallet-signup.js'
          'build/HDWalletAccount.processed.js': 'HDWalletAccount.js'
          'build/hdwallet.processed.js'       : 'hdwallet.js'
          'build/import-export.processed.js'  : 'import-export.js'
  
  # Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks('grunt-contrib-concat')
  # grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-shrinkwrap')
  grunt.loadNpmTasks('grunt-preprocess')
  grunt.loadNpmTasks('grunt-env');
        
  grunt.registerTask "default", [
    "watch"
  ]
  
  # The build task could do some things that are currently in npm postinstall
  grunt.registerTask "build", [
    "env:build"
    # "clean" # Too aggresive
    "preprocess"
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
    "concat:mywallet"
    "uglify:mywallet"
  ]
  
  return