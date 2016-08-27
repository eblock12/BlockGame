let argv = require('yargs').argv;
let path = require('path');
let webpackUglifyJsPlugin = require('webpack-uglify-js-plugin');

let plugins = [];

if (argv.production) {
    plugins.push(new webpackUglifyJsPlugin({
        cacheFolder: path.resolve(__dirname, 'tmp/cached_uglify/'),
        debug: true,
        minimize: true,
        sourceMap: false,
        output: {
            comments: false
        }
    }));
}

module.exports = {
    context: path.join(__dirname, 'lib'),
    entry: './index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: plugins   
}
