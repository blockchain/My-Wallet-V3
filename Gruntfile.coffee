module.exports = (grunt) ->
  
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    clean: {
      build: ["build"]
      dist: ["dist"]
      shrinkwrap: 
        src: ["npm-shrinkwrap.json"]
    }

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
          'bower_components/cryptojslib/rollups/sha256.js'
          'bower_components/cryptojslib/rollups/aes.js'
          'bower_components/cryptojslib/rollups/pbkdf2.js'
          'bower_components/cryptojslib/components/cipher-core.js'
          'bower_components/cryptojslib/components/pad-iso10126.js'
          'bower_components/cryptojslib/components/mode-ecb.js'
          'bower_components/cryptojslib/components/pad-nopadding.js'
          'node_modules/sjcl/sjcl.js'
          'crypto-util-legacy.js'
          'blockchainapi.js'
          'signer.js'
          'wallet.js'
          'wallet-signup.js'
          'HDWalletAccount.js'
          'hdwallet.js'
          'mnemonic.js'
          'import-export.js'
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
    },
        
    shell: 
      check_dependencies: 
        command: () -> 
           'mkdir -p build && ruby check-dependencies.rb'
        
      npm_install_dependencies:
        command: () ->
           'cd build && npm install --no-optional'
           
    shrinkwrap: {}

      
  
  # Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks('grunt-contrib-concat')
  # grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-shrinkwrap')
        
  grunt.registerTask "default", [
    "watch"
  ]
  
  # The build task could do some things that are currently in npm postinstall
  grunt.registerTask "build", [
    # "clean" # Too aggresive
    "concat:mywallet"
  ]
    
  # GITHUB_USER=... GITHUB_PASSWORD=... grunt dist
  grunt.registerTask "dist", [
    "clean:build" # We re-run 'npm install' after the whitelist process
    "clean:dist"
    "shrinkwrap"
    "shell:check_dependencies"
    "clean:shrinkwrap"
    "shell:npm_install_dependencies"
    "concat:mywallet"
    "uglify:mywallet"
  ]
  
  return