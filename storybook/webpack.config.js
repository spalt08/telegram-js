/* eslint-disable no-param-reassign, import/no-extraneous-dependencies */
const path = require('path');
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpackConfig = require('../webpack.config.js')(undefined, {});

module.exports = async ({ config }) => {
  config.module.rules = [
    ...config.module.rules.slice(0, 4), // remove file loader at 4th position
    config.module.rules[5],
    ...webpackConfig.module.rules,
  ];

  config.node = { fs: 'empty' };

  config.resolve = webpackConfig.resolve;

  config.plugins.push(
    new ServiceWorkerWebpackPlugin({
      entry: path.join(__dirname, '../src/client/workers/service.mock.ts'),
      filename: 'sw.js',
      excludes: ['**/*'],
    }),
  );

  config.plugins.push(
    new CopyPlugin({
      patterns: [
        { from: path.join(__dirname, '../src/vendor/canvas-kit/canvaskit.wasm') },
      ],
    }));

  return config;
};
