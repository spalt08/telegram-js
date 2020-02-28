/* eslint-disable no-param-reassign, import/no-extraneous-dependencies */
const webpackConfig = require('../webpack.config.js')(undefined, {});

module.exports = async ({ config }) => {
  config.module.rules = [
    ...config.module.rules,
    ...webpackConfig.module.rules,
  ];

  config.resolve = webpackConfig.resolve;

  return config;
};
