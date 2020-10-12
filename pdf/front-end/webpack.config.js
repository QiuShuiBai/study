const path = require('path');
const Webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    host: '0.0.0.0',
    contentBase: './dist',
  },
  plugins: [
    new Webpack.HotModuleReplacementPlugin(),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].[hash].css",
      chunkFilename: "[id].css",
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  module:{
    rules:[
      {
        test:/\.css$/,
        use:[ MiniCssExtractPlugin.loader, 'css-loader'] // 从右向左解析原则
      },
      {
        test:/\.styl$/,
        use:[ MiniCssExtractPlugin.loader, 'css-loader', 'stylus-loader'] // 从右向左解析原则
      }
    ]
  }
};
