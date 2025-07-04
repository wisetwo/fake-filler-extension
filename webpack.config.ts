import * as path from "path";

import * as webpack from "webpack";

const autoprefixer = require("autoprefixer");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const cssnano = require("cssnano");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sass = require("sass");

const webpackConfig: webpack.Configuration = {
  cache: false,
  entry: {
    service_worker: [
      path.join(__dirname, "src/background/regeneratorRuntime.js"),
      path.join(__dirname, "src/service_worker/index.ts"),
    ],
    "build/content-script": path.join(__dirname, "src/content_script/index.ts"),
    "build/options": path.join(__dirname, "src/options/index.tsx"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
              postcssOptions: {
                plugins: [autoprefixer(), cssnano()],
              },
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              implementation: sass,
              sassOptions: {
                silenceDeprecations: [
                  "global-builtin",
                  "import",
                  "legacy-js-api",
                  "color-functions",
                  "abs-percent",
                  "mixed-decls",
                  "slash-div"
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/,
        loader: "file-loader",
        options: {
          name: "[hash].[ext]",
          outputPath: "media/",
          publicPath: "build/media/",
        },
      },
    ],
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "dist"),
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "**/*",
          context: path.resolve(__dirname, "public"),
          to: path.resolve(__dirname, "dist"),
        },
      ],
    }),
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      src: path.resolve(__dirname, "src"),
    },
  },
  stats: "minimal",
};

export default webpackConfig;
