const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const webpack = require('webpack');
const version = JSON.stringify(require('./package.json').version);

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
  devtool: 'inline-source-map',
  target: 'node',
  entry: {
    'initdb': './src/initdb.js',
    'index': './src/index.js'
  },
  output: {
    filename: './[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    library: 'Initdb', //ここがnewするときの名前になる
    libraryExport: 'default',
    libraryTarget: 'umd',
    path: dist
  },
  plugins: [
    new webpack.DefinePlugin({
        __VERSION__: version
    })
  ]
};