const webpack = require('webpack');
const path = require('path');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const baseHref = "/app";

const dev = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: dev ? 'development' : 'production',
    devtool: 'source-map',
    entry: "./app/App.tsx",

    plugins: [
        // Simplifies creation of HTML files to serve your webpack bundles.
        // Useful for webpack bundles including a hash in the filename which changes every compilation.
        new HtmlWebpackPlugin({
            template: 'app/index.html',
            baseUrl: baseHref,
            hash: true,
            favicon: "app/Assets/Images/favicon.ico"
        }),
        new MiniCSSExtractPlugin(),
        new CopyWebpackPlugin({
            patterns: [{
                from: "Assets/AppVersion.txt",
                to: "Assets/AppVersion.txt",
                context: path.join(__dirname, "app")
            }],
            options: {}
        })
    ],

    resolve: {
        modules: [path.resolve(__dirname, "app"), "node_modules"],
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
        fallback: {
            path: require.resolve("path-browserify"),
            http: false
        }
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                "@babel/preset-env",
                                "@babel/preset-typescript",
                                "@babel/preset-react",
                                "@linaria"
                            ],
                            plugins: [
                                "@babel/plugin-proposal-class-properties",
                                ["@babel/plugin-transform-runtime",
                                {
                                    "regenerator": true
                                }]
                            ]
                        }
                    },
                    {
                        loader: '@linaria/webpack-loader',
                        options: {
                            sourceMap: dev,
                            babelOptions: {
                                presets: [
                                    "@babel/preset-typescript",
                                    "@babel/preset-react",
                                ]
                            }
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCSSExtractPlugin.loader,
                        options: {
                            // hmr: process.env.NODE_ENV !== 'production',
                        },
                    },
                    {
                        loader: 'css-loader',
                        options: {sourceMap: dev},
                    },
                ],
            },
            {
                test: /\.(jpg|png|gif|woff|woff2|eot|ttf|svg)$/,
                use: [{loader: 'file-loader'}],
            },
        ],
    }
};