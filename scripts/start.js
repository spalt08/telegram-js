/* eslint-disable flowtype/require-valid-file-annotation, no-console, import/no-extraneous-dependencies */
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('../webpack.config');

const serverConfig = {
  contentBase: './public',
  publicPath: '/',
  stats: { colors: true },
  hot: true,
  historyApiFallback: true,
};

const port = 3000;

new WebpackDevServer(webpack(webpackConfig), serverConfig).listen(port, 'localhost', (error) => {
  if (error) {
    console.error(error);
  } else {
    console.log(`
        Listening at http://localhost:${port}/.
        Browser will be opened automaticly when webpack finish building.
      `);
  }
});
