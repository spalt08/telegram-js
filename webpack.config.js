const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');


const production = process.env.NODE_ENV === 'production';

const favicons = {
  logo: path.join(__dirname, './favicon.png'), // image from which favicons will be generated
  background: '#ffffff', // theme color for mobile browsers
  // type of favicons to generate, WARNING: dramaticly decreases build speed, use wisely
  icons: {
    android: false,
    appleIcon: false,
    appleStartup: false,
    coast: false,
    favicons: true,
    firefox: false,
    opengraph: false,
    twitter: false,
    yandex: false,
    windows: false,
  },
};

module.exports = {
  mode: production ? 'production' : 'development',

  entry: './src/index',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: './',
  },

  optimization: {
    minimize: true,
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test:/\.(s*)css$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(svg|png|jpg|gif|woff|woff2|otf|ttf|eot)$/,
        loader: 'file-loader',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({ template: 'template.ejs' }),
    new FaviconsWebpackPlugin(favicons),
  ],

  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules',
    ],
    extensions: ['.js'],
  },
};
