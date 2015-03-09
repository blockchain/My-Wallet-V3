module.exports = (grunt) ->
  
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    clean: {
      build: ["build"]
      dist: ["dist"]
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
      pending: 
        command: () -> 
           '...'

      
  
  # Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks('grunt-contrib-concat')
  # grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-shell')
        
  grunt.registerTask "default", [
    "watch"
  ]
  
  # The build task could do some things that are currently in npm postinstall
  grunt.registerTask "build", [
    # "clean" # Too aggresive
  ]
    
  grunt.registerTask "dist", [
    "clean:dist"
    "build"
    "concat:mywallet"
    "uglify:mywallet"
  ]
  
  return