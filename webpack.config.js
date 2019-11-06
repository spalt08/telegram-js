const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const autoprefixer = require('autoprefixer');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const sourceDirectory = 'src';
const destinationDirectory = 'dist';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = (env, argv) => {
  const { analyze } = argv;

  return {
    entry: `./${sourceDirectory}/index`,

    mode: isProduction ? 'production' : 'development',

    resolve: {
      modules: [sourceDirectory, 'node_modules'],
      extensions: ['.js', '.ts', '.json'],
    },

    devtool: isProduction ? undefined : 'inline-source-map',

    module: {
      rules: [
        {
          test: /\.tsx?$/,
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
                hmr: !isProduction,
              },
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProduction,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [autoprefixer],
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
          test: /\.(svg|png|jpe?g|gif|woff|woff2|otf|ttf|eot)$/,
          loader: 'file-loader',
        },
      ],
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          // sourceMap: true, // For source maps in production (may be required depending on the contest rules)
          terserOptions: {
            output: {
              comments: false,
            },
          },
        }),
        new OptimizeCSSAssetsPlugin({}),
      ],
    },

    output: {
      path: path.resolve(__dirname, destinationDirectory),
      filename: '[name].[hash].js',
      publicPath: './',
    },

    devServer: {
      contentBase: `./${destinationDirectory}`,
      port: 3000,
      hot: true,
    },

    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({ template: 'template.ejs' }),
      new FaviconsWebpackPlugin({
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
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[hash].css',
        chunkFilename: '[id].[hash].css',
      }),
      new ForkTsCheckerWebpackPlugin({
        compilerOptions: {
          sourceMap: !isProduction,
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
