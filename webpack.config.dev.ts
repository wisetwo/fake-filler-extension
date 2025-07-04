import * as webpack from "webpack";
import { merge } from "webpack-merge";

import webpackConfig from "./webpack.config";

const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Dotenv = require("dotenv-webpack");

const developmentConfig: webpack.Configuration = {
  mode: "development",
  devtool: "inline-source-map",
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new webpack.SourceMapDevToolPlugin({
      exclude: /^vendor.*.\.js$/,
      filename: "[file].map",
    }),
    new Dotenv(),
  ],
};

export default merge(webpackConfig, developmentConfig);
