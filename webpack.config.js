const path = require('path');
let webpack = require('webpack');
let StringReplacePlugin = require('string-replace-webpack-plugin');

let config = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'my-wallet.js',
    library: 'Blockchain',
    libraryTarget: 'var'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              ["transform-object-rest-spread", { "useBuiltIns": true }]
            ],
            presets: [
              ['es2015', { modules: false }]
            ]
          }
        }
    },
    {
      test: /hdnode\.js$/,
      loader: StringReplacePlugin.replace({
        replacements: [
        {
          pattern: /curve\.validate\(Q\)/g,
          replacement: function (match, p1, offset, string) {
                // comment out value validation in fromBuffer to speed up node
                // creation from cached xpub/xpriv values
                return '// curve.validate(Q)';
              }
            }
            ]})
    },
    {
      test: /node_modules\/bip39\/index\.js$/,
      loader: StringReplacePlugin.replace({
        replacements: [
        {
          pattern: /validateMnemonic\: validateMnemonic/g,
          replacement: function (match, p1, offset, string) {
                // Expose salt function to be used by iOS app.
                return 'validateMnemonic: validateMnemonic,\n  salt: salt';
              }
            }
            ]})
    }
    ]
  },
  node: {
    fs: 'empty'
  },
  plugins: [
  new StringReplacePlugin(),
  new webpack.EnvironmentPlugin({
    NODE_ENV: 'prod'
  })
  ]
};

if (process.env.NODE_ENV === 'prod') {
  let uglifyPlugin = new webpack.optimize.UglifyJsPlugin({
    mangle: false,
    compress: false,
    comments: false
  });

  config.output.filename = 'my-wallet.min.js';
  config.plugins.push(uglifyPlugin);
}

module.exports = config;
