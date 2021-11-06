const path = require('path');
const webpack = require('webpack');
module.exports = {
  entry: {
    arcana_keystore: path.resolve(__dirname, 'src', 'index.ts'),
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(ts|js)?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json',
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  resolve: {
    // mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],
    // modules: ['node_modules'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
    },
  },
  output: {
    filename: 'arcana_keystore.js',
    library: '[name]',
    path: path.resolve(__dirname, 'dist_bundle'),
  },
};
