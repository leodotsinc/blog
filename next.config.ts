import type { NextConfig } from "next";
import { withContentlayer } from 'next-contentlayer2';

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default withContentlayer(nextConfig);
