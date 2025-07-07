import * as path from "path";

import { CleanWebpackPlugin } from "clean-webpack-plugin";
import Dotenv from "dotenv-webpack";
import TerserPlugin from "terser-webpack-plugin";
import * as webpack from "webpack";
import { merge } from "webpack-merge";

import baseConfig from "./webpack.config";

const config: webpack.Configuration = merge(baseConfig, {
  mode: "production",
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist")],
    }),
    new Dotenv({
      path: "./.env.production",
    }) as unknown as webpack.WebpackPluginInstance,
  ],
});

export default config;
