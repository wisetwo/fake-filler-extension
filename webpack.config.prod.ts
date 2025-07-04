import * as path from "path";

import * as webpack from "webpack";
import { merge } from "webpack-merge";

import webpackConfig from "./webpack.config";

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Dotenv = require("dotenv-webpack");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TerserPlugin = require("terser-webpack-plugin");

const productionConfig: webpack.Configuration = {
  mode: "production",
  devtool: false,
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist")],
    }),
    new Dotenv({
      path: "./.env.production",
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          output: {
            ascii_only: true,
          },
        },
      }),
    ],
  },
};

export default merge(webpackConfig, productionConfig);
