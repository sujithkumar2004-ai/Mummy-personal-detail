import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubActions ? "/Mummy-personal-detail" : "",
  assetPrefix: isGithubActions ? "/Mummy-personal-detail/" : "",
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
