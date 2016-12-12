const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const PATHS = {
    static_folder: path.join(__dirname, '../static/js'),
    build: path.join(__dirname, 'build'),
    app: path.join(__dirname, 'app')
};

module.exports = {
    // Entry accepts a path or an object of entries.
    // We'll be using the latter form given it's
    // convenient with more complex configurations.
    entry: [
        PATHS.app + '/index.js',
        PATHS.static_folder + '/hxthreads.js',
        PATHS.static_folder + '/utilities.js',
        PATHS.static_folder + '/accessibility.js',
        PATHS.static_folder + '/logic.js',
        PATHS.static_folder + '/views.js',
        PATHS.static_folder + '/ba-tiny-pubsub.min.js'
    ],
    output: {
        path: PATHS.build,
        filename: 'threads_lite.js'
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style', 'css')
            },
            {
                test: /\.(eot|gif|svg|png|jpg|ttf|woff(2)?)(\?v=\d+\.\d+\.\d+)?/,
                loader: 'url'
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('threads_lite.css'),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        }),
    ]
};
