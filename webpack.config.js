const path = require('path')
const src = __dirname + "/src"
const dist = __dirname + "/dist"
const webpack = require('webpack')
const CopyFilePlugin = require('copy-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'source-map',
  target: 'node',
  context: src,
  entry: {
    'initdb': './initdb.js',
    'index': './index.js'
  },
  output: {
    globalObject: 'this',
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    library: 'Initdb', //ここがnewするときの名前になる
    libraryExport: 'default',
    libraryTarget: 'umd',
    path: dist
  },
  module: {
    rules: [{
      test: /\.dat$/,
      use: ['raw-loader']
    }, {
      test: /\.wasm$/,
      use: ['raw-loader']
    }]
  },
  plugins: [
    new CopyFilePlugin({
      patterns: [
        { from: '../node_modules/sql.js/dist/sql-wasm.wasm', to: dist },
        { from: '../node_modules/sql.js/dist/sql-wasm-debug.wasm', to: dist }
      ]
    }),
    new WriteFilePlugin()
  ]
}