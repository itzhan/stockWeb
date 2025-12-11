import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avator-1319906908.cos.ap-shanghai.myqcloud.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
