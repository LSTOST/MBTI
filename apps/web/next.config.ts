import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // Bundle .md files as raw strings so content is embedded in the server
    // bundle — no runtime fs access, works in all deployment modes.
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
