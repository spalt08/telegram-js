/* eslint-disable no-param-reassign, import/no-extraneous-dependencies */
const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js')(undefined, {});

module.exports = async ({ config }) => {
  config.module.rules = [
    ...config.module.rules.slice(0, 4), // remove file loader at 4th position
    config.module.rules[5],
    ...webpackConfig.module.rules,
  ];

  config.resolve = webpackConfig.resolve;

  config.plugins.push(
    new webpack.DefinePlugin({
      _TESTS: 'true',
    }),
  );

  return config;
};
