const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const commonConfig = {
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
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
  output: {
    filename: 'keystore.umd.js',
    library: ['arcana', 'keystore'],
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  target: 'web',
};

const standaloneConfig = {
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  resolve: {
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist/standalone'),
  },
};

const moduleConfig = {
  resolve: {
    fallback: {
      assert: false,
      buffer: false,
      crypto: false,
      stream: false,
      util: false,
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
};

module.exports = [
  merge(commonConfig, standaloneConfig),
  // merge(commonConfig, moduleConfig),
];
