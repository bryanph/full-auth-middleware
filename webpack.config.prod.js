var path = require('path');
var webpack = require('webpack')

module.exports = {
    devtool: 'source-map',
    entry: {
        // account: './client/pages/account/index',
        admin: './client/pages/admin/index',
        // contact: './client/pages/contact/index',
        // login: './client/pages/login/index',
        // signup: './client/pages/signup/index'
    },
    output: {
        filename: '[name].bundle.js',
        chunkFilename: '[id].bundle.js',
        path: path.join(__dirname, 'public'),
        publicPath: '/static/'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'core',
            filename: 'core.min.js',
            minSize: 2
        }),
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': `"${process.env.NODE_ENV}"`
            },
        }),
        new webpack.optimize.UglifyJsPlugin(),
        new webpack.optimize.AggressiveMergingPlugin()
    ],
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /(node_modules|bower_components)/,
                include: path.join(__dirname, 'client')
            },
            {
                test: /\.less$/,
                use: [{
                    loader: "style-loader" // creates style nodes from JS strings
                }, {
                    loader: "css-loader" // translates CSS into CommonJS
                }, {
                    loader: "less-loader" // compiles Less to CSS
                }]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader?name=public/fonts/[name].[ext]'
            }
            // { test: /\.coffee/, loaders: ['coffee-loader'] },
            // { test: /\.json/, loaders: ['json'] },
            // { test: /\.s?css$/, loaders: ['style', 'css', 'sass'] },
            // { test: /\.png$/, loader: "url-loader?limit=100000" },
            // { test: /\.jpg$/, loader: "file-loader?name=[path][name]" },
            // { test: /\.svg/, loader: "file-loader" }
        ]
    },
}
