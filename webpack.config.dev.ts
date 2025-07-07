import Dotenv from "dotenv-webpack";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as webpack from "webpack";
import { merge } from "webpack-merge";

import baseConfig from "./webpack.config";

const config: webpack.Configuration = merge(baseConfig, {
  mode: "development",
  devtool: "source-map",
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new Dotenv({
      path: "./.env.development",
    }) as unknown as webpack.WebpackPluginInstance,
  ],
});

export default config;
