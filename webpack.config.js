/* eslint-disable import/no-extraneous-dependencies */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CssoWebpackPlugin = require('csso-webpack-plugin').default;
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const sourceDirectory = 'src';
const destinationDirectory = 'dist';

module.exports = (env, argv) => {
  const { analyze, mode = 'development' } = argv;
  const isProduction = mode === 'production';

  return {
    entry: `./${sourceDirectory}/index`,

    mode,

    resolve: {
      modules: [sourceDirectory, 'node_modules'],
      extensions: ['.js', '.ts'],
    },

    devtool: isProduction ? undefined : 'inline-source-map',

    module: {
      rules: [
        {
          test: /worker\.[^.]+$/,
          use: {
            loader: 'worker-loader',
            options: {
              inline: false,
              name: 'worker.[hash].js',
            },
          },
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        {
          test: /\.s?css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                reloadAll: true,
              },
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProduction,
                importLoaders: 1,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !isProduction && 'inline',
              },
            },
          ],
        },
        {
          test: /\.scss$/,
          use: ['sass-loader'],
        },
        {
          oneOf: [
            {
              resourceQuery: /(^|\?|&)raw($|&)/i,
              loader: 'raw-loader',
            },
            {
              test: /\.(svg|png|jpe?g|gif|woff|woff2|otf|ttf|eot|tgs)$/,
              loader: 'file-loader',
              options: {
                name: 'assets/[contenthash].[ext]',
              },
            },
            {
              resourceQuery: /(^|\?|&)file($|&)/i,
              loader: 'file-loader',
              type: 'javascript/auto', // https://github.com/webpack-contrib/file-loader/issues/259#issuecomment-541492227
              options: {
                name: 'assets/[contenthash].[ext]',
              },
            },
          ],
        },
        {
          test: /\.svg$/,
          loader: 'svgo-loader',
          options: {
            plugins: [
              { removeViewBox: false },
              { convertShapeToPath: false },
              { cleanupIDs: false },
            ],
          },
        },
      ],
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          // sourceMap: true, // For source maps in production (may be required depending on the contest rules)
          extractComments: false,
          terserOptions: {
            output: {
              comments: false,
            },
          },
        }),
      ],
    },

    output: {
      path: path.resolve(__dirname, destinationDirectory),
      filename: '[name].[hash].js',
      chunkFilename: '[name].[hash].js',
      publicPath: './',
    },

    devServer: {
      contentBase: `./${destinationDirectory}`,
      port: 3000,
      host: '0.0.0.0',
      publicPath: '/',
    },

    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({ template: 'src/index.ejs' }),
      new FaviconsWebpackPlugin({
        logo: path.join(__dirname, './src/assets/favicon.svg'), // image from which favicons will be generated
        // type of favicons to generate, WARNING: dramaticly decreases build speed, use wisely
        prefix: 'assets/favicons',
        favicons: {
          background: '#ffffff',
          icons: {
            android: true,
            appleIcon: { offset: 5 },
            appleStartup: { offset: 15 },
            coast: false,
            favicons: true,
            firefox: false,
            opengraph: false,
            twitter: false,
            yandex: false,
            windows: false,
          },
        },
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[hash].css',
        chunkFilename: '[id].[hash].css',
      }),
      new CssoWebpackPlugin(),
      new ForkTsCheckerWebpackPlugin({
        eslint: true,
        compilerOptions: {
          async: !isProduction,
        },
      }),
      ...(analyze ? [
        new BundleAnalyzerPlugin({
          analyzerPort: 3001,
        }),
      ] : []),
    ],
  };
};
