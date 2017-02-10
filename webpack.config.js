
let StringReplacePlugin = require('string-replace-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    path: 'dist',
    filename: 'my-wallet.js',
    library: 'Blockchain',
    libraryTarget: 'window'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          presets: ['es2015']
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
                return '    // curve.validate(Q)';
              }
            }
          ]})
      }
    ]
  },
  plugins: [
    new StringReplacePlugin()
  ]
};
