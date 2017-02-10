
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
      }
    ]
  }
};
