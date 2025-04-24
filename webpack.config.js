const path = require('path');
const src = path.resolve(__dirname, 'src');
const dist = path.resolve(__dirname, 'dist');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
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
  optimization: {
    splitChunks: false
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: version,
      'process.env.ONNX_WASM_PATH': JSON.stringify('./'),
      'process.env.ORT_WASM_PATH': JSON.stringify('./')
    }),
    new CopyPlugin({
      patterns: [
        // onnxruntime-web wasm files
        { from: path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm'), to: 'ort-wasm-simd-threaded.wasm', noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm'), to: 'ort-wasm-simd-threaded.jsep.wasm', noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm'), to: 'ort-wasm.wasm', noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm'), to: 'ort-wasm-simd.wasm', noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/*.wasm'), to: '[name][ext]', noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'node_modules/@xenova/transformers/dist/*.wasm'), to: '[name][ext]', noErrorOnMissing: true },
        // sqlite3 wasm for pkg executable
        { from: path.resolve(__dirname, 'node_modules/sqlite-vec-wasm-demo/sqlite3.wasm'), to: 'sqlite3.wasm', noErrorOnMissing: false }
      ]
    })
  ],
  externals: [
    // include transformers, onnxruntime-web, sqlite-vec-wasm-demo, and stub sharp
    nodeExternals({
      allowlist: [
        /@xenova\/transformers/,
        /onnxruntime-web/,
        /sqlite-vec-wasm-demo/,
        /sharp/
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.mjs', '.cjs'],
    alias: { 
      'sharp$': false, 
      'onnxruntime-node$': false,
      'sqlite-vec-wasm-demo$': path.resolve(__dirname, 'node_modules/sqlite-vec-wasm-demo/sqlite3.mjs')
    },
  },
  module: {
    rules: [
      // Handle WebAssembly modules
      { test: /\.wasm$/, type: 'asset/resource' },
      // sqlite3 WASM adjustments
      { test: /sqlite3\.wasm$/, type: 'asset/inline' },
      { test: /sqlite3\.mjs$/, type: 'javascript/auto', use: [
          { loader: 'string-replace-loader', options: { search: /assert\(!ENVIRONMENT_IS_NODE[\s\S]*?\);/g, replace: '' } },
          { loader: 'string-replace-loader', options: { search: /assert\(!ENVIRONMENT_IS_SHELL[\s\S]*?\);/g, replace: '' } }
        ]
      }
    ]
  }
}